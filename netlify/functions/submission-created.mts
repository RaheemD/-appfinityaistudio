// Runs when Netlify verifies a form submission (the function's name subscribes it to that event;
// Netlify signs these calls, so it can't be triggered from outside). Forwards the Contact form
// message to the owner's Telegram bot.

import { alertOwner } from "../lib/owner-alerts.mts";

const field = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

export default async (req: Request) => {
  let payload: { form_name?: unknown; data?: Record<string, unknown> } | undefined;
  try {
    ({ payload } = await req.json());
  } catch {
    return new Response("ignored");
  }

  const data = payload?.data ?? {};
  const message = field(data.message, 1500);
  const name = field(data.name, 120);
  const email = field(data.email, 200);
  if (!message && !name && !email) return new Response("ignored");

  await alertOwner("contact", [
    ["Message", message || "(no message)"],
    ["Name", name],
    ["Email", email],
  ]).catch((error) => console.error("[submission-created] alert failed:", error));

  return new Response("ok");
};
