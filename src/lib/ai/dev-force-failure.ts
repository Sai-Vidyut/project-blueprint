/**
 * Development-only failure injection. Never active in production, even if
 * the corresponding FORCE_* env var is set.
 */
export function isDevForceFailure(
  flag:
    | "FORCE_GEMINI_FAILURE"
    | "FORCE_CEREBRAS_FAILURE"
    | "FORCE_GROQ_FAILURE"
    | "FORCE_HF_FAILURE",
): boolean {
  return process.env.NODE_ENV === "development" && process.env[flag] === "true";
}
