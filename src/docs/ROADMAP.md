# Roadmap

Constraints: solo developer, **7–10 day MVP**, no auth, payments, project storage, or GitHub.

## MVP scope

A visitor can paste a software idea and receive, in one screen:

1. Architecture recommendation
2. Technology recommendation
3. Mermaid architecture diagram
4. Development roadmap

Success: a **useful** blueprint within **30 seconds**.

### Explicitly out of scope (now)

- Authentication and user accounts
- Payments
- Saving / listing projects
- Collaboration
- GitHub integration
- Application code generation
- Multi-step wizards, dashboards, settings, export suites

## Day plan

| Days | Goal | Done when |
| --- | --- | --- |
| 0 | Blueprint contract, Zod schema, `AIProvider` interface, mock data — **done** | `src/types`, `src/lib/schemas`, `src/lib/ai` exist; no UI or AI calls yet |
| 1–2 | Skeleton UI + `POST /api/blueprint` returning `mockBlueprint` | Form → four sections with fixture JSON; loading/error/empty |
| 3–4 | Implement `createAIProvider` for a real vendor, wire into the route | Real idea produces valid JSON (validated by `blueprintSchema`); key never in client |
| 5 | Mermaid render + copy-able source | Diagram draws; invalid Mermaid shows a recoverable error |
| 6 | Speed and clarity | Typical idea returns in ≤30s; copy, truncation, and failure copy are clear |
| 7 | Deploy + smoke | Production URL works with env vars set |
| 8–10 | Buffer | Prompt quality, one diagram fix, one latency fix — not new features |

## Future (after MVP)

Only if the core path is reliable:

- Optional export (Markdown download) — still no accounts
- Prompt/eval loop to improve recommendation quality
- Light rate limiting

Still later (not this sprint): auth, saved projects, GitHub, codegen, payments.

## Technical improvements (keep small)

- Structured output / JSON schema from the model to reduce parse failures
- Input token budget so large ideas do not blow latency
- Provider timeout aligned with the 30s metric
