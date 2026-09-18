# Taskboard

Taskboard is a small task-management application for a development team. It organizes work into recursively nested subtasks, tracks lifecycle and priority, and shows estimated workload across the complete hierarchy.

## Stack

- Next.js 16 App Router and React
- JavaScript
- Tailwind CSS
- PostgreSQL 16
- Prisma ORM
- Docker Compose
- Vitest for business-logic and API tests

No authentication, third-party account, or cloud service is required.

## Start With Docker

Prerequisite: Docker Desktop with Compose support.

From the repository root, run:

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000). Compose starts PostgreSQL with a persistent named volume, waits for its healthcheck, applies checked-in Prisma migrations, and starts the Next.js production server.

The default local database credentials are defined in `docker-compose.yml` for this challenge. They are not production credentials.

To stop the application while keeping database data:

```bash
docker compose down
```

To stop it and remove the persisted PostgreSQL volume:

```bash
docker compose down -v
```

## Seed Review Data

The repository includes a small deterministic seed with multiple hierarchy levels, statuses, priorities, and effort estimates. After the containers are running, execute:

```bash
docker compose exec app npm run db:seed
```

The seed uses stable IDs and upserts its records, so it is safe to run repeatedly. It does not delete manually created tasks.

## Local Commands

The Docker workflow is the recommended complete setup because it supplies PostgreSQL without requiring it on the host. For local Node development, use a PostgreSQL database and set `DATABASE_URL` in a root `.env` file. `.env.example` shows the expected connection format for Compose; when running the app directly on the host, replace `db` with `localhost`.

Install dependencies:

```bash
npm install
```

Run the tests:

```bash
npm test
```

Run lint and the production build:

```bash
npm run lint
npm run build
```

Generate Prisma Client and apply development migrations when using a local PostgreSQL instance:

```bash
npm run db:generate
npm run db:migrate
```

For an already-built database in a deployment/container environment, use:

```bash
npm run db:migrate:deploy
```

## Architecture

- `src/app/page.js` renders the responsive dashboard UI.
- `src/app/tasks/[id]` renders the task detail UI.
- `src/app/api/tasks/route.js` handles collection GET and POST requests.
- `src/app/api/tasks/[id]/route.js` handles item GET, PATCH, and DELETE requests.
- `src/lib/tasks/domain.js` contains validation, recursive tree construction, aggregate effort, workload calculations, cycle detection, and sibling ordering.
- `src/lib/tasks/service.js` is the server-side Prisma service used by the API.
- `prisma/schema.prisma` defines the self-referencing task model and lifecycle/priority enums.

Pages and interactive components consume the existing API. Database access remains server-side, and the Docker entrypoint runs `prisma migrate deploy` before starting Next.js.

## Task Model And Workload

Every task has a title, description, lifecycle status, priority, optional non-negative effort estimate, parent relationship, and sibling position. Subtasks can be nested to any depth.

Effort is node-local: a task's own estimate excludes its subtasks. The displayed aggregate effort is the task's estimate plus every descendant estimate. Workload totals sum each task's own estimate once by its persisted status, so hierarchy rollups are not double-counted.

## API

All endpoints return JSON.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/tasks` | Top-level recursive task trees and workload summary |
| `POST` | `/api/tasks` | Create a task or subtask with `parentId` |
| `GET` | `/api/tasks/:id` | Retrieve a task and all descendants |
| `PATCH` | `/api/tasks/:id` | Update fields or reparent a task |
| `DELETE` | `/api/tasks/:id` | Delete a task and its complete subtree |

The API validates parents, rejects self-parenting and descendant cycles, handles malformed JSON, and returns appropriate `400`, `404`, `409`, and `500` responses.

## AI Assistance And Repository Guidance

AI coding assistance was used during development. The repository includes the existing [AGENTS.md](AGENTS.md) and [CLAUDE.md](CLAUDE.md) configuration files used to guide the implementation.
