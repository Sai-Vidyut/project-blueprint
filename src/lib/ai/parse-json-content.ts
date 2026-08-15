import { AIProviderError } from "@/lib/ai/types";

const JSON_FENCE_PATTERN = /```(?:json)?\s*([\s\S]*?)```/i;

/**
 * Parse JSON from a model response. Tolerates explanatory text before/after
 * the JSON object and fenced code blocks.
 */
export function parseJsonFromModelContent(content: string): unknown {
  const trimmed = content.trim();

  if (!trimmed) {
    throw new AIProviderError("Model returned an empty response.");
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
  throw new AIProviderError("Model response was not valid JSON.");
}

function collectJsonCandidates(trimmed: string): string[] {
  const candidates: string[] = [trimmed];

  const fencedMatch = trimmed.match(JSON_FENCE_PATTERN);
  if (fencedMatch?.[1]) {
    candidates.unshift(fencedMatch[1].trim());
  }

  const objectStart = trimmed.indexOf("{");
  const objectEnd = trimmed.lastIndexOf("}");
  if (objectStart !== -1 && objectEnd > objectStart) {
    candidates.push(trimmed.slice(objectStart, objectEnd + 1));
  }

  return [...new Set(candidates.filter(Boolean))];
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
