# Project BluePrint

AI-powered software planning tool that converts a software idea into an implementation-ready blueprint.

The MVP is a single, fast path: describe an idea, receive architecture, technology, a Mermaid diagram, and a development roadmap. Target time to a useful blueprint is **30 seconds**. No accounts, no saved projects, no generated application code.

## Features

- Architecture recommendation (style, components, data flow)
- Technology recommendation (stack with rationale)
- Mermaid architecture diagram
- Phased development roadmap

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| App | Next.js 16 (App Router) + React 19 | One deployable, server-side API key, already in the repo |
| Language | TypeScript | Safer contracts for the blueprint JSON |
| UI | Tailwind CSS 4 | Fast, consistent MVP styling |
| Diagrams | Mermaid (client render) | Text-in, diagram-out; easy to copy |
| AI | Provider-agnostic HTTP client (`src/lib/ai`) | Swap OpenAI / Azure OpenAI / compatible APIs via env |
| Validation | Zod (`src/lib/schemas`) | Runtime mirror of the `Blueprint` contract |
| Data | None | MVP has no project storage |

## Project structure

```text
src/
├── app/                      # Routes and API
│   ├── page.tsx              # Idea input + blueprint results
│   └── api/blueprint/route.ts  # POST idea → Blueprint JSON
├── components/               # Idea form, results view, Mermaid viewer
├── lib/
│   ├── ai/
│   │   ├── types.ts          # AIProvider interface, config, error types
│   │   └── provider.ts       # Provider factory (not yet implemented)
│   ├── schemas/
│   │   ├── blueprint.ts      # Zod schema — Blueprint source of truth
│   │   └── idea.ts           # Request validation for POST /api/blueprint
│   └── utils/
│       └── mockBlueprint.ts  # Realistic fixture data for UI work
├── prompts/                  # System/user prompts (not mixed into UI)
├── types/                    # Blueprint type, re-exported from lib/schemas
└── docs/                     # Architecture, roadmap, decisions
```

Path aliases (`tsconfig.json`): `@/app/*`, `@/components/*`, `@/lib/*`, `@/prompts/*`, `@/types/*` (plus a general `@/*` for anything else under `src/`).

## The Blueprint contract

Defined once, as a Zod schema, in [`src/lib/schemas/blueprint.ts`](src/lib/schemas/blueprint.ts). The `Blueprint` TypeScript type is *inferred* from that schema (`z.infer`), never hand-declared, and re-exported for UI code from [`src/types/blueprint.ts`](src/types/blueprint.ts):

```ts
interface Blueprint {
  architecture: string;
  architectureReasoning: string;
  techStack: {
    frontend: string;
    backend: string;
    database: string;
    hosting: string;
  };
  diagram: string; // Mermaid source
  roadmap: {
    week1: string[];
    week2: string[];
    week3: string[];
    week4: string[];
  };
}
```

Realistic fixture data matching this exact shape lives in [`src/lib/utils/mockBlueprint.ts`](src/lib/utils/mockBlueprint.ts), so UI work can proceed before AI integration exists.

## AI abstraction

`src/lib/ai/types.ts` defines the `AIProvider` interface (`generateBlueprint(input): Promise<Blueprint>`) and `src/lib/ai/provider.ts` exposes a factory that returns a not-yet-implemented provider. No vendor (OpenRouter, OpenAI, etc.) is integrated yet — this exists so route handlers and components can be written against a stable interface first.

## Installation

```bash
npm install
```

## Environment variables

Create `.env.local` (gitignored). Do not commit secrets:

| Variable | Required | Description |
| --- | --- | --- |
| `AI_API_KEY` | Yes | Server-only key for the model provider |
| `AI_BASE_URL` | No | Override API base (Azure OpenAI, proxy, compatible hosts) |
| `AI_MODEL` | Yes | Model id used for blueprint generation |

Never expose `AI_API_KEY` to the browser. All model calls go through `/api/blueprint`.

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

1. Enter a software idea (at least 10 characters).
2. Click **Generate Blueprint**. The UI calls `POST /api/blueprint`, which returns `mockBlueprint` until AI is wired in.
3. Confirm the four sections render: architecture, technology, diagram, and roadmap.

```bash
npm run lint
npm run build
```

## Deployment

**Live:** [https://project-blueprint-eight.vercel.app](https://project-blueprint-eight.vercel.app)

Deploy the Next.js app to Vercel (or any Node host that supports Next.js). Set the environment variables in the host dashboard when AI is wired in. There is no database to provision.

## Documentation

- [Architecture](src/docs/ARCHITECTURE.md)
- [Roadmap](src/docs/ROADMAP.md)
- [Decisions](src/docs/DECISIONS.md)
