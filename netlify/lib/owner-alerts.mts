// Lead alerts for the owner's Telegram bot: record the event (for /leads and the daily digest) and
// send an instant message. Does nothing until TELEGRAM_BOT_TOKEN is set.

import { type EventType, recordEvent } from "./ops-store.mts";
import { botToken, escapeHtml, sendToOwner, truncate } from "./telegram.mts";

export const EVENT_LABELS: Record<EventType, { emoji: string; one: string; many: string }> = {
  blueprint: { emoji: "💡", one: "New App Blueprint", many: "App Blueprints" },
  xray: { emoji: "⚙️", one: "New Automation X-Ray", many: "Automation X-Rays" },
  contact: { emoji: "✉️", one: "New contact form message", many: "Contact form messages" },
  chat: { emoji: "💬", one: "Chat visitor asking about pricing / hiring", many: "Pricing / hiring chats" },
};

// Per-instance burst guard so a flood of activity can't flood the owner's phone.
const BURST_LIMIT = 20;
const BURST_WINDOW_MS = 10 * 60 * 1000;
let sentAt: number[] = [];

const underBurstLimit = () => {
  const now = Date.now();
  sentAt = sentAt.filter((time) => now - time < BURST_WINDOW_MS);
  if (sentAt.length >= BURST_LIMIT) return false;
  sentAt.push(now);
  return true;
};

// `fields` are [label, visitor text] pairs; empty values are skipped. The first field is the headline.
export const alertOwner = async (type: EventType, fields: [string, string][]) => {
  if (!botToken()) return;
  const shown = fields.filter(([, value]) => value.trim());
  const label = EVENT_LABELS[type];

  await Promise.all([
    recordEvent({
      type,
      title: truncate(shown[0]?.[1] ?? label.one, 140),
      detail: truncate(shown.slice(1).map(([name, value]) => `${name}: ${value}`).join(" · "), 400),
    }),
    underBurstLimit()
      ? sendToOwner(
          [`${label.emoji} <b>${label.one}</b>`, ...shown.map(([name, value]) => `<b>${escapeHtml(name)}:</b> ${escapeHtml(truncate(value, 900))}`)].join("\n"),
        )
      : Promise.resolve(),
  ]);
};

type FunctionContext = { waitUntil?: (promise: Promise<unknown>) => void };

// Runs `work` without delaying the visitor's response where the platform supports it.
export const inBackground = async (context: FunctionContext | undefined, work: Promise<unknown>) => {
  const safe = work.catch((error) => console.error("[owner-alerts] failed:", error instanceof Error ? error.message : error));
  if (typeof context?.waitUntil === "function") {
    context.waitUntil(safe);
    return;
  }
  await Promise.race([safe, new Promise((resolve) => setTimeout(resolve, 5_000))]);
};
