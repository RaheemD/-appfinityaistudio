// Daily AI-written posts for the studio's public Telegram channel.
//
// Setup (once): create a public Telegram channel, add the bot as an administrator with
// "Post messages", then add the env var TELEGRAM_CHANNEL_ID = @your_channel_name (Functions scope)
// and redeploy. Until then nothing is posted.
//
// Each weekday has its own theme so the channel doesn't repeat itself, and every post is written
// only from facts we give the model (the live model catalog, the website's own facts) - no prices,
// statistics or claims it could invent. Each post carries a button back to the website.

import { cleanDescription, displayName, loadLatestModels, releasedLabel } from "./model-catalog.mts";
import { DEFAULT_MODEL, requestOpenRouter } from "./openrouter.mts";
import { getState, istDay, setState } from "./ops-store.mts";
import { SITE_KNOWLEDGE } from "./site-knowledge.mts";
import { botToken, callTelegram, escapeHtml, sendMessage, sendToOwner, siteUrl, truncate } from "./telegram.mts";

export const channelId = () => (process.env.TELEGRAM_CHANNEL_ID || "").trim();
export const channelReady = () => !!botToken() && !!channelId();

// Public link to a channel post, when the channel has a @username.
export const channelPostLink = (messageId: number) => {
  const id = channelId();
  return id.startsWith("@") ? `https://t.me/${id.slice(1)}/${messageId}` : "";
};

// ---------------------------------------------------------------------------------------------
// Themes
// ---------------------------------------------------------------------------------------------

type Facts = { brief: string; facts: string; button: { text: string; url: string } };
type Theme = { key: string; emoji: string; label: string; facts: (now: Date, recent: string[]) => Promise<Facts> };

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const istDate = (now: Date) => new Date(now.getTime() + IST_OFFSET_MS);
const weekNumber = (now: Date) => Math.floor(istDate(now).getTime() / (7 * 86_400_000));
const pick = <T,>(list: T[], now: Date) => list[weekNumber(now) % list.length];

const link = (path: string) => {
  const url = new URL(path, `${siteUrl()}/`);
  url.searchParams.set("utm_source", "telegram");
  url.searchParams.set("utm_medium", "channel");
  return url.toString();
};

const latestModels = async (now: Date) => {
  try {
    return await Promise.race([
      loadLatestModels(now),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("catalog timeout")), 5_000)),
    ]);
  } catch (error) {
    console.error("[channel] model catalog unavailable:", error instanceof Error ? error.message : error);
    return [];
  }
};

const modelLine = (m: Awaited<ReturnType<typeof latestModels>>[number]) => {
  const summary = cleanDescription(m.description);
  return `- ${displayName(m.name || m.id)} (released ${releasedLabel(m)})${summary ? `: ${summary}` : ""}`;
};

const EXPLAINER_TOPICS = [
  "AI agents: what they are and what they can really do for a business today",
  "RAG (retrieval-augmented generation): how a chatbot can answer from your own documents",
  "PWAs (progressive web apps): an app experience without the app store",
  "LLM context windows and tokens, in plain English",
  "Prompting vs fine-tuning vs RAG: which one a business actually needs",
  "Webhooks and APIs: how apps talk to each other",
  "No-code tools vs custom software: when to switch",
  "Vector databases and embeddings, explained simply",
  "AI hallucinations: why they happen and how good products guard against them",
  "Multimodal AI: models that read images, documents and audio",
  "What an MVP really is, and why the first version should be small",
  "How AI chat assistants on websites turn visitors into leads",
];

const APP_IDEA_INDUSTRIES = [
  "salons and spas",
  "local gyms and fitness coaches",
  "clinics and diagnostic labs",
  "restaurants and cloud kitchens",
  "coaching institutes and tutors",
  "real-estate brokers",
  "small manufacturers and exporters",
  "event planners",
  "retail shops going online",
  "logistics and delivery businesses",
  "travel agencies",
  "housing societies",
];

const AUTOMATION_BUSINESSES = [
  "a small export business handling enquiries from many countries",
  "a clinic managing appointments and reminders",
  "a real-estate broker following up with leads",
  "an online store processing orders and returns",
  "a coaching institute tracking fees and attendance",
  "a digital agency sending weekly client reports",
  "a restaurant collecting reviews and feedback",
  "a recruiter screening CVs from email",
  "a freelancer sending invoices and payment reminders",
  "a distributor updating stock from WhatsApp orders",
];

const AI_TIP_TOPICS = [
  "writing better prompts for business tasks",
  "using AI to draft customer replies without sounding robotic",
  "checking AI answers before trusting them",
  "using AI to summarise long documents and meetings",
  "keeping customer data private when using AI tools",
  "using AI to brainstorm product names and marketing angles",
  "turning messy notes into a clear plan with AI",
  "using AI to analyse spreadsheets and sales data",
  "using AI for multilingual customer support (English, Hindi, Hinglish)",
  "building a simple daily routine with AI tools for a small team",
];

const PRODUCTS = [
  { name: "FitnessMate", url: "https://play.google.com/store/apps/details?id=app.netlify.fitnessmate.twa", button: "Get FitnessMate" },
  { name: "Next Frame Casting", url: "https://nextframecasting.netlify.app/", button: "Visit Next Frame Casting" },
  { name: "FairOrigin Global", url: "https://fairoriginglobal.com/", button: "Visit FairOrigin Global" },
  { name: "Ascend CRM", url: "https://ascend-aicrm.netlify.app/", button: "Preview Ascend CRM" },
  { name: "WorldLens", url: "https://worldailens.netlify.app/", button: "Preview WorldLens" },
];

export const THEMES: Theme[] = [
  {
    key: "roundup",
    emoji: "🗞️",
    label: "Sunday AI roundup",
    facts: async (now) => {
      const models = await latestModels(now);
      return {
        brief:
          "A short weekly roundup: the newest AI models from the major labs right now and what each is good for, in one line each. Pick 4-6 of the models below. End with one sentence on what this means for businesses building with AI.",
        facts: models.length ? `Latest models (live catalog):\n${models.map(modelLine).join("\n")}` : "",
        button: { text: "Read today's AI insight", url: link("/blog") },
      };
    },
  },
  {
    key: "model",
    emoji: "🧠",
    label: "AI model spotlight",
    facts: async (now, recent) => {
      const models = await latestModels(now);
      const fresh = models.filter((m) => !recent.some((title) => title.toLowerCase().includes(displayName(m.name || m.id).toLowerCase())));
      const chosen = (fresh.length ? fresh : models)[weekNumber(now) % Math.max(1, (fresh.length ? fresh : models).length)];
      return {
        brief: chosen
          ? `Spotlight one AI model: ${displayName(chosen.name || chosen.id)}. Who made it, what it's good at, and 2-3 practical ways a business could use it. Only use the facts below about this model.`
          : "Spotlight how businesses should choose between today's major AI model families (OpenAI, Anthropic, Google, open models) - practical criteria, no specific version numbers.",
        facts: chosen ? `About the model (live catalog):\n${modelLine(chosen)}` : "",
        button: { text: "Read today's AI insight", url: link("/blog") },
      };
    },
  },
  {
    key: "automation",
    emoji: "⚙️",
    label: "Automate this",
    facts: async (now) => ({
      brief: `"Automate this": describe one repetitive task in ${pick(AUTOMATION_BUSINESSES, now)} and how it can be automated step by step (trigger, 3-4 steps, what stays human). Name common tools (e.g. Gmail, WhatsApp, Google Sheets, n8n, Zapier, an AI model) without promising exact time savings. End by inviting readers to map their own task with our free Automation X-Ray.`,
      facts: "",
      button: { text: "Try Automation X-Ray (free)", url: link("/lab?tool=xray") },
    }),
  },
  {
    key: "explainer",
    emoji: "💡",
    label: "Tech explained",
    facts: async (now) => ({
      brief: `Explain this in plain English for a business owner: ${pick(EXPLAINER_TOPICS, now)}. Use one everyday analogy and one concrete business example.`,
      facts: "",
      button: { text: "Ask our AI assistant", url: link("/") },
    }),
  },
  {
    key: "appidea",
    emoji: "📱",
    label: "App idea of the week",
    facts: async (now) => ({
      brief: `"App idea of the week" for ${pick(APP_IDEA_INDUSTRIES, now)}: the problem, the app idea, 3 key features (at least one using AI), and who would pay for it. Keep it realistic for a first version. End by inviting readers to turn their own idea into a free one-page blueprint.`,
      facts: "",
      button: { text: "Get a free App Blueprint", url: link("/lab?tool=blueprint") },
    }),
  },
  {
    key: "product",
    emoji: "🚀",
    label: "Built by Appfinity",
    facts: async (now) => {
      const product = pick(PRODUCTS, now);
      return {
        brief: `"Built by Appfinity": a short spotlight on our product ${product.name} - what it does and who it's for, using ONLY the facts about it below. Say clearly whether it is live or still in development, exactly as the facts say.`,
        facts: SITE_KNOWLEDGE,
        button: { text: product.button, url: product.url },
      };
    },
  },
  {
    key: "tip",
    emoji: "✨",
    label: "AI tip",
    facts: async (now) => ({
      brief: `A practical AI tip for business owners about ${pick(AI_TIP_TOPICS, now)}. Include one short example (a prompt or a before/after) they can try today.`,
      facts: "",
      button: { text: "Explore our AI Lab", url: link("/lab") },
    }),
  },
];

// Sunday = roundup, Monday = model spotlight, ... (IST weekday).
export const themeFor = (now: Date) => THEMES[istDate(now).getUTCDay()];
export const themeByKey = (key: string) => THEMES.find((theme) => theme.key === key);

// ---------------------------------------------------------------------------------------------
// Writing the post
// ---------------------------------------------------------------------------------------------

export type ChannelPost = { title: string; body: string; hashtags: string[] };

const POST_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "body", "hashtags"],
  properties: {
    title: { type: "string" },
    body: { type: "string" },
    hashtags: { type: "array", items: { type: "string" } },
  },
};

const SYSTEM = `You write the daily post for the public Telegram channel of Appfinity AI Studio, an AI-first product studio in Mumbai, India that builds AI-powered apps, web & SaaS platforms, mobile apps and automations.

Readers: founders, small-business owners and tech-curious people in India and worldwide.

Return ONLY a JSON object: {"title": string, "body": string, "hashtags": string[]}
- title: a specific, catchy headline, 4-10 words, no emoji, no quotes.
- body: 450-900 characters of plain text. Open with a strong first line (a hook, not a greeting). Short paragraphs separated by a blank line; up to 4 bullet lines starting with "• " are fine. At most 2 emojis. No Markdown (no **, #, links or URLs) - a button with the link is added for you. End with one short, friendly call to action that matches the button.
- hashtags: 2-3 relevant hashtags without the # sign, letters/numbers only (e.g. "AI", "Automation", "StartupIndia").

Rules:
- Use only the facts provided. Never invent statistics, percentages, prices, benchmark scores, release dates, customers, quotes or features. If you are unsure of a detail, leave it out.
- Never mention prices or costs of models or services.
- Be genuinely useful and specific; avoid clichés like "in today's fast-paced world", "game-changer", "revolutionize", "unlock".
- Don't repeat the angle of these recent posts: {RECENT}.
- English only.`;

const extractJson = (content: string) => {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON object in reply");
  return JSON.parse(content.slice(start, end + 1));
};

const CLICHES = /fast-paced world|game[- ]changer|revolutioni[sz]e/i;

export const normalizePost = (raw: unknown): ChannelPost => {
  const value = raw as Partial<ChannelPost> | null;
  const title = String(value?.title ?? "").replace(/^["'\s]+|["'\s]+$/g, "").replace(/\*+/g, "").trim();
  const body = String(value?.body ?? "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const hashtags = (Array.isArray(value?.hashtags) ? value.hashtags : [])
    .map((tag) => String(tag).replace(/[^\p{L}\p{N}_]/gu, ""))
    .filter((tag) => tag.length >= 2 && tag.length <= 30)
    .slice(0, 3);
  if (title.length < 8 || title.length > 100) throw new Error(`bad title length ${title.length}`);
  if (body.length < 200 || body.length > 1_600) throw new Error(`bad body length ${body.length}`);
  if (CLICHES.test(body) || /https?:\/\//i.test(body)) throw new Error("body contains clichés or links");
  return { title, body, hashtags };
};

// Returns null if no valid post could be written before `deadline` (ms timestamp).
export const writePost = async (theme: Theme, recent: string[], now: Date, deadline: number) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  const { brief, facts, button } = await theme.facts(now, recent);
  const today = istDate(now).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
  const baseBody = {
    model: process.env.OPENROUTER_CHANNEL_MODEL || DEFAULT_MODEL,
    messages: [
      { role: "system", content: SYSTEM.replace("{RECENT}", recent.length ? recent.map((t) => `"${t}"`).join(", ") : "none yet") },
      {
        role: "user",
        content: `Today is ${today}. Theme: ${theme.label}.\n\n${brief}${facts ? `\n\nFacts you may use:\n${facts}` : ""}\n\nThe button under the post says "${button.text}". Your closing line must invite readers to do exactly that (for example "Tap the button below to ..."). Don't suggest other actions such as contacting the team.`,
      },
    ],
    reasoning: { effort: "low", exclude: true },
    max_tokens: 1_200,
    temperature: 0.8,
  };
  const attempts = [
    { ...baseBody, response_format: { type: "json_schema", json_schema: { name: "channel_post", strict: true, schema: POST_SCHEMA } }, provider: { sort: "throughput", require_parameters: true } },
    { ...baseBody, provider: { sort: "throughput" } },
  ];
  for (const [i, attempt] of attempts.entries()) {
    const remaining = deadline - Date.now();
    if (remaining < 5_000) break;
    try {
      const response = await requestOpenRouter(apiKey, attempt, Math.min(i === 0 ? 16_000 : 20_000, remaining - 1_000));
      if (!response.ok) {
        console.error(`[channel] attempt ${i + 1} HTTP ${response.status}: ${(await response.text().catch(() => "")).slice(0, 300)}`);
        continue;
      }
      const data = await response.json();
      const post = normalizePost(extractJson(String(data?.choices?.[0]?.message?.content ?? "")));
      return { post, button };
    } catch (error) {
      console.error(`[channel] attempt ${i + 1} failed:`, error instanceof Error ? error.message : error);
    }
  }
  return null;
};

export const renderPost = (theme: Theme, post: ChannelPost) =>
  [
    `${theme.emoji} <b>${escapeHtml(post.title)}</b>`,
    "",
    escapeHtml(post.body),
    ...(post.hashtags.length ? ["", post.hashtags.map((tag) => `#${tag}`).join(" ")] : []),
  ].join("\n");

const sendPost = (chatId: string | number, html: string, button: { text: string; url: string }) =>
  callTelegram("sendMessage", {
    chat_id: chatId,
    text: truncate(html, 3_900),
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    reply_markup: { inline_keyboard: [[{ text: button.text, url: button.url }]] },
  });

// ---------------------------------------------------------------------------------------------
// Daily run
// ---------------------------------------------------------------------------------------------

type ChannelState = { lastDay: string; titles: string[]; failNotifiedDay: string };
const EMPTY_STATE: ChannelState = { lastDay: "", titles: [], failNotifiedDay: "" };
const RECENT_TITLES = 21;

const loadState = async () => ({ ...EMPTY_STATE, ...(await getState<Partial<ChannelState>>("channel", EMPTY_STATE)) });

export type RunResult = { status: "not-configured" | "already-posted" | "write-failed" | "post-failed" | "posted"; detail?: string };

// Writes and publishes today's post. `force` posts even if one already went out today (owner's
// /post command). `lastChance` tells the owner if today's post couldn't be published.
export const runDailyPost = async ({ force = false, lastChance = false, budgetMs = 26_000, now = new Date() } = {}): Promise<RunResult> => {
  if (!channelReady()) return { status: "not-configured" };
  const deadline = Date.now() + budgetMs;
  const today = istDay(now);
  const state = await loadState();
  if (state.lastDay === today && !force) return { status: "already-posted" };

  const theme = themeFor(now);
  const written = await writePost(theme, state.titles, now, deadline);

  const notifyFailure = async (detail: string) => {
    if (!lastChance && !force) return;
    if (state.failNotifiedDay === today && !force) return;
    await sendToOwner(`⚠️ <b>Channel post not published</b>\n${escapeHtml(detail)}`);
    await setState("channel", { ...state, failNotifiedDay: today });
  };

  if (!written) {
    await notifyFailure("The AI couldn't write today's post in time. Send /post to try again.");
    return { status: "write-failed" };
  }

  const sent = await sendPost(channelId(), renderPost(theme, written.post), written.button);
  if (!sent.ok) {
    const hint = /rights|admin|chat not found|member|forbidden/i.test(sent.description ?? "")
      ? " Check that the bot is an administrator of the channel with 'Post messages' allowed, and that TELEGRAM_CHANNEL_ID is the channel's @username."
      : "";
    await notifyFailure(`Telegram said: ${sent.description ?? "unknown error"}.${hint}`);
    return { status: "post-failed", detail: sent.description };
  }

  await setState("channel", { ...state, lastDay: today, titles: [...state.titles, written.post.title].slice(-RECENT_TITLES) });
  const messageId = (sent.result as { message_id?: number } | undefined)?.message_id;
  const postLink = typeof messageId === "number" ? channelPostLink(messageId) : "";
  await sendToOwner(`📢 <b>Posted to your channel</b> (${escapeHtml(theme.label)})\n${escapeHtml(written.post.title)}${postLink ? `\n${postLink}` : ""}`);
  return { status: "posted", detail: written.post.title };
};

// Owner's /preview: writes a post (today's theme, or `themeKey`) and sends it only to the owner.
export const previewPost = async (ownerChat: string | number, themeKey = "", now = new Date()) => {
  const theme = (themeKey && themeByKey(themeKey)) || themeFor(now);
  const state = await loadState();
  const written = await writePost(theme, state.titles, now, Date.now() + 40_000);
  if (!written) return sendMessage(ownerChat, "⚠️ The AI couldn't write a preview just now. Please try again.");
  return sendPost(ownerChat, `👀 <i>Preview - not posted</i>\n\n${renderPost(theme, written.post)}`, written.button);
};
