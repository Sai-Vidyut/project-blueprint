import type { Blueprint } from "@/types/blueprint";

/**
 * Realistic fixture data for building and testing the UI before the AI
 * provider is implemented. Shape matches `blueprintSchema` exactly — keep it
 * that way so UI work done against this mock doesn't need rework later.
 *
 * Idea used for this fixture: "A shared task list app for small teams."
 */
export const mockBlueprint: Blueprint = {
  architecture:
    "Modular monolith: a single Next.js application serving both the UI and a REST API, backed by one managed Postgres database. No separate services or queues at this stage.",
  architectureReasoning:
    "A small team task list has predictable read/write patterns and low traffic at launch. A monolith keeps deployment and debugging simple for a solo or small team, while a modular internal structure (routes, services, data access) keeps the door open to extracting a service later if a specific workload (e.g. notifications) needs to scale independently.",
  techStack: {
    frontend: "Next.js (App Router) + TypeScript + Tailwind CSS",
    backend: "Next.js Route Handlers (Node.js runtime) as the API layer",
    database: "PostgreSQL (managed, e.g. Supabase or Neon) with Prisma as the ORM",
    hosting: "Vercel for the app; managed Postgres provider for the database",
  },
  diagram: `flowchart LR
  User[User] --> UI[Next.js UI]
  UI -->|REST| API[Route Handlers]
  API --> DB[(PostgreSQL)]
  API --> Auth[Session cookie]
  UI --> Auth`,
  roadmap: {
    week1: [
      "Define data model: teams, members, task lists, tasks",
      "Set up Postgres + Prisma schema and migrations",
      "Scaffold Next.js app with layout and navigation",
    ],
    week2: [
      "Build task list CRUD API routes",
      "Build task list UI: create, edit, complete, delete",
      "Add basic team membership (invite by email, no billing)",
    ],
    week3: [
      "Add real-time-ish updates (polling or simple websocket)",
      "Add per-user task filtering and due dates",
      "Write core integration tests for API routes",
    ],
    week4: [
      "Polish empty/loading/error states across the UI",
      "Add basic activity log per task list",
      "Deploy to production, set up monitoring and error tracking",
    ],
  },
};
