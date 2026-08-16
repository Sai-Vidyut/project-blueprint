import { AIProviderError } from "@/lib/ai/types";

const JSON_FENCE_PATTERN = /```(?:json)?\s*([\s\S]*?)```/i;
const BLUEPRINT_OBJECT_PATTERN = /\{\s*"projectSummary"/g;

/**
 * Parse JSON from a model response. Tolerates thinking traces, prose, and
 * fenced code blocks by extracting the Blueprint object itself.
 */
export function parseJsonFromModelContent(content: string): unknown {
  const trimmed = content.trim();

  if (!trimmed) {
    throw new AIProviderError(
      "Model returned an empty response.",
      undefined,
      "invalid_json",
    );
  }

  const candidates = collectJsonCandidates(trimmed);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try next candidate
    }
  }

  logParseFailure(content, trimmed);
  throw new AIProviderError(
    "Model response was not valid JSON.",
    undefined,
    "invalid_json",
  );
}

function collectJsonCandidates(trimmed: string): string[] {
  const candidates: string[] = [];

  const fencedMatch = trimmed.match(JSON_FENCE_PATTERN);
  if (fencedMatch?.[1]) {
    candidates.push(fencedMatch[1].trim());
  }

  // Prefer the last Blueprint-shaped object — thinking traces often contain
  // earlier `{` characters or schema examples.
  const blueprintObjects = extractBlueprintObjects(trimmed);
  candidates.push(...blueprintObjects.reverse());

  candidates.push(trimmed);

  const objectStart = trimmed.indexOf("{");
  const objectEnd = trimmed.lastIndexOf("}");
  if (objectStart !== -1 && objectEnd > objectStart) {
    candidates.push(trimmed.slice(objectStart, objectEnd + 1));
  }

  return [...new Set(candidates.filter(Boolean))];
}

function extractBlueprintObjects(text: string): string[] {
  const objects: string[] = [];
  const pattern = new RegExp(BLUEPRINT_OBJECT_PATTERN.source, "g");
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

/** Walk from `start` and return the balanced `{...}` object, ignoring braces inside strings. */
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

function logParseFailure(content: string, trimmed: string) {
  const reasons = detectJsonIssues(trimmed);

  console.error("[blueprint] JSON parse failed:", reasons.join("; ") || "unknown issue");
  console.error("[blueprint] Content start:\n", content.slice(0, 500));
  console.error("[blueprint] Content end:\n", content.slice(-500));
  console.error("[blueprint] Brace/bracket counts:", {
    "{": countChar(trimmed, "{"),
    "}": countChar(trimmed, "}"),
    "[": countChar(trimmed, "["),
    "]": countChar(trimmed, "]"),
  });
}

function detectJsonIssues(trimmed: string): string[] {
  const reasons: string[] = [];
  const openBraces = countChar(trimmed, "{");
  const closeBraces = countChar(trimmed, "}");
  const openBrackets = countChar(trimmed, "[");
  const closeBrackets = countChar(trimmed, "]");

  if (/Here's a thinking process/i.test(trimmed) || /thinking process/i.test(trimmed)) {
    reasons.push("thinking trace before JSON");
  }

  if (/```/.test(trimmed)) {
    reasons.push("markdown fences present");
  }

  if (/,\s*[}\]]/.test(trimmed)) {
    reasons.push("trailing commas");
  }

  if (/[{,]\s*[A-Za-z_][A-Za-z0-9_]*\s*:/.test(trimmed)) {
    reasons.push("unquoted keys");
  }

  const looksTruncated =
    openBraces !== closeBraces ||
    openBrackets !== closeBrackets ||
    (openBraces > 0 && !trimmed.endsWith("}")) ||
    (trimmed.includes("```") && (trimmed.match(/```/g)?.length ?? 0) % 2 !== 0);

  if (looksTruncated) {
    reasons.push("truncated response (unbalanced braces/brackets or incomplete ending)");
  }

  if (openBraces === 0) {
    reasons.push("no JSON object found");
  }

  return reasons;
}

function countChar(value: string, char: string): number {
  let count = 0;

  for (const current of value) {
    if (current === char) {
      count += 1;
    }
  }

  return count;
}
