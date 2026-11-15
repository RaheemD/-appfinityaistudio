// Daily AI-written post for the studio's public Telegram channel (see ../lib/channel.mts).
// Runs at 10:00, 11:00 and 12:00 IST; posts once a day - the later runs only retry if the
// earlier one failed. Does nothing until TELEGRAM_CHANNEL_ID is set.

import { runDailyPost } from "../lib/channel.mts";

export const config = {
  schedule: "30 4,5,6 * * *",
};

export default async () => {
  // Scheduled functions get 30 seconds; the last run of the day tells the owner if it failed.
  const result = await runDailyPost({ lastChance: new Date().getUTCHours() >= 6, budgetMs: 26_000 });
  return new Response(result.status);
};
