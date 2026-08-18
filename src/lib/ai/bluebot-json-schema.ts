import { z } from "zod";

import { bluebotResponseSchema } from "@/lib/schemas/bluebot";

/**
 * OpenAPI-3.0 JSON Schema for BlueBot structured output. Zod `safeParse()`
 * remains the source of truth after generation.
 */
export const BLUEBOT_JSON_SCHEMA = z.toJSONSchema(bluebotResponseSchema, {
  target: "openapi-3.0",
});
