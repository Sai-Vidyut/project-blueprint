# `components`

UI building blocks for the single-page blueprint flow. Keep these presentational — data fetching and validation stay in `app/api/blueprint` and `lib/`.

| File | Role |
| --- | --- |
| `landing-page.tsx` | Product landing: hero, how it works, about |
| `blueprint-home.tsx` | Client orchestrator on `/create`: idea submit → `POST /api/blueprint` |
| `ai-outage-state.tsx` | Dedicated UI when every AI provider is unavailable |
| `site-header.tsx` | Sticky wordmark header (links home; optional Get Started) |
| `blueprint-dashboard.tsx` | Results dashboard: empty, generation progress, success, error |
| `blueprint-generation-progress.tsx` | Motion progress bar, rotating stages, skeleton cards |
| `ui/progress-bar.tsx` | Animated progress bar |
| `example-ideas.tsx` | Clickable example prompts |
| `copy-button.tsx` | Copy-to-clipboard for blueprint sections |
| `site-header.tsx` | Sticky wordmark header |
| `idea-form.tsx` | Idea textarea + Generate Blueprint |
| `architecture-card.tsx` | Architecture recommendation |
| `tech-stack-card.tsx` | Technology recommendation |
| `diagram-card.tsx` | Dominant architecture diagram (Mermaid) |
| `mermaid-diagram.tsx` | Client Mermaid renderer |
| `roadmap-card.tsx` | Timeline-style four-week roadmap |
| `ui/` | shadcn/ui primitives |
