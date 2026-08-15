import type { Blueprint } from "@/types/blueprint";

/**
 * Realistic fixture data for building and testing the UI before/independent
 * of live AI calls. Shape matches `blueprintSchema` exactly — keep it that
 * way so UI work done against this mock doesn't need rework later.
 *
 * Idea used for this fixture: "A shared task list app for small teams."
 */
export const mockBlueprint: Blueprint = {
  projectSummary: {
    title: "TeamTasks",
    elevatorPitch:
      "A shared task list that lets small teams assign, track, and finish work together without the overhead of a full project management suite.",
    problemStatement:
      "Small teams juggle tasks across chat threads, spreadsheets, and sticky notes, losing track of who owns what and what's actually done.",
  },
  targetUsers: [
    {
      persona: "Small remote teams (3–10 people)",
      description:
        "Need a lightweight, shared view of team tasks without learning a heavyweight PM tool.",
    },
    {
      persona: "Team leads",
      description:
        "Need to assign work, see progress at a glance, and follow up on stalled tasks.",
    },
  ],
  keyFeatures: [
    {
      name: "Shared task lists",
      description: "Teams create named lists that all members can view and edit.",
      priority: "must-have",
    },
    {
      name: "Task assignment",
      description: "Any task can be assigned to a specific team member.",
      priority: "must-have",
    },
    {
      name: "Due dates and status",
      description: "Tasks track a due date and a status (todo/doing/done).",
      priority: "must-have",
    },
    {
      name: "Activity feed",
      description: "A per-list feed shows recent changes so nothing gets missed.",
      priority: "should-have",
    },
  ],
  mvpScope: {
    inScope: [
      "Create/edit/delete task lists",
      "Create/edit/delete/assign tasks within a list",
      "Invite teammates to a list by email",
      "Mark tasks todo/doing/done",
    ],
    outOfScope: [
      "Recurring tasks",
      "File attachments",
      "Native mobile apps",
      "Billing/paid plans",
    ],
  },
  architecture: {
    style: "Modular monolith",
    summary:
      "A single Next.js application serves both the UI and a REST API, backed by one managed Postgres database.",
    reasoning:
      "Task read/write patterns are simple and traffic is low at launch, so a monolith keeps deployment and debugging simple for a small team without the operational cost of separate services.",
    components: [
      { name: "Web App", purpose: "Renders the UI and handles client-side interactions" },
      { name: "API Layer", purpose: "Exposes REST routes for lists, tasks, and members" },
      { name: "Database", purpose: "Stores teams, lists, tasks, and membership data" },
      { name: "Auth Service", purpose: "Handles session-based sign-in and invite links" },
    ],
    relationships: [
      { from: "Web App", to: "API Layer", description: "sends REST requests to" },
      { from: "API Layer", to: "Database", description: "reads and writes data via" },
      { from: "Web App", to: "Auth Service", description: "authenticates through" },
      { from: "Auth Service", to: "Database", description: "stores sessions and invites in" },
    ],
  },
  techStack: {
    frontend: "Next.js (App Router) + TypeScript — one deployable, server-rendered for fast first load",
    backend: "Next.js Route Handlers (Node.js runtime) — colocated API keeps latency and deploys simple",
    database: "PostgreSQL (managed, e.g. Neon) — relational fit for teams/lists/tasks with clear foreign keys",
    hosting: "Vercel — zero-config deploys for Next.js with a generous free tier for an MVP",
    tooling: ["Prisma", "Zod", "NextAuth.js", "Resend"],
  },
  databaseSchema: [
    {
      name: "teams",
      description: "A group of users who share task lists.",
      columns: [
        { name: "id", type: "uuid", constraints: "PK" },
        { name: "name", type: "text", constraints: "NOT NULL" },
        { name: "created_at", type: "timestamptz", constraints: "NOT NULL DEFAULT now()" },
      ],
    },
    {
      name: "team_members",
      description: "Join table linking users to teams.",
      columns: [
        { name: "team_id", type: "uuid", constraints: "FK -> teams.id" },
        { name: "user_id", type: "uuid", constraints: "FK -> users.id" },
        { name: "role", type: "text", constraints: "NOT NULL DEFAULT 'member'" },
      ],
      relationships: ["belongs to teams via team_id", "belongs to users via user_id"],
    },
    {
      name: "task_lists",
      description: "A named list of tasks owned by a team.",
      columns: [
        { name: "id", type: "uuid", constraints: "PK" },
        { name: "team_id", type: "uuid", constraints: "FK -> teams.id" },
        { name: "title", type: "text", constraints: "NOT NULL" },
      ],
      relationships: ["belongs to teams via team_id"],
    },
    {
      name: "tasks",
      description: "An individual unit of work within a list.",
      columns: [
        { name: "id", type: "uuid", constraints: "PK" },
        { name: "list_id", type: "uuid", constraints: "FK -> task_lists.id" },
        { name: "assignee_id", type: "uuid", constraints: "FK -> users.id, NULLABLE" },
        { name: "title", type: "text", constraints: "NOT NULL" },
        { name: "status", type: "text", constraints: "NOT NULL DEFAULT 'todo'" },
        { name: "due_date", type: "date", constraints: "NULLABLE" },
      ],
      relationships: ["belongs to task_lists via list_id", "assigned to users via assignee_id"],
    },
  ],
  apiEndpoints: [
    { method: "POST", path: "/api/teams", description: "Create a new team", authRequired: true },
    { method: "GET", path: "/api/teams/:teamId/lists", description: "List all task lists for a team", authRequired: true },
    { method: "POST", path: "/api/teams/:teamId/lists", description: "Create a task list", authRequired: true },
    { method: "GET", path: "/api/lists/:listId/tasks", description: "List all tasks in a list", authRequired: true },
    { method: "POST", path: "/api/lists/:listId/tasks", description: "Create a task in a list", authRequired: true },
    { method: "PATCH", path: "/api/tasks/:taskId", description: "Update a task's status, assignee, or due date", authRequired: true },
  ],
  authentication: {
    approach: "Email magic link + session cookies via NextAuth.js",
    rationale:
      "Small teams want frictionless sign-in without managing passwords, and session cookies keep the API simple to protect route-by-route.",
    implementation: [
      "Configure NextAuth.js with the Email provider",
      "Store sessions in Postgres via the Prisma adapter",
      "Gate all /api routes behind a session check middleware",
    ],
  },
  deployment: {
    summary:
      "The Next.js app deploys as a single Vercel project; Postgres runs on a managed provider reachable over a pooled connection.",
    components: [
      { name: "Vercel", provider: "Vercel", purpose: "Hosts the Next.js app and serverless API routes" },
      { name: "Neon Postgres", provider: "Neon", purpose: "Managed Postgres with connection pooling for serverless" },
      { name: "Resend", provider: "Resend", purpose: "Sends magic-link and invite emails" },
    ],
  },
  estimatedComplexity: {
    level: "low",
    timelineWeeks: 4,
    rationale:
      "The data model is small (4 tables), there's a single well-understood auth flow, and no real-time or billing requirements.",
  },
  risks: [
    {
      risk: "Users invited by email never complete sign-up",
      impact: "medium",
      mitigation: "Show pending-invite status in the UI and allow resending the invite email.",
    },
    {
      risk: "Task list grows large and UI performance degrades",
      impact: "low",
      mitigation: "Paginate or virtualize task lists once a list exceeds ~100 tasks.",
    },
  ],
  futureEnhancements: [
    "Recurring tasks with configurable repeat rules",
    "File attachments on tasks via object storage",
    "Slack notification integration for task assignments",
  ],
  roadmap: [
    {
      theme: "Foundation & data model",
      goals: ["Team and auth data model is live", "Solo dev can create a team and sign in"],
      tasks: [
        { task: "Set up Postgres + Prisma schema for teams/users/members", deliverable: "Migrated schema in dev DB" },
        { task: "Configure NextAuth.js email provider", deliverable: "Working magic-link sign-in" },
        { task: "Scaffold Next.js app layout and navigation", deliverable: "Deployed empty-state app" },
      ],
    },
    {
      theme: "Task lists & tasks",
      goals: ["Teams can manage lists and tasks end to end"],
      tasks: [
        { task: "Build task list CRUD API routes", deliverable: "Tested /api/lists endpoints" },
        { task: "Build task CRUD API routes", deliverable: "Tested /api/tasks endpoints" },
        { task: "Build list and task UI screens", deliverable: "Create/edit/complete tasks in the browser" },
      ],
    },
    {
      theme: "Team membership",
      goals: ["Teams can grow beyond one member"],
      tasks: [
        { task: "Build invite-by-email API and email template", deliverable: "Invite email sent via Resend" },
        { task: "Build member list and role display UI", deliverable: "Team page shows all members" },
        { task: "Add assignee picker to task UI", deliverable: "Tasks can be assigned to any member" },
      ],
    },
    {
      theme: "Polish & launch",
      goals: ["App is demo-ready and deployed"],
      tasks: [
        { task: "Add loading/empty/error states across the UI", deliverable: "No blank screens on slow network" },
        { task: "Write integration tests for core API routes", deliverable: "CI passing test suite" },
        { task: "Deploy to Vercel with production env vars", deliverable: "Live production URL" },
      ],
    },
  ],
};
