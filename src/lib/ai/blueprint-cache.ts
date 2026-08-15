import type { Blueprint } from "@/types/blueprint";

const CACHE_TTL_MS = 60 * 60 * 1000;

type CacheEntry = {
  blueprint: Blueprint;
  expiresAt: number;
};

/** Per-isolate Map. Empty after a serverless cold start; warm instances reuse it. */
const blueprintCache = new Map<string, CacheEntry>();

export function normalizeIdea(idea: string): string {
  return idea.trim().toLowerCase().replace(/\s+/g, " ");
}

export function getCachedBlueprint(idea: string): Blueprint | null {
  const key = normalizeIdea(idea);
  const entry = blueprintCache.get(key);

  if (!entry) {
    return null;
  }

  if (Date.now() >= entry.expiresAt) {
    blueprintCache.delete(key);
    return null;
  }

  return entry.blueprint;
}

export function setCachedBlueprint(idea: string, blueprint: Blueprint): void {
  blueprintCache.set(normalizeIdea(idea), {
    blueprint,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}
