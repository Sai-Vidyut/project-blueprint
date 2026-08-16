# Decisions

## D1 — Next.js App Router as the whole product

**Choice:** One Next.js 16 app for UI and `POST /api/blueprint`.

**Tradeoff:** Less isolation than a separate API. Faster for a solo 7–10 day MVP; API keys stay off the client.

**Rejected:** Separate FastAPI/Express service (two deploys, extra latency). Pure SPA + client-side model calls (exposes the key).

## D2 — No database and no project storage

**Choice:** Blueprint lives in React state for the session only.

**Tradeoff:** Refresh loses work. Matches the MVP constraint and removes auth, backups, and schema work.

**Rejected:** localStorage as a “soft save” for now — easy to expand into fake project history; add later only if demo feedback demands it.

## D3 — Provider-agnostic AI module, interface before implementation

**Choice:** `src/lib/ai/types.ts` defines the `AIProvider` interface. `src/lib/ai/provider.ts` is a factory. Gemini is the default primary. Optional fallbacks, when their keys are set: Cerebras (`gpt-oss-120b` by default), Groq (`openai/gpt-oss-20b` by default, strict JSON Schema structured output), Hugging Face Inference Providers (`Qwen/Qwen3-32B` by default), then OpenRouter (dynamic free catalog, health registry, max three models). Prompts live in `src/prompts`. Env is confined to the implementations.

**Tradeoff:** More providers to maintain. Unconfigured keys skip that step so Gemini-only still works. Catalog ranking for OpenRouter remains heuristic.

**Rejected:** Embedding a vendor SDK directly in route handlers. Requiring every API key. Auto-selecting paid OpenRouter models. Looping the entire free catalog. Falling back on invalid JSON / Zod failures. Treating HTTP 402 as a model-health cooldown.

## D4 — Zod schema is the source of truth; types are inferred

**Choice:** `src/lib/schemas/blueprint.ts` defines the Zod schema. `Blueprint`, `TechStack`, and `Roadmap` types are produced with `z.infer`, not hand-declared. `src/types/blueprint.ts` re-exports these types for consumers that only need the shape.

**Tradeoff:** Type-only consumers (e.g. future components) go through `src/types`, while validation code imports the schema from `src/lib/schemas` directly — a second import path, but it keeps runtime validation logic out of the `types/` folder. In exchange, the type and the validator can never drift apart, since one is derived from the other.

**Rejected:** Hand-writing an `interface Blueprint` and separately asserting the schema matches it (the original approach) — two definitions of the same shape, with only a compile-time check that they agree.

## D5 — Mermaid text, rendered in the browser

**Choice:** Model emits Mermaid; client renders it.

**Tradeoff:** Invalid syntax can fail at render time. Cheaper and more editable than image generation.

**Rejected:** Screenshot/image diagrams. Extra vendor, slower, not copy-pasteable into docs.

## D6 — Single-page flow, not a wizard

**Choice:** One page: input → generate → four sections.

**Tradeoff:** Dense on small screens; use stacked sections, not extra routes.

**Rejected:** Multi-step “architect interview.” Conflicts with the 30-second metric.

## D7 — Scope freeze

**Choice:** No auth, payments, storage, collaboration, GitHub, or codegen in this MVP.

**Rationale:** Those features do not help a first-time visitor get a blueprint in 30 seconds. Defer anything that fails the decision filter in `.cursor/rules/project-blueprint-mvp.mdc`.

## D8 — `src/` layout with explicit path aliases

**Choice:** All application code lives under `src/` (`app/`, `components/`, `lib/{ai,schemas,utils}/`, `prompts/`, `types/`, `docs/`). `tsconfig.json` maps `@/app/*`, `@/components/*`, `@/lib/*`, `@/prompts/*`, and `@/types/*` explicitly (plus a general `@/*` fallback for anything else under `src/`).

**Tradeoff:** More path-mapping entries to maintain than a single `@/*`. Makes each top-level folder's alias explicit and self-documenting in `tsconfig.json`, and keeps the repo root to config files only.

**Rejected:** Flat root-level `app/`, `components/`, `lib/` (what the app started with) — fine at this size, but mixes config and source at the root as the project grows. A single `@/*` alias — works, but doesn't communicate the intended top-level folders on its own.

## D9 — Build the contract and mock data before any UI or AI code

**Choice:** Establish `src/types/blueprint.ts`, `src/lib/schemas/blueprint.ts`, the `AIProvider` interface, and `src/lib/utils/mockBlueprint.ts` before writing `src/components/` or `src/app/api/blueprint/route.ts`.

**Tradeoff:** Nothing is demoable yet from this step alone. In exchange, UI work can start immediately against real-shaped mock data and a real `Blueprint` type, and AI integration can be built later against an interface that's already exercised by the type system — reducing rework in both directions.

**Rejected:** Building the idea form and route handler first with ad hoc `any`-typed data, then retrofitting a schema. Higher risk of the UI, the route, and the eventual AI provider disagreeing on shape.
