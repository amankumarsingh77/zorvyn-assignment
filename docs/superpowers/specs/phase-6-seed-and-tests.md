# Phase 6: Seed Data & Tests — Spec

## Goal

Database seed script with default users and sample financial records. Unit tests for services and middleware. E2e tests for all API endpoints. App/server separation to enable testability.

## Requirements

### R1: Database seed script

- `prisma/seed.ts`
- Cleans existing data before seeding (records first, then users — respects FK)
- Creates 3 users:
  - Admin: `admin@example.com` / `admin123` / ADMIN
  - Analyst: `analyst@example.com` / `analyst123` / ANALYST
  - Viewer: `viewer@example.com` / `viewer123` / VIEWER
- All passwords hashed with bcrypt
- Creates ~72 financial records spanning 12 months:
  - Monthly salary (INCOME, $5000)
  - Quarterly freelance (INCOME, $1500)
  - Monthly rent (EXPENSE, $1200)
  - Monthly utilities (EXPENSE, $150-200, randomized)
  - Bi-monthly groceries (EXPENSE, $180-300, randomized)
- Records attributed to admin and analyst users
- Configured in package.json: `"prisma": { "seed": "tsx prisma/seed.ts" }`
- Run via `pnpm db:seed`
- Prints summary of seeded data and credentials on completion

### R2: App/server separation

- `src/app.ts` — creates and configures the Hono app (routes, middleware, error handler)
- `src/index.ts` — imports app from `app.ts`, starts the HTTP server
- This allows e2e tests to import the app without starting a server
- Hono's built-in test client (`app.request()`) works without network

### R3: Vitest configuration

- `vitest.config.ts`
- Globals enabled (no need to import `describe`, `it`, `expect`)
- Environment: node
- Test files: `tests/**/*.test.ts`
- Coverage: v8 provider, includes `src/**/*.ts`, excludes `src/index.ts` and `src/config/**`

### R4: Repository mocks for unit tests

- `tests/unit/helpers/repository-mock.ts`
- Exports `createUserRepositoryMock()` — returns an object with vi.fn() for every exported function in `src/repositories/user.repository.ts`
  - Covers: findUserByEmail, findUserByEmailWithPassword, createUser, findUsers, countUsers, findUserById, createUserWithRole, updateUserById, deleteUserById, countUserRecords
- Exports `createRecordRepositoryMock()` — returns an object with vi.fn() for every exported function in `src/repositories/record.repository.ts`
  - Covers: findRecords, countRecords, findRecordById, createRecord, updateRecordById, deleteRecordById
- Exports `createDashboardRepositoryMock()` — returns an object with vi.fn() for every exported function in `src/repositories/dashboard.repository.ts`
  - Covers: aggregateAmountByType, groupByCategoryAndType, findRecentWithCreator, queryMonthlyTrends
- Services are tested by mocking these repository functions via `vi.mock()`, not by mocking Prisma directly

### R5: Auth service unit tests

- `tests/unit/services/auth.service.test.ts`
- Mocks user repository functions and env
- Tests:
  - register: creates user with hashed password, returns user without password
  - register: throws CONFLICT for duplicate email
  - login: returns JWT token with correct payload for valid credentials
  - login: throws UNAUTHORIZED for wrong password (generic message)
  - login: throws UNAUTHORIZED for non-existent email (same generic message)
  - login: throws FORBIDDEN for inactive user

### R6: Role guard unit tests

- `tests/unit/middleware/roleGuard.test.ts`
- Uses Hono test app with simulated user context
- Tests:
  - Allows access for matching role
  - Denies access (403) for non-matching role
  - Allows any of multiple specified roles
  - Denies roles not in the allowed list

### R7: Auth e2e tests

- `tests/e2e/auth.test.ts`
- Hits real database (requires PostgreSQL running)
- Uses unique email per test run (timestamp-based) to avoid conflicts
- Cleans up test data in afterAll
- Tests:
  - Register: creates user, returns 201, role is VIEWER, no password in response
  - Register: duplicate email returns 409
  - Register: invalid input returns 400 with VALIDATION_ERROR
  - Login: valid credentials return 200 with token
  - Login: wrong password returns 401
  - Login: non-existent email returns 401

### R8: Records e2e tests

- `tests/e2e/records.test.ts`
- Hits real database (requires PostgreSQL running)
- Authenticates as admin (for write ops) and viewer (for read-only / access denial)
- Cleans up test-created records in afterAll
- Tests:
  - List records: authenticated user gets 200 with paginated array
  - Get record by ID: returns 200 with record details
  - Get non-existent record: returns 404
  - Create record: ADMIN gets 201 with created record
  - Create record: VIEWER gets 403 (role denied)
  - Create record: invalid input returns 400 with VALIDATION_ERROR
  - Update record: ADMIN gets 200 with updated fields
  - Delete record: ADMIN gets 200, record no longer retrievable
  - Unauthenticated request: returns 401

### R9: Dashboard e2e tests

- `tests/e2e/dashboard.test.ts`
- Hits real database (requires PostgreSQL running and seed data present)
- Authenticates as analyst (allowed) and viewer (denied)
- Tests:
  - Summary: ANALYST gets 200 with totalIncome, totalExpenses, netBalance
  - Category summary: ANALYST gets 200 with array of category breakdowns
  - Recent activity: ANALYST gets 200 with array of recent records
  - Trends: ANALYST gets 200 with monthly trend data
  - All dashboard endpoints: VIEWER gets 403 (role denied)
  - All dashboard endpoints: unauthenticated returns 401

## Interfaces

### Test structure

```
tests/
├── unit/
│   ├── helpers/
│   │   └── repository-mock.ts
│   ├── services/
│   │   └── auth.service.test.ts
│   └── middleware/
│       └── roleGuard.test.ts
└── e2e/
    ├── auth.test.ts
    ├── records.test.ts
    └── dashboard.test.ts
```

### App export

```typescript
// src/app.ts
export { app };  // Hono instance, named export, no server started

// src/index.ts
import { app } from "./app.js";
serve({ fetch: app.fetch, port: env.PORT });

// tests/e2e/auth.test.ts
import { app } from "../../src/app.js";
const res = await app.request("/auth/register", { method: "POST", ... });
```

## Acceptance Criteria

1. `pnpm db:seed` populates database with 3 users and ~72 records
2. Seeded credentials work for login (all three roles)
3. Dashboard shows meaningful data from seed (non-zero totals)
4. `pnpm test` runs all unit and e2e tests
5. All unit tests pass with mocked repositories (not Prisma)
6. All e2e tests pass against real database (auth, records, dashboard)
7. App still starts correctly via `pnpm dev` after the app/server split
8. `pnpm typecheck` passes with zero errors
