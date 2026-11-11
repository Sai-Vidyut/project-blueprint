import { AIProviderError } from "@/lib/ai/types";

const JSON_FENCE_PATTERN = /```(?:json)?\s*([\s\S]*?)```/i;
const BLUEBOT_RESPONSE_PATTERN = /\{\s*"message"\s*:/g;

function isBluebotResponseShape(value: unknown): value is Record<string, unknown> & {
  message: string;
  modifiesBlueprint: boolean;
} {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).message === "string" &&
    typeof (value as Record<string, unknown>).modifiesBlueprint === "boolean"
  );
}

/**
 * Parse JSON from a BlueBot model response. Unlike blueprint generation, BlueBot
 * wraps modifications in `{ message, modifiesBlueprint, blueprint?, changes? }`.
 * The shared blueprint parser must not prefer nested `projectSummary` objects.
 */
export function parseBluebotJsonFromModelContent(content: string): unknown {
  const trimmed = content.trim();

  if (!trimmed) {
    throw new AIProviderError(
      "Model returned an empty response.",
      undefined,
      "invalid_json",
    );
  }

  const candidates = collectBluebotJsonCandidates(trimmed);

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (isBluebotResponseShape(parsed)) {
        return parsed;
      }
    } catch {
      // try next candidate
    }
  }

  console.error("[bluebot] JSON parse failed: no valid BlueBot response object found");
  console.error("[bluebot] Content start:\n", content.slice(0, 500));
  console.error("[bluebot] Content end:\n", content.slice(-500));

  throw new AIProviderError(
    "Model response was not valid BlueBot JSON.",
    undefined,
    "invalid_json",
  );
}

function collectBluebotJsonCandidates(trimmed: string): string[] {
  const candidates: string[] = [];

  const fencedMatch = trimmed.match(JSON_FENCE_PATTERN);
  if (fencedMatch?.[1]) {
    candidates.push(fencedMatch[1].trim());
  }

  const bluebotObjects = extractBluebotResponseObjects(trimmed);
  candidates.push(...bluebotObjects.reverse());

  candidates.push(trimmed);

  const objectStart = trimmed.indexOf("{");
  const objectEnd = trimmed.lastIndexOf("}");
  if (objectStart !== -1 && objectEnd > objectStart) {
    candidates.push(trimmed.slice(objectStart, objectEnd + 1));
  }

  return [...new Set(candidates.filter(Boolean))];
}

function extractBluebotResponseObjects(text: string): string[] {
  const objects: string[] = [];
  const pattern = new RegExp(BLUEBOT_RESPONSE_PATTERN.source, "g");
  let match = pattern.exec(text);

  while (match) {
    const extracted = extractBalancedObject(text, match.index);
    if (extracted) {
      objects.push(extracted);
    }
    match = pattern.exec(text);
  }

  return objects;
}

function extractBalancedObject(text: string, start: number): string | null {
  if (text[start] !== "{") {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }

  return null;
}
