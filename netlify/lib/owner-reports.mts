// Message builders shared by the bot's commands (/today, /leads, /cost, /status, /digest) and the
// scheduled daily digest. Each returns Telegram HTML.

import { fetchKeyUsage } from "./openrouter.mts";
import { EVENT_LABELS } from "./owner-alerts.mts";
import { type EventType, type OpsEvent, countEvents, istDay, istTime, latestEvents } from "./ops-store.mts";
import { checkSites, statusLines } from "./site-monitor.mts";
import { escapeHtml } from "./telegram.mts";

const EVENT_ORDER: EventType[] = ["blueprint", "xray", "contact", "chat"];

const usd = (amount: number) => `$${amount.toFixed(amount < 1 ? 4 : 2)}`;

const dayLabel = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

const eventLine = (event: OpsEvent, withDay = false) => {
  const label = EVENT_LABELS[event.type] ?? EVENT_LABELS.chat;
  const when = withDay ? `${dayLabel(istDay(new Date(event.at)))}, ${istTime(event.at)}` : istTime(event.at);
  const detail = event.detail ? `\n   <i>${escapeHtml(event.detail)}</i>` : "";
  return `${label.emoji} <b>${when}</b> ${escapeHtml(event.title)}${detail}`;
};

// Counts by type for one IST day, plus that day's latest few events.
export const activityReport = async (day: string, heading: string) => {
  const [counts, latest] = await Promise.all([countEvents(day), latestEvents(5, day)]);
  const total = EVENT_ORDER.reduce((sum, type) => sum + counts[type], 0);
  const lines = [`<b>${heading}</b> · ${dayLabel(day)}`, ""];
  if (total === 0) {
    lines.push("No leads or tool activity.");
  } else {
    for (const type of EVENT_ORDER) lines.push(`${EVENT_LABELS[type].emoji} ${EVENT_LABELS[type].many}: <b>${counts[type]}</b>`);
    if (latest.length) lines.push("", "<b>Latest</b>", ...latest.map((event) => eventLine(event)));
  }
  return lines.join("\n");
};

export const leadsReport = async () => {
  const latest = await latestEvents(10);
  if (latest.length === 0) return "No leads recorded yet. They'll show up here as visitors use the site.";
  return ["<b>Latest leads</b>", ...latest.map((event) => eventLine(event, true))].join("\n\n");
};

export const costReport = async () => {
  const usage = await fetchKeyUsage(process.env.OPENROUTER_API_KEY);
  if (!usage) return "Couldn't read AI spend from OpenRouter right now.";
  const lines = [
    "<b>AI spend (OpenRouter)</b>",
    "",
    `Today (UTC): <b>${usd(usage.usage_daily)}</b>`,
    `This week: <b>${usd(usage.usage_weekly)}</b>`,
    `This month: <b>${usd(usage.usage_monthly)}</b>`,
    `All time: ${usd(usage.usage)}`,
  ];
  if (usage.limit !== null && usage.limit_remaining !== null) {
    lines.push(`Limit: ${usd(usage.limit)} · remaining <b>${usd(usage.limit_remaining)}</b>`);
  }
  return lines.join("\n");
};

export const statusReport = async () => {
  const checks = await checkSites();
  const down = checks.filter((check) => !check.ok).length;
  return [`<b>Sites</b> · ${down === 0 ? "all up" : `${down} down`}`, "", ...statusLines(checks)].join("\n");
};

// Yesterday's activity + spend + site status.
export const digestReport = async (now = new Date()) => {
  const yesterday = istDay(new Date(now.getTime() - 86_400_000));
  const [activity, usage, checks] = await Promise.all([
    activityReport(yesterday, "☀️ Daily digest"),
    fetchKeyUsage(process.env.OPENROUTER_API_KEY),
    checkSites(),
  ]);
  const down = checks.filter((check) => !check.ok);
  return [
    activity,
    "",
    usage ? `<b>AI spend</b> · this week ${usd(usage.usage_weekly)} · this month ${usd(usage.usage_monthly)}` : "<b>AI spend</b> · unavailable",
    down.length === 0 ? `<b>Sites</b> · all ${checks.length} up ✅` : `<b>Sites</b> · 🔴 down: ${down.map((check) => check.name).join(", ")}`,
  ].join("\n");
};
