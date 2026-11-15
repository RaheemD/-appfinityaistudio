// Live chat takeover: the chat widget polls this for replies the owner sent from Telegram.
// See ../lib/live-chat.mts for how the takeover works.
//
//   POST /api/chat-live  { c: <conversation id>, after: <last message id seen> }
//   -> { messages: [{ id, text, at }], human: boolean, watching: boolean }
//
// `watching: false` tells the widget to stop polling.

import { chatState, isConversationId, isCursor, markSeen, ownerMessagesAfter } from "../lib/live-chat.mts";
import { clientIp, createDailyLimiter, isSameOrigin, json } from "../lib/openrouter.mts";
import { inBackground } from "../lib/owner-alerts.mts";
import { telegramReady } from "../lib/telegram.mts";

export const config = {
  path: "/api/chat-live",
  method: ["POST"],
};

// A live chat polls every few seconds for up to ~20 minutes; this only stops runaway clients.
const overDailyLimit = createDailyLimiter(5_000);

const IDLE = { messages: [], human: false, watching: false };

export default async (req: Request, context?: { ip?: string; waitUntil?: (promise: Promise<unknown>) => void }) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!isSameOrigin(req)) return json({ error: "Forbidden" }, 403);

  let body: { c?: unknown; after?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
  if (!isConversationId(body?.c)) return json({ error: "Invalid request" }, 400);
  if (!telegramReady()) return json(IDLE, 200);
  if (overDailyLimit(clientIp(req, context))) return json({ error: "Too many requests" }, 429);

  const state = await chatState(body.c);
  // Storage hiccup: say "keep watching" so one failed read doesn't end a live conversation.
  if (!state) return json({ messages: [], human: false, watching: true }, 200);
  if (!state.watched) return json(IDLE, 200);

  const messages = await ownerMessagesAfter(body.c, state, isCursor(body.after) ? body.after : "");
  await inBackground(context, markSeen(body.c, state));
  return json({ messages, human: state.human, watching: true }, 200);
};
