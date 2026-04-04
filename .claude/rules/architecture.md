# Architecture

## Spec documents are the source of truth

Always check `docs/superpowers/specs/` before making architectural decisions. Don't contradict what's documented there. If a spec is outdated, flag it to the user rather than silently deviating.

## Project structure — flat by layer

This is a single-package project with a flat-by-layer layout:

- **`src/routes/`** — Hono route definitions. Thin handlers that call services.
- **`src/services/`** — Business logic. All database queries and domain operations live here.
- **`src/middleware/`** — Hono middleware (auth, role guard, validation, error handling).
- **`src/validations/`** — Zod schemas for request validation.
- **`src/config/`** — Environment config (`env.ts`) and database client (`db.ts`).
- **`src/helpers/`** — Small shared utilities (response formatters).
- **`src/constants/`** — Named constants (HTTP status codes, shared magic values).
- **`src/repositories/`** — Database access layer. Thin wrappers around Prisma queries.
- **`src/types/`** — Shared TypeScript types.
- **`prisma/`** — Schema, migrations, and seed file.

Don't introduce new top-level directories or break this structure without discussing it first.

## Always use the repository pattern

- **Services never call Prisma directly.** All database access goes through repository functions.
- Repository files live in `src/repositories/` — one file per domain entity (e.g., `user.repository.ts`, `record.repository.ts`).
- Repositories expose typed functions (e.g., `findUserByEmail`, `createRecord`) — not generic CRUD classes or abstract base repositories.
- Services import repository functions and contain business logic only — no `prisma.` calls in service files.
- Keep repositories thin: query + return. No business logic, no validation, no authorization checks in repositories.
- If a query is used in only one place, it still goes in a repository — consistency over convenience.

## No scope creep

- Don't add services, middleware, or infrastructure not described in the spec
- Don't "improve" adjacent code while working on a task
- Don't add features beyond what was explicitly asked for
- If you notice something that should change, flag it — don't silently fix it
