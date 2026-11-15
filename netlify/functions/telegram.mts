// Webhook for the owner's private Telegram bot (the studio's "control room").
//
//   POST /api/telegram   Telegram delivers the owner's messages here (verified by a secret header).
//   GET  /api/telegram   (Re)registers the webhook with Telegram - open once after adding the token.
//
// Only the chat in TELEGRAM_CHAT_ID gets answers. Setup: see netlify/lib/telegram.mts.

import { addOwnerMessage, chatState, conversationForTelegramMessage, endTakeover, linkTelegramMessage } from "../lib/live-chat.mts";
import { json } from "../lib/openrouter.mts";
import { istDay } from "../lib/ops-store.mts";
import { activityReport, costReport, digestReport, leadsReport, statusReport } from "../lib/owner-reports.mts";
import { telegramMessageId } from "../lib/owner-alerts.mts";
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
/digest - yesterday's digest

<b>Live chat:</b> when a chat visitor asks about pricing, use Telegram's <b>Reply</b> on that alert and your answer appears in their website chat. While you're answering, the AI stays quiet and their messages come here. Reply <code>/end</code> to hand the chat back to the AI.`;

const MAX_REPLY_CHARS = 2_000;
const VISITOR_AWAY_MS = 90_000;

type OwnerMessage = { message_id?: number; reply_to_message?: { message_id?: number } };

// The owner replied to a chat alert (or a forwarded visitor message): send it to that visitor.
// Returns false if the replied-to message isn't part of a live chat.
const handleChatReply = async (chatId: number, message: OwnerMessage, text: string) => {
  const repliedTo = message.reply_to_message?.message_id;
  if (typeof repliedTo !== "number") return false;
  const conversationId = await conversationForTelegramMessage(repliedTo);
  if (!conversationId) return false;

  const state = await chatState(conversationId);
  const command = text.split(/\s+/)[0].split("@")[0].toLowerCase();
  let confirmation: string;

  if (command === "/end") {
    confirmation = (await endTakeover(conversationId))
      ? "🤖 Handed back to the AI. It will answer this visitor's next message."
      : "⚠️ Couldn't update the chat. Please try again.";
  } else if (text.startsWith("/")) {
    confirmation = "That looks like a command. To message the visitor, reply with plain text. Reply <code>/end</code> to hand the chat back to the AI.";
  } else if (text.length > MAX_REPLY_CHARS) {
    confirmation = `⚠️ That's too long for the chat (max ${MAX_REPLY_CHARS} characters). Please send a shorter reply.`;
  } else if (!(await addOwnerMessage(conversationId, text))) {
    confirmation = "⚠️ Couldn't deliver that. Please try again.";
  } else {
    const away = !state?.lastSeenAt || Date.now() - state.lastSeenAt > VISITOR_AWAY_MS;
    const awayNote = away ? "\n⚠️ Their chat doesn't seem to be open right now, so they may not see this." : "";
    confirmation = state?.ownerMessages
      ? `✅ Sent${awayNote}`
      : `✅ Sent to the visitor's chat. The AI is paused while you answer; their next messages will come here. Reply <code>/end</code> to hand back to the AI.${awayNote}`;
  }

  const sent = await sendMessage(chatId, confirmation);
  // Replying to your own message or to the confirmation also reaches the same visitor.
  const links = [message.message_id, telegramMessageId(sent)].filter((id): id is number => typeof id === "number");
  await Promise.all(links.map((id) => linkTelegramMessage(id, conversationId)));
  return true;
};

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

  let update: { message?: OwnerMessage & { chat?: { id?: number }; text?: unknown } };
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
    if (update.message?.reply_to_message) {
      if (await handleChatReply(chatId, update.message, text)) return OK();
      if (!text.startsWith("/")) {
        await sendMessage(chatId, "That message isn't linked to a website chat, so your reply wasn't sent. Use <b>Reply</b> on a 💬 chat alert.");
        return OK();
      }
    }
    await sendMessage(chatId, await answer(command));
  } catch (error) {
    console.error("[telegram] command failed:", error);
    await sendMessage(chatId, "Something went wrong running that command. Please try again.");
  }
  // Always 200 so Telegram doesn't retry the same message.
  return OK();
};
