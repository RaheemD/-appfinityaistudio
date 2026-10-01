// Daily AI Insight for the Blog page.
//
// Runs server-side on Netlify so the OpenRouter API key never reaches the browser.
// Each UTC day features the newest model from one well-known family (OpenAI, Claude,
// Gemini, DeepSeek, Qwen, GLM, Grok, Kimi, MiniMax, Perplexity, Mistral...), picked
// from OpenRouter's live model catalog and written up from that catalog's facts.
// Results are cached on Netlify's durable CDN cache, so visitors get an instant
// response and paid generations stay capped per day.
//
// Required env var (Netlify > Site configuration > Environment variables, scope: Functions):
//   OPENROUTER_API_KEY   your OpenRouter key
// Optional:
//   OPENROUTER_MODEL     writer model, defaults to "z-ai/glm-5.3-flash"

import {
  type CatalogModel,
  cleanDescription,
  displayName,
  formatTokens,
  loadLatestModels,
  releasedLabel,
} from "../lib/model-catalog.mts";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "z-ai/glm-5.3-flash";

// Netlify synchronous functions are hard-limited to 60s; stay well inside it.
const TOTAL_BUDGET_MS = 50_000;
const MIN_RETRY_BUDGET_MS = 20_000;

// Hard cap on ?v=, so at most this many paid generations can happen per day.
const MAX_VARIANTS = 20;

type Topic = { name: string; facts: string | null };

// Used only if the OpenRouter catalog can't be loaded (latest models as of Oct 2026).
const FALLBACK_TOPICS: Topic[] = [
  "OpenAI: GPT-6.1 Sol",
  "Anthropic: Claude Sonnet 5.5",
  "Google: Gemini 3.8 Flash",
  "DeepSeek: DeepSeek V4.1 Flash",
  "Qwen: Qwen3.8 Max Prime",
  "Z.ai: GLM 5.3",
  "xAI: Grok 4.7",
  "MoonshotAI: Kimi K3",
  "MiniMax: MiniMax M3",
  "Perplexity: Sonar Pro Search",
  "Mistral: Mistral Medium 3.5",
].map((name) => ({ name: displayName(name), facts: null }));

type Insight = {
  date: string;
  variant: number;
  variants: number;
  topic: string;
  content: string;
  generatedAt: string;
};

// Per-instance memo + in-flight dedupe keyed by "date:variant" (the CDN cache is the main layer).
const memo = new Map<string, Insight>();
const inFlight = new Map<string, Promise<Insight>>();

const utcDateKey = (now: Date) => now.toISOString().slice(0, 10);

// Returns the requested variant, or null if the query string is anything other than ?v=<0..MAX-1>.
const parseVariant = (url: URL): number | null => {
  const keys = [...url.searchParams.keys()];
  if (keys.length === 0) return url.search ? null : 0;
  if (keys.length !== 1 || keys[0] !== "v") return null;
  const raw = url.searchParams.get("v") ?? "";
  if (!/^(0|[1-9]\d?)$/.test(raw)) return null; // no "01"-style aliases of the same variant
  const variant = Number(raw);
  return variant < MAX_VARIANTS ? variant : null;
};

const secondsUntilNextUtcMidnight = (now: Date) => {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(60, Math.floor((next - now.getTime()) / 1000));
};

// Verified facts handed to the writer, so it never has to guess about models newer than its training data.
// Prices and benchmark scores are deliberately left out: they change often and don't suit a studio blog.
const buildFacts = (m: CatalogModel) => {
  const params = new Set(m.supported_parameters ?? []);
  const capabilities = [
    params.has("tools") && "tool / function calling",
    (params.has("structured_outputs") || params.has("response_format")) && "structured JSON output",
    params.has("reasoning") && "built-in reasoning (thinking) mode",
  ].filter(Boolean);
  const summary = cleanDescription(m.description);

  return [
    `- Model: ${displayName(m.name || m.id)}`,
    `- Released: ${releasedLabel(m)}`,
    summary && `- Official summary: ${summary}`,
    m.context_length && `- Context window: ${formatTokens(m.context_length)} tokens`,
    m.architecture?.input_modalities?.length && `- Accepts: ${m.architecture.input_modalities.join(", ")}`,
    capabilities.length > 0 && `- Capabilities: ${capabilities.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");
};

// Each day features the newest model from one well-known family (see ../lib/model-catalog.mts);
// the refresh button steps through the rest.
const loadTopics = async (now: Date): Promise<Topic[]> => {
  try {
    const models = await loadLatestModels(now);
    return models.map((m) => ({ name: displayName(m.name || m.id), facts: buildFacts(m) }));
  } catch (error) {
    console.error("[daily-insight] model catalog unavailable, using fallback list:", error);
    return FALLBACK_TOPICS;
  }
};

// Variant 0 is the day's featured model; the refresh button walks through the others.
const topicFor = (topics: Topic[], now: Date, variant: number) => {
  const dayIndex = Math.floor(now.getTime() / 86_400_000);
  return topics[(dayIndex + variant) % topics.length];
};

const buildPrompt = (topic: Topic, today: string) => {
  const grounding = topic.facts
    ? `Base the review ONLY on these verified facts (today is ${today}).
This model may be newer than your training data, so do not add claims these facts do not support:
${topic.facts}`
    : `Today is ${today}. Only state facts you are confident about; if you are unsure, stay general.
Do not invent prices, benchmark numbers or release dates.`;

  return `Write a tech spotlight review of the AI model "${topic.name}" as today's featured model.

${grounding}

Use exactly this structure and Markdown:

## What is it?
One or two sentences: who makes it, what kind of model it is and what it is built for.

## Key Features
- Exactly 3 bullets, each a concrete capability backed by the facts

## Best Work Use Cases
- Exactly 3 bullets, each a specific professional task it suits

No title, no intro and no closing paragraph. Maximum 200 words.
Do not mention prices, costs, benchmark scores, OpenRouter or API ids.
Tone: professional, educational and specific, like a knowledgeable tech YouTuber.`;
};

// Drop any closing paragraph the model adds after the final bullet list, so every
// insight ends cleanly on "Best Work Use Cases".
const stripOutro = (text: string) => {
  const lines = text.split("\n");
  let lastHeading = -1;
  let lastBullet = -1;
  lines.forEach((line, i) => {
    if (/^#{1,6}\s/.test(line.trim())) lastHeading = i;
    if (/^(?:[-*•]|\d+\.)\s+/.test(line.trim())) lastBullet = i;
  });
  return lastBullet > lastHeading ? lines.slice(0, lastBullet + 1).join("\n") : text;
};

const cleanContent = (raw: string) =>
  stripOutro(
    raw
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/^```(?:markdown|md)?\s*/i, "")
      .replace(/```\s*$/, "")
      .trim(),
  ).trim();

const callOpenRouter = async (apiKey: string, model: string, prompt: string, timeoutMs: number) => {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://appfinityaistudio.com",
      "X-Title": "Appfinity AI Studio",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: "You are a concise, accurate technology writer for the Appfinity AI Studio blog.",
        },
        { role: "user", content: prompt },
      ],
      // GLM 5.3 Flash has mandatory reasoning: keep it short and out of the response.
      reasoning: { effort: "low", exclude: true },
      // Covers reasoning + answer; the answer itself is ~300 tokens.
      max_tokens: 4000,
      temperature: 0.7,
      // Prefer the fastest providers so the first (uncached) request of the day is quick.
      provider: { sort: "throughput" },
    }),
  });

  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 500);
    throw new Error(`OpenRouter HTTP ${response.status}: ${detail}`);
  }

  const data = await response.json();
  if (data?.error) {
    throw new Error(`OpenRouter error: ${JSON.stringify(data.error).slice(0, 500)}`);
  }

  const content = cleanContent(String(data?.choices?.[0]?.message?.content ?? ""));
  if (content.length < 80) {
    throw new Error(
      `OpenRouter returned too little content (finish_reason=${data?.choices?.[0]?.finish_reason}, length=${content.length})`,
    );
  }
  return content;
};

const generateInsight = async (now: Date, variant: number): Promise<Insight> => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured");

  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  const topics = await loadTopics(now);
  const topic = topicFor(topics, now, variant);
  const prompt = buildPrompt(topic, utcDateKey(now));

  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const remaining = deadline - Date.now();
    if (attempt > 1 && remaining < MIN_RETRY_BUDGET_MS) break;
    try {
      const content = await callOpenRouter(apiKey, model, prompt, remaining);
      return {
        date: utcDateKey(now),
        variant,
        variants: topics.length,
        topic: topic.name,
        content,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      lastError = error;
      console.error(`[daily-insight] attempt ${attempt} failed:`, error);
    }
  }
  throw lastError;
};

const json = (body: unknown, status: number, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });

const NO_STORE = { "Cache-Control": "no-store", "Netlify-CDN-Cache-Control": "no-store" };

export default async (req: Request) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return json({ error: "Method not allowed" }, 405, { ...NO_STORE, Allow: "GET, HEAD" });
  }

  // Every distinct query string is a new CDN cache key (and a new paid generation),
  // so only ?v=<0..MAX_VARIANTS-1> is accepted.
  const variant = parseVariant(new URL(req.url));
  if (variant === null) {
    return json({ error: "Unsupported query parameters" }, 400, NO_STORE);
  }

  const now = new Date();
  const today = utcDateKey(now);
  const key = `${today}:${variant}`;

  try {
    let insight = memo.get(key);
    if (!insight) {
      let promise = inFlight.get(key);
      if (!promise) {
        promise = generateInsight(now, variant).finally(() => inFlight.delete(key));
        inFlight.set(key, promise);
      }
      insight = await promise;
      for (const k of memo.keys()) if (!k.startsWith(`${today}:`)) memo.delete(k);
      memo.set(key, insight);
    }

    return json(insight, 200, {
      // Browsers always revalidate; Netlify's CDN holds it until the next UTC day and
      // keeps serving the previous day's copy while a new one is generated in the background.
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Netlify-CDN-Cache-Control": `public, durable, s-maxage=${secondsUntilNextUtcMidnight(now)}, stale-while-revalidate=86400`,
      "Netlify-Vary": "query=v",
    });
  } catch (error) {
    console.error("[daily-insight] generation failed:", error);
    return json({ error: "Insight temporarily unavailable" }, 503, NO_STORE);
  }
};
