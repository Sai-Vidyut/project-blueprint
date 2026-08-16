import { z } from "zod";

import { blueprintSchema } from "@/lib/schemas/blueprint";

/**
 * Shared OpenAPI-3.0 JSON Schema derived from `blueprintSchema`. Used by
 * providers that support structured JSON output. Zod `safeParse()` remains
 * the source of truth after generation.
 */
export const BLUEPRINT_JSON_SCHEMA = z.toJSONSchema(blueprintSchema, {
  target: "openapi-3.0",
});
