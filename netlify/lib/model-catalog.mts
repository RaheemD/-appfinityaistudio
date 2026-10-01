// Live list of the newest models from well-known AI families, read from OpenRouter's
// public model catalog (no API key needed). Shared by the daily-insight and chat functions.

const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
const CATALOG_TIMEOUT_MS = 10_000;
const CATALOG_TTL_MS = 60 * 60 * 1000;

// Well-known model families, in rotation order.
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

export type CatalogModel = {
  id: string;
  name: string;
  created: number;
  description?: string;
  context_length?: number;
  architecture?: { input_modalities?: string[]; output_modalities?: string[] };
  supported_parameters?: string[];
};

let cache: { models: CatalogModel[]; fetchedAt: number } | null = null;

// Catalog names look like "Brand: Model". Drop the brand when the model name already
// starts with it ("DeepSeek: DeepSeek V4.1" -> "DeepSeek V4.1"), else join them ("OpenAI GPT-6.1 Sol").
export function displayName(name: string) {
  const sep = name.indexOf(": ");
  if (sep < 0) return name;
  const brand = name.slice(0, sep).trim();
  const model = name.slice(sep + 2).trim();
  return model.toLowerCase().startsWith(brand.toLowerCase()) ? model : `${brand} ${model}`;
}

export const formatTokens = (n: number) =>
  n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}K` : String(n);

// OpenRouter truncates descriptions with "..."; keep only complete sentences.
export const cleanDescription = (text = "") => {
  const trimmed = text.trim();
  if (!trimmed.endsWith("...")) return trimmed;
  const complete = trimmed.slice(0, -3).match(/^[\s\S]*[.!?](?=\s)/);
  return complete ? complete[0] : "";
};

export const releasedLabel = (m: CatalogModel) =>
  new Date(m.created * 1000).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

// Newest chat model from each well-known family.
export const pickLatestModels = (models: CatalogModel[], now: Date): CatalogModel[] => {
  const minCreated = now.getTime() / 1000 - MAX_MODEL_AGE_DAYS * 86_400;
  const picked: CatalogModel[] = [];
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
    picked.push(launch.sort((a, b) => a.id.length - b.id.length)[0]);
  }
  return picked;
};

// Throws if the catalog can't be loaded or looks wrong; callers decide on a fallback.
export const loadLatestModels = async (now: Date): Promise<CatalogModel[]> => {
  if (cache && Date.now() - cache.fetchedAt < CATALOG_TTL_MS) return cache.models;
  const response = await fetch(OPENROUTER_MODELS_URL, { signal: AbortSignal.timeout(CATALOG_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`model catalog HTTP ${response.status}`);
  const data = await response.json();
  const models = pickLatestModels(Array.isArray(data?.data) ? data.data : [], now);
  if (models.length < 3) throw new Error(`model catalog: only ${models.length} models matched`);
  cache = { models, fetchedAt: Date.now() };
  return models;
};
