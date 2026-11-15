// Site watchdog for the owner's Telegram bot. Runs every 10 minutes:
//   - checks the studio's sites and alerts when one goes down (2 failed checks in a row) or recovers
//   - alerts once a day if AI spend passes OPENROUTER_DAILY_ALERT_USD (default $1)
//   - keeps the bot's webhook registered, so setup needs no manual step beyond the env vars
//
// Does nothing until TELEGRAM_BOT_TOKEN is set.

import { fetchKeyUsage } from "../lib/openrouter.mts";
import { getState, setState } from "../lib/ops-store.mts";
import { type WatchState, checkSites, evaluateChecks } from "../lib/site-monitor.mts";
import { botToken, ensureWebhook, sendToOwner, siteUrl, telegramReady, webhookSecret } from "../lib/telegram.mts";

export const config = {
  schedule: "*/10 * * * *",
};

type WatchdogState = { sites?: WatchState; spendAlertDay?: string; webhook?: string };

const DEFAULT_DAILY_ALERT_USD = 1;

export default async () => {
  if (!botToken()) return new Response("bot not configured");

  const state = await getState<WatchdogState>("watchdog", {});

  // Register the webhook once per site URL / token.
  const webhookTarget = `${siteUrl()}|${webhookSecret().slice(0, 12)}`;
  if (state.webhook !== webhookTarget && (await ensureWebhook())) state.webhook = webhookTarget;

  const alerts: string[] = [];
  if (telegramReady()) {
    const [checks, usage] = await Promise.all([checkSites(), fetchKeyUsage(process.env.OPENROUTER_API_KEY)]);

    const evaluated = evaluateChecks(state.sites ?? {}, checks);
    state.sites = evaluated.next;
    alerts.push(...evaluated.alerts);

    const threshold = Number(process.env.OPENROUTER_DAILY_ALERT_USD) || DEFAULT_DAILY_ALERT_USD;
    const utcDay = new Date().toISOString().slice(0, 10);
    if (usage && usage.usage_daily >= threshold && state.spendAlertDay !== utcDay) {
      state.spendAlertDay = utcDay;
      alerts.push(
        `💸 <b>AI spend alert</b>\nToday's OpenRouter spend is $${usage.usage_daily.toFixed(2)} (alert level $${threshold.toFixed(2)}).\nSend /cost for details.`,
      );
    }
  }

  // Save first: if state can't be saved, stay quiet rather than repeat the same alert every run.
  const saved = await setState("watchdog", state);
  if (!saved && alerts.length) console.error(`[watchdog] state not saved; ${alerts.length} alert(s) not sent`);
  if (saved) for (const alert of alerts) await sendToOwner(alert);

  return new Response("ok");
};
