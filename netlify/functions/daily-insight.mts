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

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
const DEFAULT_MODEL = "z-ai/glm-5.3-flash";

// Netlify synchronous functions are hard-limited to 60s; stay well inside it.
const TOTAL_BUDGET_MS = 50_000;
const MIN_RETRY_BUDGET_MS = 20_000;
const CATALOG_TIMEOUT_MS = 10_000;
const CATALOG_TTL_MS = 60 * 60 * 1000;

// Well-known model families, in rotation order. Each day features the newest
// text model from one family; the refresh button steps through the rest.
const FAMOUS_PROVIDERS = [
  "openai",
  "anthropic",
  "google",
  "deepseek",
  "qwen",
  "z-ai",
  "x-ai",
  "moonshotai",
  "minimax",
  "perplexity",
  "mistralai",
  "meta-llama",
];
// Skip families with nothing new in the last year, and non-chat / experimental variants.
const MAX_MODEL_AGE_DAYS = 365;
const EXCLUDED_MODEL = /guard|embed|moderation|-exp|image|audio|tts|transcri|realtime/i;

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
].map((name) => ({ name, facts: null }));

type CatalogModel = {
  id: string;
  name: string;
  created: number;
  description?: string;
  context_length?: number;
  architecture?: { input_modalities?: string[]; output_modalities?: string[] };
  pricing?: { prompt?: string; completion?: string };
  supported_parameters?: string[];
  benchmarks?: { artificial_analysis?: Record<string, number | undefined> };
};

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
let catalog: { topics: Topic[]; fetchedAt: number } | null = null;

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

const formatTokens = (n: number) =>
  n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}K` : String(n);

const formatPrice = (perToken?: string) => {
  const perMillion = Number(perToken) * 1_000_000;
  return Number.isFinite(perMillion) && perMillion > 0 ? `$${perMillion.toFixed(2)}` : null;
};

// OpenRouter truncates descriptions with "..."; keep only complete sentences.
const cleanDescription = (text = "") => {
  const trimmed = text.trim();
  if (!trimmed.endsWith("...")) return trimmed;
  const complete = trimmed.slice(0, -3).match(/^[\s\S]*[.!?](?=\s)/);
  return complete ? complete[0] : "";
};

// Verified facts handed to the writer, so it never has to guess about models newer than its training data.
const buildFacts = (m: CatalogModel) => {
  const params = new Set(m.supported_parameters ?? []);
  const capabilities = [
    params.has("tools") && "tool / function calling",
    (params.has("structured_outputs") || params.has("response_format")) && "structured JSON output",
    params.has("reasoning") && "built-in reasoning (thinking) mode",
  ].filter(Boolean);
  const input = formatPrice(m.pricing?.prompt);
  const output = formatPrice(m.pricing?.completion);
  const aa = m.benchmarks?.artificial_analysis;
  const indices = aa
    ? [
        aa.intelligence_index != null && `intelligence ${aa.intelligence_index}`,
        aa.coding_index != null && `coding ${aa.coding_index}`,
        aa.agentic_index != null && `agentic ${aa.agentic_index}`,
      ].filter(Boolean)
    : [];
  const summary = cleanDescription(m.description);

  return [
    `- Model: ${m.name} (API id: ${m.id})`,
    `- Available on OpenRouter since: ${new Date(m.created * 1000).toISOString().slice(0, 10)}`,
    summary && `- Official summary: ${summary}`,
    m.context_length && `- Context window: ${formatTokens(m.context_length)} tokens`,
    m.architecture?.input_modalities?.length && `- Accepts: ${m.architecture.input_modalities.join(", ")}`,
    capabilities.length > 0 && `- Capabilities: ${capabilities.join(", ")}`,
    input && output && `- API price on OpenRouter: ${input} per 1M input tokens, ${output} per 1M output tokens`,
    indices.length > 0 && `- Artificial Analysis index scores: ${indices.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");
};

// Newest chat model from each well-known family, straight from the live OpenRouter catalog.
const pickLatestModels = (models: CatalogModel[], now: Date): Topic[] => {
  const minCreated = now.getTime() / 1000 - MAX_MODEL_AGE_DAYS * 86_400;
  const topics: Topic[] = [];
  for (const provider of FAMOUS_PROVIDERS) {
    const candidates = models
      .filter(
        (m) =>
          typeof m?.id === "string" &&
          m.id.startsWith(`${provider}/`) &&
          !m.id.includes(":") &&
          !EXCLUDED_MODEL.test(m.id) &&
          typeof m.created === "number" &&
          m.created >= minCreated &&
          (m.architecture?.output_modalities ?? ["text"]).join() === "text",
      )
      .sort((a, b) => b.created - a.created);
    if (candidates.length === 0) continue;
    // Models launched together (e.g. "GPT-X" and "GPT-X Pro"): feature the base one.
    const launch = candidates.filter((m) => candidates[0].created - m.created < 2 * 86_400);
    const latest = launch.sort((a, b) => a.id.length - b.id.length)[0];
    topics.push({ name: latest.name || latest.id, facts: buildFacts(latest) });
  }
  return topics;
};

const loadTopics = async (now: Date): Promise<Topic[]> => {
  if (catalog && Date.now() - catalog.fetchedAt < CATALOG_TTL_MS) return catalog.topics;
  try {
    const response = await fetch(OPENROUTER_MODELS_URL, { signal: AbortSignal.timeout(CATALOG_TIMEOUT_MS) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const topics = pickLatestModels(Array.isArray(data?.data) ? data.data : [], now);
    if (topics.length < 3) throw new Error(`only ${topics.length} models matched`);
    catalog = { topics, fetchedAt: Date.now() };
    return topics;
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
    ? `Base the review ONLY on these verified facts from the OpenRouter model catalog (today is ${today}).
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
Tone: professional, educational and specific, like a knowledgeable tech YouTuber.`;
};

const cleanContent = (raw: string) =>
  raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^```(?:markdown|md)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

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
