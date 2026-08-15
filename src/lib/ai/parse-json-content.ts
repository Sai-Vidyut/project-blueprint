import { AIProviderError } from "@/lib/ai/types";

const JSON_FENCE_PATTERN = /```(?:json)?\s*([\s\S]*?)```/i;

/**
 * Parse JSON from a model response. Handles raw JSON and fenced code blocks.
 */
export function parseJsonFromModelContent(content: string): unknown {
  const trimmed = content.trim();

  if (!trimmed) {
    throw new AIProviderError("Model returned an empty response.");
  }

  const candidates = [trimmed];

  const fencedMatch = trimmed.match(JSON_FENCE_PATTERN);
  if (fencedMatch?.[1]) {
    candidates.unshift(fencedMatch[1].trim());
  }

  const objectStart = trimmed.indexOf("{");
  const objectEnd = trimmed.lastIndexOf("}");
  if (objectStart !== -1 && objectEnd > objectStart) {
    candidates.push(trimmed.slice(objectStart, objectEnd + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try next candidate
    }
  }

  throw new AIProviderError("Model response was not valid JSON.");
}
