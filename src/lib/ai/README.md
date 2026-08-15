# `lib/ai`

Model provider abstraction. `POST /api/blueprint` calls into here — never into a vendor SDK directly.

Planned exports:

- A single `generateBlueprint(idea: string): Promise<Blueprint>` entry point.
- Env-driven config (`AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`) read only on the server.
- Output parsed against `src/lib/schemas/blueprint.ts` before it leaves this module.

See [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) and [`../../docs/DECISIONS.md`](../../docs/DECISIONS.md) (D3).
