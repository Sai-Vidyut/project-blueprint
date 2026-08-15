# Project BluePrint

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
| AI | OpenRouter (OpenAI-compatible) via `src/lib/ai` | Swap models/providers via env; abstracted behind `AIProvider` |
| Validation | Zod (`src/lib/schemas`) | Runtime mirror of the `Blueprint` contract |
| Data | None | MVP has no project storage |

## Project structure

```text
src/
├── app/                        # Routes and API
│   ├── page.tsx                # Idea input + blueprint results
│   └── api/blueprint/route.ts  # POST idea → Blueprint JSON
├── components/                 # Idea form, section cards, Mermaid viewer
├── lib/
│   ├── ai/
│   │   ├── types.ts               # AIProvider interface, config, error types
│   │   ├── config.ts              # Reads AI_API_KEY / AI_MODEL / AI_BASE_URL
│   │   ├── provider.ts            # OpenRouter-backed AIProvider implementation
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
  }>; // 4–8 weeks
}
```

The model never generates Mermaid syntax. It returns `architecture.components` and `architecture.relationships` as structured data; [`src/lib/utils/generate-mermaid.ts`](src/lib/utils/generate-mermaid.ts) deterministically converts that into a `flowchart` diagram. If rendering ever fails, the UI shows the generated Mermaid source instead of hiding the architecture.

Realistic fixture data matching this exact shape lives in [`src/lib/utils/mockBlueprint.ts`](src/lib/utils/mockBlueprint.ts), so UI work can proceed independent of live model calls.

## AI integration

`src/lib/ai/types.ts` defines the `AIProvider` interface (`generateBlueprint(input): Promise<Blueprint>`). `src/lib/ai/provider.ts` implements it against any OpenAI-compatible chat completions API (OpenRouter by default), and `src/lib/ai/config.ts` reads the model config from environment variables. `POST /api/blueprint` validates the request, calls the provider, and validates the response against `blueprintSchema` before returning it — the model's JSON is never trusted as-is.

## Installation

```bash
npm install
```

## Environment variables

Create `.env.local` (gitignored). Do not commit secrets:

| Variable | Required | Description |
| --- | --- | --- |
| `AI_API_KEY` | Yes | Server-only key for the model provider |
| `AI_BASE_URL` | No | Override API base (defaults to OpenRouter; also works with Azure OpenAI, a proxy, etc.) |
| `AI_MODEL` | Yes | Model id used for blueprint generation |

Never expose `AI_API_KEY` to the browser. All model calls go through `/api/blueprint`.

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

1. Enter a software idea (at least 10 characters).
2. Click **Generate Blueprint**. The UI calls `POST /api/blueprint`, which calls the configured model and returns a validated `Blueprint`.
3. Confirm all sections render: project summary, target users, key features, MVP scope, architecture + diagram, tech stack, database schema, API endpoints, authentication, deployment, complexity, risks, future enhancements, and roadmap.

```bash
npm run lint
npm run build
```

## Deployment

**Live:** [https://project-blueprint-eight.vercel.app](https://project-blueprint-eight.vercel.app)

Deploy the Next.js app to Vercel (or any Node host that supports Next.js). Set `AI_API_KEY`, `AI_MODEL`, and optionally `AI_BASE_URL` in the host dashboard. There is no database to provision.

## Documentation

- [Architecture](src/docs/ARCHITECTURE.md)
- [Roadmap](src/docs/ROADMAP.md)
- [Decisions](src/docs/DECISIONS.md)
