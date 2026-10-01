// Daily AI Insight for the Blog page.
//
// Runs server-side on Netlify so the OpenRouter API key never reaches the browser.
// One insight is generated per UTC day and cached on Netlify's durable CDN cache,
// so visitors get an instant response and we pay for ~1 generation per day.
//
// Required env var (Netlify > Site configuration > Environment variables, scope: Functions):
//   OPENROUTER_API_KEY   your OpenRouter key
// Optional:
//   OPENROUTER_MODEL     defaults to "z-ai/glm-5.3-flash"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "z-ai/glm-5.3-flash";

// Netlify synchronous functions are hard-limited to 60s; stay well inside it.
const TOTAL_BUDGET_MS = 50_000;
const MIN_RETRY_BUDGET_MS = 20_000;

const TOPICS = [
  "OpenAI GPT-4o",
  "Google Gemini 1.5 Pro",
  "Anthropic Claude 3.5 Sonnet",
  "Meta Llama 3.1",
  "Midjourney v6",
  "OpenAI Sora",
  "GitHub Copilot Workspace",
  "Mistral Large 2",
  "Perplexity Pro",
  "Stable Diffusion 3 Medium",
];

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

// Variant 0 is the day's featured model; the refresh button walks through the others.
// Variants are capped at TOPICS.length, so at most that many paid generations per day.
const topicFor = (now: Date, variant: number) => {
  const dayIndex = Math.floor(now.getTime() / 86_400_000);
  return TOPICS[(dayIndex + variant) % TOPICS.length];
};

// Returns the requested variant, or null if the query string is anything other than ?v=<0..N-1>.
const parseVariant = (url: URL): number | null => {
  const keys = [...url.searchParams.keys()];
  if (keys.length === 0) return url.search ? null : 0;
  if (keys.length !== 1 || keys[0] !== "v") return null;
  const raw = url.searchParams.get("v") ?? "";
  if (!/^(0|[1-9]\d?)$/.test(raw)) return null; // no "01"-style aliases of the same variant
  const variant = Number(raw);
  return variant < TOPICS.length ? variant : null;
};

const secondsUntilNextUtcMidnight = (now: Date) => {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(60, Math.floor((next - now.getTime()) / 1000));
};

const buildPrompt = (topic: string) => `Write a tech spotlight review on the AI model or tool "${topic}" as today's featured tool.

Use exactly this structure and Markdown, with no title and no intro or outro text:

## What is it?
One sentence technical definition.

## Key Features
- Feature one
- Feature two
- Feature three

## Best Work Use Cases
- Use case one
- Use case two
- Use case three

Tone: professional, educational and specific, like a knowledgeable tech YouTuber. Maximum 220 words.
Only state facts you are confident about. Do not invent prices, benchmark numbers or release dates.`;

const cleanContent = (raw: string) =>
  raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^```(?:markdown|md)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

const callOpenRouter = async (apiKey: string, model: string, topic: string, timeoutMs: number) => {
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
        { role: "user", content: buildPrompt(topic) },
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
  const topic = topicFor(now, variant);
  const deadline = Date.now() + TOTAL_BUDGET_MS;

  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const remaining = deadline - Date.now();
    if (attempt > 1 && remaining < MIN_RETRY_BUDGET_MS) break;
    try {
      const content = await callOpenRouter(apiKey, model, topic, remaining);
      return {
        date: utcDateKey(now),
        variant,
        variants: TOPICS.length,
        topic,
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
  // so only ?v=<0..N-1> is accepted.
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
