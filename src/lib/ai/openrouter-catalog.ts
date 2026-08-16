import { AIProviderError } from "@/lib/ai/types";
import { selectOpenRouterAttempts } from "@/lib/ai/openrouter-health";

const CATALOG_TTL_MS = 15 * 60 * 1000;
const CATALOG_TIMEOUT_MS = 10_000;
const CATALOG_LIMIT = 1000;
const MIN_CONTEXT_LENGTH = 8_192;
const MIN_COMPLETION_TOKENS = 2_048;

export type OpenRouterAttemptModel = {
  id: string;
  supportsJsonSchema: boolean;
  supportsReasoning: boolean;
  maxCompletionTokens?: number;
};

type OpenRouterCatalogModel = {
  id?: unknown;
  name?: unknown;
  description?: unknown;
  context_length?: unknown;
  architecture?: {
    instruct_type?: unknown;
    modality?: unknown;
    input_modalities?: unknown;
    output_modalities?: unknown;
  };
  pricing?: {
    prompt?: unknown;
    completion?: unknown;
    request?: unknown;
  };
  supported_parameters?: unknown;
  top_provider?: {
    context_length?: unknown;
    max_completion_tokens?: unknown;
  };
};

type CachedCatalog = {
  ranked: OpenRouterAttemptModel[];
  byId: Map<string, OpenRouterAttemptModel>;
  eligibleCount: number;
  expiresAt: number;
};

const catalogCache = new Map<string, CachedCatalog>();

/**
 * Discover currently available zero-cost OpenRouter chat models, rank them
 * for blueprint JSON generation, then ask the health registry to pick up
 * to three attempts (known-good first, skip cooldown, catalog rank second).
 *
 * `preferredModel` (from `OPENROUTER_MODEL`) is tried first when set — even
 * if it is paid — then remaining slots are filled from the free catalog.
 * Paid models are never selected from the catalog automatically.
 */
export async function resolveOpenRouterAttempts(args: {
  apiKey: string;
  baseUrl: string;
  preferredModel?: string;
}): Promise<OpenRouterAttemptModel[]> {
  const preferredModel = args.preferredModel?.trim();
  let catalog: CachedCatalog | null = null;

  try {
    catalog = await getFreeModelCatalog(args.baseUrl, args.apiKey);
  } catch (error) {
    if (preferredModel) {
      console.warn(
        "[openrouter] Model catalog unavailable; using OPENROUTER_MODEL only.",
      );
      const stub: OpenRouterAttemptModel = {
        id: preferredModel,
        supportsJsonSchema: false,
        supportsReasoning: false,
      };
      return selectOpenRouterAttempts({
        ranked: [stub],
        byId: new Map([[preferredModel, stub]]),
        preferredModel,
      });
    }

    if (error instanceof AIProviderError) {
      throw error;
    }

    throw new AIProviderError(
      "Failed to discover OpenRouter models.",
      error,
      "network",
      undefined,
      "openrouter",
    );
  }

  console.log(
    `[openrouter] Found ${catalog.eligibleCount} eligible free models`,
  );

  const attempts = selectOpenRouterAttempts({
    ranked: catalog.ranked,
    byId: catalog.byId,
    preferredModel,
  });

  if (attempts.length === 0) {
    throw new AIProviderError(
      "No free OpenRouter models are currently available.",
      undefined,
      "unavailable",
      undefined,
      "openrouter",
    );
  }

  return attempts;
}

async function getFreeModelCatalog(
  baseUrl: string,
  apiKey: string,
): Promise<CachedCatalog> {
  const cacheKey = baseUrl.replace(/\/$/, "");
  const cached = catalogCache.get(cacheKey);

  if (cached && Date.now() < cached.expiresAt) {
    return cached;
  }

  console.log("[openrouter] Discovering free models");

  const url = `${cacheKey}/models?limit=${CATALOG_LIMIT}&modality=text`;
  let response: Response;

  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(CATALOG_TIMEOUT_MS),
    });
  } catch (error) {
    throw new AIProviderError(
      "Failed to discover OpenRouter models.",
      error,
      isTimeoutError(error) ? "timeout" : "network",
      undefined,
      "openrouter",
    );
  }

  if (!response.ok) {
    throw new AIProviderError(
      `OpenRouter models catalog rejected the request (${response.status} ${response.statusText})`,
      undefined,
      response.status >= 500 ? "server_error" : "unavailable",
      response.status,
      "openrouter",
    );
  }

  let payload: { data?: unknown };

  try {
    payload = (await response.json()) as { data?: unknown };
  } catch (error) {
    throw new AIProviderError(
      "OpenRouter models catalog returned an unreadable response.",
      error,
      "invalid_json",
      response.status,
      "openrouter",
    );
  }

  const rawModels = Array.isArray(payload.data) ? payload.data : [];
  const catalogModels = rawModels.filter(isCatalogModel);
  const byId = new Map<string, OpenRouterAttemptModel>();

  for (const model of catalogModels) {
    if (!isTextChatModel(model)) {
      continue;
    }

    const attempt = toAttemptModel(model);
    byId.set(attempt.id, stripRank(attempt));
  }

  const freeModels = catalogModels
    .filter(isZeroCost)
    .filter(isTextChatModel)
    .filter(meetsCapacityMinimums)
    .map(toAttemptModel)
    .sort((left, right) => right.score - left.score);

  const ranked = freeModels.map(stripRank);

  const entry: CachedCatalog = {
    ranked,
    byId,
    eligibleCount: ranked.length,
    expiresAt: Date.now() + CATALOG_TTL_MS,
  };

  catalogCache.set(cacheKey, entry);
  return entry;
}

function isCatalogModel(value: unknown): value is OpenRouterCatalogModel {
  return typeof value === "object" && value !== null && "id" in value;
}

function isZeroCost(model: OpenRouterCatalogModel): boolean {
  const prompt = Number(model.pricing?.prompt ?? NaN);
  const completion = Number(model.pricing?.completion ?? NaN);
  const request = Number(model.pricing?.request ?? 0);

  return prompt === 0 && completion === 0 && request === 0;
}

function isTextChatModel(model: OpenRouterCatalogModel): boolean {
  if (typeof model.id !== "string" || !model.id.trim()) {
    return false;
  }

  const outputs = asStringArray(model.architecture?.output_modalities);
  const inputs = asStringArray(model.architecture?.input_modalities);
  const modality = String(model.architecture?.modality ?? "text->text");

  if (outputs.length > 0 && !outputs.includes("text")) {
    return false;
  }

  if (inputs.length > 0 && !inputs.includes("text")) {
    return false;
  }

  if (/embed/i.test(modality) || /image->/i.test(modality)) {
    return false;
  }

  return true;
}

function meetsCapacityMinimums(model: OpenRouterCatalogModel): boolean {
  const context = numeric(
    model.top_provider?.context_length ?? model.context_length,
  );

  if (context !== undefined && context < MIN_CONTEXT_LENGTH) {
    return false;
  }

  const maxCompletion = numeric(model.top_provider?.max_completion_tokens);

  if (maxCompletion !== undefined && maxCompletion < MIN_COMPLETION_TOKENS) {
    return false;
  }

  return true;
}

function toAttemptModel(model: OpenRouterCatalogModel): OpenRouterAttemptModel & {
  score: number;
  author: string;
} {
  const id = String(model.id);
  const params = asStringArray(model.supported_parameters);
  const supportsJsonSchema =
    params.includes("json_schema") || params.includes("structured_outputs");
  const supportsResponseFormat =
    supportsJsonSchema || params.includes("response_format");
  const supportsReasoning = params.includes("reasoning");
  const context = numeric(
    model.top_provider?.context_length ?? model.context_length,
  ) ?? 0;
  const maxCompletionTokens = numeric(model.top_provider?.max_completion_tokens);
  const instructType = model.architecture?.instruct_type;
  const haystack = `${id} ${String(model.name ?? "")} ${String(model.description ?? "")}`.toLowerCase();

  let score = 0;

  if (supportsJsonSchema) {
    score += 100;
  } else if (supportsResponseFormat) {
    score += 60;
  }

  if (typeof instructType === "string" && instructType.trim()) {
    score += 15;
  }

  score += Math.min(context / 1_000, 128);

  if (maxCompletionTokens !== undefined) {
    if (maxCompletionTokens >= 4_096) {
      score += 20;
    } else if (maxCompletionTokens >= 2_048) {
      score += 10;
    }
  }

  if (/\b(code|coder|coding|instruct|chat)\b/.test(haystack)) {
    score += 10;
  }

  if (/\b(nsfw|uncensored|embed|tts|whisper|moderation)\b/.test(haystack)) {
    score -= 40;
  }

  return {
    id,
    supportsJsonSchema,
    supportsReasoning,
    maxCompletionTokens,
    score,
    author: id.split("/")[0] ?? id,
  };
}

function stripRank(
  model: OpenRouterAttemptModel & { score: number; author: string },
): OpenRouterAttemptModel {
  return {
    id: model.id,
    supportsJsonSchema: model.supportsJsonSchema,
    supportsReasoning: model.supportsReasoning,
    maxCompletionTokens: model.maxCompletionTokens,
  };
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

function numeric(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function isTimeoutError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "TimeoutError" ||
      error.name === "AbortError" ||
      /timeout|aborted/i.test(error.message))
  );
}
