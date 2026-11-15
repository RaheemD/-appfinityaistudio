// Webhook for the owner's private Telegram bot (the studio's "control room").
//
//   POST /api/telegram   Telegram delivers the owner's messages here (verified by a secret header).
//   GET  /api/telegram   (Re)registers the webhook with Telegram - open once after adding the token.
//
// Only the chat in TELEGRAM_CHAT_ID gets answers. Setup: see netlify/lib/telegram.mts.

import { json } from "../lib/openrouter.mts";
import { istDay } from "../lib/ops-store.mts";
import { activityReport, costReport, digestReport, leadsReport, statusReport } from "../lib/owner-reports.mts";
import { botToken, ensureWebhook, isWebhookSecret, ownerChatId, sendMessage } from "../lib/telegram.mts";

export const config = {
  path: "/api/telegram",
  method: ["GET", "POST"],
};

const HELP = `<b>Appfinity control room</b>

I message you when a visitor uses the AI Lab, sends the contact form or asks the chatbot about pricing, send a digest every morning at 9:00, and warn you if a site goes down or AI spend jumps.

/today - today's leads and activity
/leads - latest 10 leads
/cost - AI spend (OpenRouter)
/status - check all sites now
/digest - yesterday's digest`;

const answer = (command: string) => {
  switch (command) {
    case "/today":
      return activityReport(istDay(), "Today so far");
    case "/leads":
      return leadsReport();
    case "/cost":
      return costReport();
    case "/status":
      return statusReport();
    case "/digest":
      return digestReport();
    case "/start":
    case "/help":
      return HELP;
    default:
      return `I don't know that command.\n\n${HELP}`;
  }
};

const SETUP_COOLDOWN_MS = 60_000;
let lastSetupAt = 0;

const OK = () => new Response("ok");

export default async (req: Request) => {
  if (!botToken()) return json({ configured: false }, 200);

  if (req.method === "GET") {
    if (Date.now() - lastSetupAt < SETUP_COOLDOWN_MS) return json({ configured: true, webhook: "recently set - try again in a minute" }, 200);
    lastSetupAt = Date.now();
    return json({ configured: true, webhook: (await ensureWebhook()) ? "registered" : "failed", chatIdSet: !!ownerChatId() }, 200);
  }

  if (!isWebhookSecret(req.headers.get("x-telegram-bot-api-secret-token"))) return json({ error: "Forbidden" }, 403);

  let update: { message?: { chat?: { id?: number }; text?: unknown } };
  try {
    update = await req.json();
  } catch {
    return OK();
  }

  const chatId = update?.message?.chat?.id;
  const text = typeof update?.message?.text === "string" ? update.message.text.trim() : "";
  if (!chatId || !text) return OK();
  const command = text.split(/\s+/)[0].split("@")[0].toLowerCase();

  if (String(chatId) !== ownerChatId()) {
    // Helps the owner finish setup; everyone else just learns the bot is private.
    if (command === "/start") {
      await sendMessage(
        chatId,
        `This is a private bot for Appfinity AI Studio.\n\nYour chat ID is <code>${chatId}</code>. If this is your bot, add it as <b>TELEGRAM_CHAT_ID</b> in Netlify and redeploy.`,
      );
    }
    return OK();
  }

  try {
    await sendMessage(chatId, await answer(command));
  } catch (error) {
    console.error("[telegram] command failed:", error);
    await sendMessage(chatId, "Something went wrong running that command. Please try again.");
  }
  // Always 200 so Telegram doesn't retry the same message.
  return OK();
};
