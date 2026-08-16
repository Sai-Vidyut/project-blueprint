# `lib/ai`

Model provider abstraction. `POST /api/blueprint` calls into here — never into a vendor SDK directly.

Exports:

- `createAIProvider(config)` — factory. Default chain: Gemini → Cerebras → Groq → Hugging Face → OpenRouter (unconfigured steps are skipped). `AI_PROVIDER` can start the chain at a later provider.
- Env-driven config (`AI_PROVIDER`, `GEMINI_*`, `CEREBRAS_*`, `GROQ_*`, `HF_TOKEN`/`HF_MODEL`, `OPENROUTER_*`) read only on the server. Default chain: Gemini → Cerebras → Groq → Hugging Face → OpenRouter. Unconfigured fallbacks are skipped.
- Output parsed against `src/lib/schemas/blueprint.ts` before it leaves this module.

See [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) and [`../../docs/DECISIONS.md`](../../docs/DECISIONS.md) (D3).
