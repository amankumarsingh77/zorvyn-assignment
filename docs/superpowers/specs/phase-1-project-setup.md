# Phase 1: Project Setup — Spec

## Goal

A working TypeScript + Hono + Prisma + PostgreSQL project that starts, connects to the database, and responds to a health check endpoint. This is the foundation everything else builds on.

## Requirements

### R1: Node.js + TypeScript project

- Package manager: pnpm (all commands use pnpm, never npm or yarn)
- `"type": "module"` in package.json (ESM)
- Strict TypeScript — `"strict": true` in tsconfig
- No `any` types, no `@ts-ignore`

### R2: Dependencies

**Production:**
- `hono` — HTTP framework
- `@hono/node-server` — Node.js adapter for Hono
- `prisma` — ORM CLI
- `@prisma/client` — ORM runtime
- `zod` — validation
- `dotenv` — env loading
- `jsonwebtoken` — JWT auth
- `bcrypt` — password hashing

**Dev:**
- `typescript` — compiler
- `@types/node`, `@types/jsonwebtoken`, `@types/bcrypt` — type defs
- `tsx` — run TS directly
- `vitest` — testing

### R3: PostgreSQL via Podman

- `podman-compose.yml` with PostgreSQL 16 Alpine
- Container name: `finance-db`
- Credentials: `finance_user` / `finance_pass` / `finance_db`
- Port: 5432 mapped to host
- Named volume for data persistence

### R4: Environment configuration

- `.env` with `DATABASE_URL`, `JWT_SECRET`, `PORT`
- `.env.example` with placeholder values (committed)
- `.env` is gitignored (never committed)
- `src/config/env.ts` validates all env vars with Zod at startup
- App crashes immediately if env vars are missing or invalid (fail fast)

### R5: Prisma schema

- Two models: `User` and `Record` (as defined in the main design spec)
- Enums: `Role` (VIEWER, ANALYST, ADMIN), `Status` (ACTIVE, INACTIVE), `RecordType` (INCOME, EXPENSE)
- `amount` uses `Decimal(12, 2)` — never float
- `createdBy` FK with `onDelete: Restrict`
- Indexes on Record: `type`, `category`, `date`, `(type, date)`
- Tables mapped to lowercase: `@@map("users")`, `@@map("records")`
- Migration applied successfully, no schema drift

### R6: Database client

- `src/config/db.ts` exports a singleton `PrismaClient` instance
- Imported by services, never instantiated elsewhere

### R7: Shared types

- `src/types/index.ts` exports `JwtPayload` (`{ userId: string, role: Role }`) and `Variables` (`{ user: JwtPayload }`)

### R8: Response helpers

- `src/helpers/response.ts` exports `successResponse(data, meta?)` and `errorResponse(code, message)`
- Success format: `{ success: true, data, meta? }`
- Error format: `{ success: false, error: { code, message } }`
- `meta` only included when provided (paginated endpoints)

### R9: Hono app with health check

- `GET /health` — checks database connectivity via `SELECT 1`
- Returns `{ success: true, data: { status: "healthy", database: "connected" } }` on success
- Returns 503 with `{ status: "unhealthy", database: "disconnected" }` on failure
- Server starts on configured PORT

### R10: Directory scaffolding

- Empty directories created for: `src/middleware/`, `src/routes/`, `src/services/`, `src/validations/`, `tests/unit/`, `tests/e2e/`
- `.gitkeep` files so git tracks them

### R11: Scripts

| Script | Command |
|---|---|
| `dev` | `tsx watch src/index.ts` |
| `build` | `tsc` |
| `start` | `node dist/src/index.js` |
| `typecheck` | `tsc --noEmit` |
| `test` | `vitest run` |
| `test:watch` | `vitest` |
| `db:generate` | `prisma generate` |
| `db:migrate` | `prisma migrate dev` |
| `db:push` | `prisma db push` |
| `db:seed` | `tsx prisma/seed.ts` |

## Acceptance Criteria

1. `podman-compose up -d` starts PostgreSQL without errors
2. `pnpm dev` starts the Hono server on configured port
3. `curl http://localhost:3000/health` returns healthy response with database connected
4. `pnpm typecheck` passes with zero errors
5. Project structure matches the spec exactly (all files and directories present)
6. `.env` is gitignored, `.env.example` is committed
7. Prisma migration applies cleanly, schema matches database
