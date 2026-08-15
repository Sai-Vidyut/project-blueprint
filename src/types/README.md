# `types`

Pure TypeScript types for the app — no runtime code, no Zod import at the value level (types only). The `Blueprint` type is re-exported here from `src/lib/schemas/blueprint.ts`, where it's inferred from the Zod schema.

Import from `@/types/*` in components and UI code that only needs the shape. Import from `@/lib/schemas/*` when you need to validate data at runtime (API routes, AI provider output).
