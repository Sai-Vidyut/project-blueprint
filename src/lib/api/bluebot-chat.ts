import { AI_SERVICE_UNAVAILABLE } from "@/lib/ai/types";
import {
  bluebotApiErrorSchema,
  bluebotChatRequestSchema,
  bluebotResponseSchema,
} from "@/lib/schemas/bluebot";
import type { BluebotResponse } from "@/lib/schemas/bluebot";

export class BluebotServiceUnavailableError extends Error {
  readonly code = AI_SERVICE_UNAVAILABLE;

  constructor() {
    super("AI service unavailable.");
    this.name = "BluebotServiceUnavailableError";
  }
}

export async function sendBluebotMessage(args: {
  blueprint?: import("@/types/blueprint").Blueprint;
  idea?: string;
  messages: import("@/lib/schemas/bluebot").BluebotMessage[];
  userMessage: string;
}): Promise<BluebotResponse> {
  const payload = {
    messages: args.messages,
    userMessage: args.userMessage,
    ...(args.blueprint ? { blueprint: args.blueprint } : {}),
    ...(args.idea?.trim() ? { idea: args.idea.trim() } : {}),
  };

  const response = await fetch("/api/blueprint/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const parsedError = bluebotApiErrorSchema.safeParse(data);
    const code = parsedError.success ? parsedError.data.error : undefined;

    if (process.env.NODE_ENV === "development" && parsedError.success) {
      console.error("[bluebot] API error", {
        status: response.status,
        error: parsedError.data.error,
        kind: parsedError.data.kind,
        provider: parsedError.data.provider,
        stage: parsedError.data.stage,
        issues: parsedError.data.issues,
      });
    }

    if (response.status === 503 && code === AI_SERVICE_UNAVAILABLE) {
      throw new BluebotServiceUnavailableError();
    }

    const message = parsedError.success
      ? parsedError.data.error
      : "BlueBot could not complete your request.";
    throw new Error(message);
  }

  const parsed = bluebotResponseSchema.safeParse(data);

  if (!parsed.success) {
    throw new Error("The server returned an invalid BlueBot response.");
  }

  return parsed.data;
}

export { bluebotChatRequestSchema };
