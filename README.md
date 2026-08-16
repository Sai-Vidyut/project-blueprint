# BluePrint

AI-powered software planning tool that converts a software idea into a developer-grade implementation blueprint.

Describe an idea and receive a structured plan: target users, key features, MVP scope, architecture, technology stack, database schema, API endpoints, authentication strategy, deployment plan, complexity estimate, risks, future enhancements, and a week-by-week roadmap — plus an architecture diagram generated programmatically from the plan. No accounts, no saved projects, no generated application code.

## Features

- Project summary (title, elevator pitch, problem statement)
- Target users and key features (prioritized)
- MVP scope (in scope / out of scope)
- Architecture recommendation with components and relationships
- Architecture diagram — Mermaid, generated from structured data (never asked of the model)
- Technology stack with reasoning, plus supporting tooling
- Database schema (tables, columns, types, relationships)
- REST API endpoint list
- Authentication strategy with implementation steps
- Deployment architecture
- Estimated complexity and risks
- Future enhancements
- Detailed multi-week development roadmap

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| App | Next.js 16 (App Router) + React 19 | One deployable, server-side API key, already in the repo |
| Language | TypeScript | Safer contracts for the blueprint JSON |
| UI | Tailwind CSS 4 | Fast, consistent MVP styling |
| Diagrams | Mermaid (client render) | Rendered from AI-generated architecture data, not AI-generated syntax |
| AI | Gemini (`@google/genai`) via `src/lib/ai` | Default provider; OpenRouter kept behind `AI_PROVIDER` |
| Validation | Zod (`src/lib/schemas`) | Runtime mirror of the `Blueprint` contract |
| Data | None | MVP has no project storage |

## Project structure

```text
src/
├── app/                        # Routes and API
│   ├── page.tsx                # Landing page
│   ├── create/page.tsx         # Idea input + blueprint results
│   └── api/blueprint/route.ts  # POST idea → Blueprint JSON
├── components/                 # Idea form, section cards, Mermaid viewer
├── lib/
│   ├── ai/
│   │   ├── types.ts               # AIProvider interface, config, error types
│   │   ├── config.ts              # Reads AI_PROVIDER / GEMINI_* / OPENROUTER_*
│   │   ├── provider.ts            # Factory: Gemini default, OpenRouter optional
│   │   ├── providers/gemini.ts    # @google/genai implementation
│   │   ├── providers/openrouter.ts
│   │   └── parse-json-content.ts  # Tolerant JSON extraction from model output
│   ├── schemas/
│   │   ├── blueprint.ts      # Zod schema — Blueprint source of truth
│   │   └── idea.ts           # Request validation for POST /api/blueprint
│   └── utils/
│       ├── mockBlueprint.ts     # Realistic fixture data for UI work
│       ├── generate-mermaid.ts  # Deterministic Mermaid generation from architecture data
│       └── blueprint-format.ts  # Copy-to-clipboard formatters per section
├── prompts/                  # System/user prompts (not mixed into UI)
├── types/                    # Blueprint type, re-exported from lib/schemas
└── docs/                     # Architecture, roadmap, decisions
```

Path aliases (`tsconfig.json`): `@/app/*`, `@/components/*`, `@/lib/*`, `@/prompts/*`, `@/types/*` (plus a general `@/*` for anything else under `src/`).

## The Blueprint contract

Defined once, as a Zod schema, in [`src/lib/schemas/blueprint.ts`](src/lib/schemas/blueprint.ts). The `Blueprint` TypeScript type is *inferred* from that schema (`z.infer`), never hand-declared, and re-exported for UI code from [`src/types/blueprint.ts`](src/types/blueprint.ts):

```ts
interface Blueprint {
  projectSummary: { title: string; elevatorPitch: string; problemStatement: string };
  targetUsers: Array<{ persona: string; description: string }>;
  keyFeatures: Array<{ name: string; description: string; priority: "must-have" | "should-have" }>;
  mvpScope: { inScope: string[]; outOfScope: string[] };
  architecture: {
    style: string;
    summary: string;
    reasoning: string;
    components: Array<{ name: string; purpose: string }>;
    relationships: Array<{ from: string; to: string; description: string }>;
  };
  techStack: { frontend: string; backend: string; database: string; hosting: string; tooling: string[] };
  databaseSchema: Array<{
    name: string;
    description: string;
    columns: Array<{ name: string; type: string; constraints?: string }>;
    relationships?: string[];
  }>;
  apiEndpoints: Array<{
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    path: string;
    description: string;
    authRequired: boolean;
  }>;
  authentication: { approach: string; rationale: string; implementation: string[] };
  deployment: { summary: string; components: Array<{ name: string; provider: string; purpose: string }> };
  estimatedComplexity: { level: "low" | "medium" | "high"; timelineWeeks: number; rationale: string };
  risks: Array<{ risk: string; impact: "low" | "medium" | "high"; mitigation: string }>;
  futureEnhancements: string[];
  roadmap: Array<{
    theme: string;
    goals: string[];
    tasks: Array<{ task: string; deliverable: string }>;
  }>; // exactly 4 weeks
}
```

The model never generates Mermaid syntax. It returns `architecture.components` and `architecture.relationships` as structured data; [`src/lib/utils/generate-mermaid.ts`](src/lib/utils/generate-mermaid.ts) deterministically converts that into a `flowchart` diagram. If rendering ever fails, the UI shows the generated Mermaid source instead of hiding the architecture.

Realistic fixture data matching this exact shape lives in [`src/lib/utils/mockBlueprint.ts`](src/lib/utils/mockBlueprint.ts), so UI work can proceed independent of live model calls.

## AI integration

`src/lib/ai/types.ts` defines the `AIProvider` interface (`generateBlueprint(input): Promise<Blueprint>`). `src/lib/ai/provider.ts` is a factory: Gemini (`src/lib/ai/providers/gemini.ts`) is the default; OpenRouter stays available when `AI_PROVIDER=openrouter`. `src/lib/ai/config.ts` reads the model config from environment variables. `POST /api/blueprint` validates the request, calls the provider, and validates the response against `blueprintSchema` before returning it — the model's JSON is never trusted as-is.

## Installation

```bash
npm install
```

## Environment variables

Create `.env.local` (gitignored). Do not commit secrets:

| Variable | Required | Description |
| --- | --- | --- |
| `AI_PROVIDER` | No | `gemini` (default), `cerebras`, `groq`, `huggingface`, or `openrouter`. When `gemini` (or unset), configured fallbacks run in order: Cerebras → Groq → Hugging Face → OpenRouter. |
| `GEMINI_API_KEY` | Yes when `AI_PROVIDER=gemini` | Server-only Gemini API key |
| `GEMINI_MODEL` | No | Preferred Gemini model (defaults to `gemini-3.6-flash`) |
| `CEREBRAS_API_KEY` | No | Optional first fallback. If unset, Cerebras is skipped. |
| `CEREBRAS_MODEL` | No | Cerebras model id (defaults to `gpt-oss-120b`, current Cerebras structured-output model) |
| `GROQ_API_KEY` | No | Optional second fallback. If unset, Groq is skipped. |
| `GROQ_MODEL` | No | Groq model id (defaults to `openai/gpt-oss-20b`, which supports strict JSON Schema). Override in `.env.local`. |
| `HF_TOKEN` | No | Optional third fallback (Hugging Face Inference Providers). If unset, Hugging Face is skipped. |
| `HF_MODEL` | No | Hugging Face model id (defaults to `Qwen/Qwen3-32B`) |
| `OPENROUTER_API_KEY` | No | Optional final fallback. Required when `AI_PROVIDER=openrouter`. If unset, OpenRouter is skipped. |
| `OPENROUTER_MODEL` | No | Optional preferred OpenRouter model id. Tried first when set. Remaining attempts use currently available **free** catalog models. |
| `AI_BASE_URL` | No | OpenRouter API base override |

Gemini (default) with optional fallbacks:

```bash
AI_PROVIDER=gemini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.6-flash
CEREBRAS_API_KEY=
CEREBRAS_MODEL=gpt-oss-120b
GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-20b
HF_TOKEN=
HF_MODEL=Qwen/Qwen3-32B
OPENROUTER_API_KEY=
# Optional. Tried first on OpenRouter; otherwise free catalog models.
# OPENROUTER_MODEL=
```

OpenRouter only (no Gemini):

```bash
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=
# OPENROUTER_MODEL=
```

### Provider failover

When `AI_PROVIDER` is `gemini` (the default), every request tries Gemini first. If Gemini fails for a **transient** reason — rate limit (429), model unavailable, timeout, network error, or a transient 5xx — the same request is retried against the next **configured** provider:

1. Cerebras (`CEREBRAS_API_KEY`)
2. Groq (`GROQ_API_KEY`, default model `openai/gpt-oss-20b` with strict JSON Schema)
3. Hugging Face Inference Providers (`HF_TOKEN`)
4. OpenRouter (`OPENROUTER_API_KEY`) — dynamic free catalog, health registry, max 3 models

A successful provider stops the chain. Missing keys skip that step without breaking Gemini. HTTP 402 / payment-quota on an optional provider skips to the next configured fallback (it is not a model-health failure). Failover does **not** trigger for malformed JSON, a `blueprintSchema` validation failure, or a bad request. If the last provider returns 402, that error is returned.

Never expose `GEMINI_API_KEY`, `CEREBRAS_API_KEY`, `GROQ_API_KEY`, `HF_TOKEN`, or `OPENROUTER_API_KEY` to the browser. All model calls go through `/api/blueprint`.

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

In development only (`NODE_ENV=development`), you can inject a provider failure **before** that provider’s API call, to exercise the fallback chain without burning quota:

```bash
FORCE_GEMINI_FAILURE=true
FORCE_CEREBRAS_FAILURE=true
FORCE_GROQ_FAILURE=true
FORCE_HF_FAILURE=true
```

These flags are ignored in production.

1. Open `/` and click **Get Started** (or go to `/create`).
2. Enter a software idea (at least 10 characters).
3. Click **Generate Blueprint**. The UI calls `POST /api/blueprint`, which calls the configured model and returns a validated `Blueprint`.
4. Confirm all sections render: project summary, target users, key features, MVP scope, architecture + diagram, tech stack, database schema, API endpoints, authentication, deployment, complexity, risks, future enhancements, and roadmap.

```bash
npm run lint
npm run build
```

## Deployment

**Live:** [https://project-blueprint-eight.vercel.app](https://project-blueprint-eight.vercel.app)

Deploy the Next.js app to Vercel (or any Node host that supports Next.js). Set `GEMINI_API_KEY` (required for the default Gemini-primary flow). Optional fallbacks: `CEREBRAS_API_KEY`, `GROQ_API_KEY`, `HF_TOKEN`, `OPENROUTER_API_KEY`. There is no database to provision.

## Documentation

- [Architecture](src/docs/ARCHITECTURE.md)
- [Roadmap](src/docs/ROADMAP.md)
- [Decisions](src/docs/DECISIONS.md)
