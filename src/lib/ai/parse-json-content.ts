import { AIProviderError } from "@/lib/ai/types";

/**
 * Parse JSON from a model response. Tolerates explanatory text before/after
 * the JSON object.
 */
export function parseJsonFromModelContent(content: string): unknown {
  const trimmed = content.trim();

  if (!trimmed) {
    throw new AIProviderError("Model returned an empty response.");
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through to brace extraction
  }

  const objectStart = trimmed.indexOf("{");
  const objectEnd = trimmed.lastIndexOf("}");

  if (objectStart !== -1 && objectEnd > objectStart) {
    const jsonSubstring = trimmed.slice(objectStart, objectEnd + 1);

    try {
      return JSON.parse(jsonSubstring);
    } catch {
      // fall through to error
    }
  }

  console.error("[blueprint] Failed to parse model content as JSON:", content);
  throw new AIProviderError("Model response was not valid JSON.");
}
