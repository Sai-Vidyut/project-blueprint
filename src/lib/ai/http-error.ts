import type { AIProviderErrorKind } from "@/lib/ai/types";

export function classifyHttpStatus(status: number): AIProviderErrorKind {
  if (status === 402) {
    return "payment_required";
  }

  if (status === 429) {
    return "rate_limited";
  }

  if (status === 404) {
    return "unavailable";
  }

  if (status === 408) {
    return "timeout";
  }

  if (status >= 500 && status < 600) {
    return "server_error";
  }

  if (status === 401 || status === 403) {
    return "config";
  }

  if (status >= 400 && status < 500) {
    return "bad_request";
  }

  return "unknown";
}

export function isAbortTimeoutError(error: unknown): boolean {
  if (error == null) {
    return false;
  }

  if (typeof DOMException !== "undefined" && error instanceof DOMException) {
    return (
      error.name === "TimeoutError" ||
      error.name === "AbortError" ||
      /timeout|timed out|aborted/i.test(error.message)
    );
  }

  if (error instanceof Error) {
    if (
      error.name === "TimeoutError" ||
      error.name === "AbortError" ||
      /timeout|timed out|aborted/i.test(error.message)
    ) {
      return true;
    }

    return error.cause !== undefined && error.cause !== error
      ? isAbortTimeoutError(error.cause)
      : false;
  }

  return /timeout|timed out|aborted/i.test(String(error));
}
