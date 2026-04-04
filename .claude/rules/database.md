---
paths:
  - "prisma/**/*"
  - "src/config/db.ts"
  - "src/services/**/*.ts"
---

# Database Rules

## Schema and migrations

- The Prisma schema lives in `prisma/schema.prisma` — this is the single source of truth for the data model
- All schema changes go through Prisma migrations — run `pnpm db:migrate` to create and apply
- Never modify a migration file after it has been applied
- Never write raw ALTER TABLE statements

## Queries

- Use Prisma Client's query builder for standard CRUD operations
- Only drop to raw SQL via `prisma.$queryRaw` when Prisma genuinely cannot express the query
- Keep query logic in repository files (`src/repositories/`), not in services or route handlers
- Use Prisma's built-in pagination (`skip`, `take`) for list endpoints

## Client

- The Prisma client singleton lives in `src/config/db.ts` — import from there, never instantiate a second client
- The client uses `@prisma/adapter-pg` for the PostgreSQL driver connection
