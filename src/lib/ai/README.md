# `lib/ai`

Model provider abstraction. `POST /api/blueprint` calls into here — never into a vendor SDK directly.

Exports:

- `createAIProvider(config)` — factory. Default implementation is Gemini; OpenRouter is selected with `AI_PROVIDER=openrouter`.
- Env-driven config (`AI_PROVIDER`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`) read only on the server.
- Output parsed against `src/lib/schemas/blueprint.ts` before it leaves this module.

See [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) and [`../../docs/DECISIONS.md`](../../docs/DECISIONS.md) (D3).
