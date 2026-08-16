import type { OpenRouterAttemptModel } from "@/lib/ai/openrouter-catalog";
import type { AIProviderError } from "@/lib/ai/types";

const COOLDOWN_MS = 10 * 60 * 1000;
const CONSECUTIVE_FAILURE_LIMIT = 3;
export const MAX_OPENROUTER_ATTEMPTS = 3;

type UnhealthyEntry = {
  failedUntil: number;
  consecutiveFailures: number;
};

type KnownGoodEntry = {
  lastSuccessAt: number;
  successCount: number;
  consecutiveFailures: number;
};

/**
 * Process-local registries. Survive across requests in the same Node.js
 * process. Reset on restart/deploy — that is intentional.
 */
const unhealthyModels = new Map<string, UnhealthyEntry>();
const knownGoodModels = new Map<string, KnownGoodEntry>();

export function isKnownGoodModel(modelId: string): boolean {
  return knownGoodModels.has(modelId);
}

export function recordOpenRouterSuccess(modelId: string, now = Date.now()): void {
  unhealthyModels.delete(modelId);

  const previous = knownGoodModels.get(modelId);
  knownGoodModels.set(modelId, {
    lastSuccessAt: now,
    successCount: (previous?.successCount ?? 0) + 1,
    consecutiveFailures: 0,
  });

  console.log(`[openrouter] Model marked good: ${modelId}`);
}

export function recordOpenRouterTransientFailure(
  modelId: string,
  now = Date.now(),
): void {
  const knownGood = knownGoodModels.get(modelId);
  const previousUnhealthy = unhealthyModels.get(modelId);
  const consecutiveFailures =
    (knownGood?.consecutiveFailures ?? previousUnhealthy?.consecutiveFailures ?? 0) +
    1;
  const failedUntil = now + COOLDOWN_MS;

  unhealthyModels.set(modelId, { failedUntil, consecutiveFailures });
  console.log(`[openrouter] Model marked unhealthy: ${modelId} (cooldown 10m)`);

  if (!knownGood) {
    return;
  }

  if (consecutiveFailures >= CONSECUTIVE_FAILURE_LIMIT) {
    knownGoodModels.delete(modelId);
    console.log(
      `[openrouter] Model removed from known-good list after repeated failures: ${modelId}`,
    );
    return;
  }

  knownGoodModels.set(modelId, {
    ...knownGood,
    consecutiveFailures,
  });
}

/**
 * OpenRouter *model* health only. HTTP 402 / `payment_required` is an
 * account-access condition, not a model failure — never cooldown a model
 * for billing/quota.
 */
export function isTransientOpenRouterFailure(error: AIProviderError): boolean {
  if (
    error.kind === "invalid_json" ||
    error.kind === "invalid_shape" ||
    error.kind === "empty_response" ||
    error.kind === "bad_request" ||
    error.kind === "payment_required" ||
    error.kind === "config"
  ) {
    return false;
  }

  if (
    error.statusCode === 401 ||
    error.statusCode === 402 ||
    error.statusCode === 403
  ) {
    return false;
  }

  if (
    error.statusCode === 404 ||
    error.statusCode === 408 ||
    error.statusCode === 429 ||
    error.statusCode === 500 ||
    error.statusCode === 502 ||
    error.statusCode === 503 ||
    error.statusCode === 504
  ) {
    return true;
  }

  return (
    error.kind === "rate_limited" ||
    error.kind === "unavailable" ||
    error.kind === "timeout" ||
    error.kind === "network" ||
    error.kind === "server_error"
  );
}

/**
 * Build the per-request attempt list (max 3).
 *
 * Order:
 * 1. Explicit OPENROUTER_MODEL if set and not cooling down
 * 2. Healthy known-good models (successCount, then recency, then catalog order)
 * 3. Healthy unknown models in catalog rank order, with author diversity
 *
 * If every free model is cooling down, return exactly one model: the one
 * whose cooldown expires soonest.
 */
export function selectOpenRouterAttempts(args: {
  ranked: OpenRouterAttemptModel[];
  byId: Map<string, OpenRouterAttemptModel>;
  preferredModel?: string;
  now?: number;
}): OpenRouterAttemptModel[] {
  const now = args.now ?? Date.now();
  const preferredModel = args.preferredModel?.trim();
  const attempts: OpenRouterAttemptModel[] = [];

  logKnownGoodModels();

  if (preferredModel) {
    if (isCoolingDown(preferredModel, now)) {
      logSkip(preferredModel);
    } else {
      attempts.push(lookupOrStub(preferredModel, args.byId));
    }
  }

  const good: OpenRouterAttemptModel[] = [];
  const unknown: OpenRouterAttemptModel[] = [];
  const cooling: Array<{ model: OpenRouterAttemptModel; failedUntil: number }> =
    [];

  for (const model of args.ranked) {
    if (attempts.some((attempt) => attempt.id === model.id)) {
      continue;
    }

    if (isCoolingDown(model.id, now)) {
      logSkip(model.id);
      cooling.push({
        model,
        failedUntil: unhealthyModels.get(model.id)?.failedUntil ?? now,
      });
      continue;
    }

    if (knownGoodModels.has(model.id)) {
      good.push(model);
    } else {
      unknown.push(model);
    }
  }

  good.sort((left, right) => compareKnownGood(left.id, right.id));

  for (const model of good) {
    if (attempts.length >= MAX_OPENROUTER_ATTEMPTS) {
      break;
    }

    attempts.push(model);
  }

  for (const model of pickDiverseModels(
    unknown,
    MAX_OPENROUTER_ATTEMPTS,
    attempts.map((attempt) => attempt.id),
  )) {
    if (attempts.length >= MAX_OPENROUTER_ATTEMPTS) {
      break;
    }

    attempts.push(model);
  }

  if (attempts.length > 0) {
    return attempts.slice(0, MAX_OPENROUTER_ATTEMPTS);
  }

  const cooldownPool = [...cooling];

  if (preferredModel && isCoolingDown(preferredModel, now)) {
    const preferred = lookupOrStub(preferredModel, args.byId);
    if (!cooldownPool.some((entry) => entry.model.id === preferred.id)) {
      cooldownPool.push({
        model: preferred,
        failedUntil: unhealthyModels.get(preferredModel)?.failedUntil ?? now,
      });
    }
  }

  if (cooldownPool.length === 0) {
    return [];
  }

  cooldownPool.sort((left, right) => left.failedUntil - right.failedUntil);
  const earliest = cooldownPool[0];

  console.log("[openrouter] All free models are currently cooling down");
  console.log(
    `[openrouter] Earliest available model: ${earliest.model.id} at ${new Date(earliest.failedUntil).toISOString()}`,
  );

  return [earliest.model];
}

function compareKnownGood(leftId: string, rightId: string): number {
  const left = knownGoodModels.get(leftId);
  const right = knownGoodModels.get(rightId);

  const successDelta = (right?.successCount ?? 0) - (left?.successCount ?? 0);
  if (successDelta !== 0) {
    return successDelta;
  }

  return (right?.lastSuccessAt ?? 0) - (left?.lastSuccessAt ?? 0);
}

function isCoolingDown(modelId: string, now: number): boolean {
  const entry = unhealthyModels.get(modelId);
  return Boolean(entry && entry.failedUntil > now);
}

function logSkip(modelId: string): void {
  const until = unhealthyModels.get(modelId)?.failedUntil;
  console.log(
    `[openrouter] Skipping unhealthy model: ${modelId} (cooldown until ${until ? new Date(until).toISOString() : "unknown"})`,
  );
}

function logKnownGoodModels(): void {
  const ids = [...knownGoodModels.keys()];
  console.log(
    `[openrouter] Known-good models: ${ids.length > 0 ? ids.join(", ") : "(none)"}`,
  );
}

function lookupOrStub(
  modelId: string,
  byId: Map<string, OpenRouterAttemptModel>,
): OpenRouterAttemptModel {
  return (
    byId.get(modelId) ?? {
      id: modelId,
      supportsJsonSchema: false,
      supportsReasoning: false,
    }
  );
}

function pickDiverseModels(
  ranked: OpenRouterAttemptModel[],
  limit: number,
  alreadySelected: string[],
): OpenRouterAttemptModel[] {
  const picked: OpenRouterAttemptModel[] = [];
  const usedAuthors = new Set(
    alreadySelected.map((id) => id.split("/")[0] ?? id),
  );
  const selected = new Set(alreadySelected);

  for (const model of ranked) {
    if (picked.length + alreadySelected.length >= limit) {
      break;
    }

    if (selected.has(model.id)) {
      continue;
    }

    const author = model.id.split("/")[0] ?? model.id;
    if (usedAuthors.has(author)) {
      continue;
    }

    picked.push(model);
    selected.add(model.id);
    usedAuthors.add(author);
  }

  for (const model of ranked) {
    if (picked.length + alreadySelected.length >= limit) {
      break;
    }

    if (selected.has(model.id)) {
      continue;
    }

    picked.push(model);
    selected.add(model.id);
  }

  return picked;
}
