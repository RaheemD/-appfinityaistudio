// Telegram Bot API helpers for the owner's private "control room" bot.
//
// Env vars (Netlify > Site configuration > Environment variables, scope: Functions):
//   TELEGRAM_BOT_TOKEN   token from @BotFather
//   TELEGRAM_CHAT_ID     the owner's chat id - the only chat the bot talks to
// Optional:
//   TELEGRAM_API_BASE    override the API host (local testing)
//
// Without the token everything here is a no-op, so the website works the same with or without a bot.

import { createHash, timingSafeEqual } from "node:crypto";

const TIMEOUT_MS = 6_000;
const MAX_MESSAGE_CHARS = 3_900; // Telegram's limit is 4096

const apiBase = () => (process.env.TELEGRAM_API_BASE || "https://api.telegram.org").replace(/\/+$/, "");

export const botToken = () => (process.env.TELEGRAM_BOT_TOKEN || "").trim();
export const ownerChatId = () => (process.env.TELEGRAM_CHAT_ID || "").trim();
export const telegramReady = () => !!botToken() && !!ownerChatId();

export const siteUrl = () => (process.env.URL || "https://appfinityaistudio.com").replace(/\/+$/, "");

export const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const truncate = (value: string, max: number) => (value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value);

// Telegram sends this back on every webhook call; derived from the token so no extra env var is needed.
export const webhookSecret = () => createHash("sha256").update(`appfinity-webhook:${botToken()}`).digest("hex");

export const isWebhookSecret = (candidate: string | null) => {
  if (!candidate || !botToken()) return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(webhookSecret());
  return a.length === b.length && timingSafeEqual(a, b);
};

type TelegramResult = { ok: boolean; description?: string; result?: unknown };

// Never throws: alerts must not break the feature that triggered them.
export const callTelegram = async (method: string, payload: Record<string, unknown>): Promise<TelegramResult> => {
  const token = botToken();
  if (!token) return { ok: false, description: "TELEGRAM_BOT_TOKEN is not configured" };
  try {
    const response = await fetch(`${apiBase()}/bot${token}/${method}`, {
      method: "POST",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => null)) as TelegramResult | null;
    if (!response.ok || !data?.ok) {
      console.error(`[telegram] ${method} failed: HTTP ${response.status} ${data?.description ?? ""}`);
      return { ok: false, description: data?.description ?? `HTTP ${response.status}` };
    }
    return data;
  } catch (error) {
    console.error(`[telegram] ${method} failed:`, error instanceof Error ? error.message : error);
    return { ok: false, description: "request failed" };
  }
};

// `html` uses Telegram's HTML subset (<b>, <i>, <code>, <a>); escape visitor text with escapeHtml().
export const sendMessage = (chatId: string | number, html: string) =>
  callTelegram(
    "sendMessage",
    html.length <= MAX_MESSAGE_CHARS
      ? { chat_id: chatId, text: html, parse_mode: "HTML", link_preview_options: { is_disabled: true } }
      : // Too long to cut safely inside HTML tags: send as plain text instead.
        { chat_id: chatId, text: truncate(html.replace(/<[^>]+>/g, ""), MAX_MESSAGE_CHARS), link_preview_options: { is_disabled: true } },
  );

export const sendToOwner = (html: string): Promise<TelegramResult> =>
  telegramReady() ? sendMessage(ownerChatId(), html) : Promise.resolve({ ok: false, description: "bot not configured" });

export const BOT_COMMANDS = [
  { command: "today", description: "Today's leads and activity" },
  { command: "leads", description: "Latest 10 leads" },
  { command: "cost", description: "AI spend (OpenRouter)" },
  { command: "status", description: "Check all sites now" },
  { command: "digest", description: "Yesterday's digest" },
  { command: "preview", description: "Preview a channel post (not published)" },
  { command: "post", description: "Write and publish a channel post now" },
  { command: "help", description: "What this bot does" },
];

// Points the bot at this site's webhook and sets its command menu. Safe to call repeatedly.
export const ensureWebhook = async () => {
  const webhook = await callTelegram("setWebhook", {
    url: `${siteUrl()}/api/telegram`,
    secret_token: webhookSecret(),
    allowed_updates: ["message"],
  });
  if (webhook.ok) await callTelegram("setMyCommands", { commands: BOT_COMMANDS });
  return webhook.ok;
};
