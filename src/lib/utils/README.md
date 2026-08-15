# `lib/utils`

Small, pure helpers shared across `app/`, `components/`, and `lib/ai/` (e.g. `cn()`, text truncation, Mermaid rendering). No side effects beyond browser-only Mermaid init — keep provider and request logic in `lib/ai`.

- `index.ts` — `cn()` class merger used by shadcn/ui
- `mockBlueprint.ts` — fixture `Blueprint` for UI work before AI is wired up
- `mermaid.ts` — lazy Mermaid.js init and render helper (client-only)
