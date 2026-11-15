// Daily digest for the owner's Telegram bot: yesterday's leads and tool activity, AI spend and
// site status. Runs at 03:30 UTC = 9:00 AM IST. Also clears stored events and live chats older
// than 30 days.

import { pruneOldChats } from "../lib/live-chat.mts";
import { pruneOldEvents } from "../lib/ops-store.mts";
import { digestReport } from "../lib/owner-reports.mts";
import { sendToOwner, telegramReady } from "../lib/telegram.mts";

export const config = {
  schedule: "30 3 * * *",
};

export default async () => {
  await Promise.all([pruneOldEvents(), pruneOldChats()]);
  if (!telegramReady()) return new Response("bot not configured");
  await sendToOwner(await digestReport());
  return new Response("ok");
};
