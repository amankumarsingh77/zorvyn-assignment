# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is this project?

A finance dashboard backend API with role-based access control. Users have roles (VIEWER, ANALYST, ADMIN) that determine access to endpoints. Financial records (income/expense) are shared company-wide — any authenticated user can read, only ADMINs can write.

**Tech stack:** TypeScript, Hono, Prisma (v7), PostgreSQL, Zod, JWT + bcrypt, Vitest, Podman Compose.

## Commands

```bash
pnpm dev              # Start dev server with hot reload (tsx watch)
pnpm build            # TypeScript compile to dist/
pnpm start            # Run compiled output
pnpm typecheck        # Type check without emitting (tsc --noEmit)
pnpm test             # Run all tests (vitest run)
pnpm test:watch       # Watch mode tests
pnpm db:migrate       # Create and apply Prisma migrations
pnpm db:generate      # Regenerate Prisma client
pnpm db:seed          # Seed database with sample data
podman-compose up -d  # Start PostgreSQL
podman-compose down   # Stop PostgreSQL
```

Run a single test file: `pnpm vitest run tests/unit/services/auth.service.test.ts`

## Architecture

**Flat-by-layer structure** — no monorepo, no controllers pattern:

- `src/routes/` — Hono route handlers. Thin: validate input, call service, return response.
- `src/services/` — Business logic and all Prisma queries.
- `src/middleware/` — Auth (JWT verify), role guard, Zod validation, error handler.
- `src/validations/` — Zod schemas for request validation.
- `src/config/env.ts` — Zod-validated environment variables.
- `src/config/db.ts` — Prisma client singleton (uses `@prisma/adapter-pg`).
- `src/helpers/response.ts` — `successResponse()` / `errorResponse()` wrappers.
- `src/types/index.ts` — Shared types (`JwtPayload`, `Variables`).

**Request flow:** Auth middleware → Role guard → Validation middleware → Route handler → Service → Prisma → PostgreSQL.

## Prisma v7 specifics

- Uses `@prisma/adapter-pg` driver adapter — the `PrismaClient` constructor requires an `adapter` argument.
- Generated client lives in `generated/prisma/`, not `node_modules`.
- Import from `../../generated/prisma/client.js` (relative) not `@prisma/client`.
- Datasource URL is configured in `prisma.config.ts`, not in `schema.prisma`.

## Key design decisions

- **Shared data model:** All financial records are visible to all authenticated users. `createdBy` tracks who created a record, but doesn't restrict read access.
- **Self-registration creates VIEWER role.** Only ADMINs can create users with other roles.
- **Category is free-form string**, normalized to lowercase on save.
- **Decimal(12,2) for money amounts.** Never use float.
- **RESTRICT on user delete** — cannot delete users who have created records.
- **No soft delete, no rate limiting, no file uploads, no multi-tenancy** — explicitly out of scope.

## Git rules

- **Never commit** `CLAUDE.md`, `docs/`, or `.claude/` — these are local working files, not part of the deliverable.
- **Never add Co-Authored-By or any AI attribution** to commits.
- **No emojis** in commit messages.
- **Write commit messages in a natural, human tone** — as if the developer wrote them. Keep them concise and descriptive.

## Specs and plans

Design spec and phase-by-phase implementation plans live in `docs/superpowers/`. Check specs before making architectural decisions.
