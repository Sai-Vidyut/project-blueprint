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
  blueprint: import("@/types/blueprint").Blueprint;
  messages: import("@/lib/schemas/bluebot").BluebotMessage[];
  userMessage: string;
}): Promise<BluebotResponse> {
  const response = await fetch("/api/blueprint/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const parsedError = bluebotApiErrorSchema.safeParse(data);
    const code = parsedError.success ? parsedError.data.error : undefined;

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
