# Finance Data Processing and Access Control Backend — Design Spec

## Overview

Backend for a company finance dashboard where users interact with financial records based on their role. Supports user/role management, financial records CRUD, dashboard analytics, and role-based access control.

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Language | TypeScript | Type safety, self-documenting data models, compile-time error catching |
| Framework | Hono | TypeScript-first, clean API, built-in Zod validation support, no legacy baggage |
| Database | PostgreSQL | Relational data (users, roles, records), strong aggregation for dashboard queries |
| ORM | Prisma | Type-safe queries, readable schema file, auto-generated migrations |
| Validation | Zod | TypeScript-native, runtime validation + type inference from one schema |
| Auth | JWT + bcrypt | Lightweight token auth, proven password hashing |
| Testing | Vitest | Fast, native TS support, same API as Jest |
| Dev tools | tsx, Podman Compose, dotenv | TS execution, containerized Postgres, env config |

### What we deliberately excluded

- **Redis** — no caching requirement
- **GraphQL** — REST is simpler and sufficient
- **NestJS** — hides architecture decisions behind framework opinions
- **Microservices** — monolith is correct for this scope
- **Soft delete** — adds complexity without demonstrating new thinking
- **Audit trails (updatedBy)** — assignment doesn't mention it, YAGNI

## Data Model

### User

| Field | Type | Notes |
|---|---|---|
| id | String (UUID) | Primary key |
| email | String | Unique |
| password | String | bcrypt hashed |
| name | String | |
| role | Enum: VIEWER, ANALYST, ADMIN | Determines access level |
| status | Enum: ACTIVE, INACTIVE | Inactive users cannot authenticate |
| createdAt | DateTime | Default: now |
| updatedAt | DateTime | Auto-updated |

### Record

| Field | Type | Notes |
|---|---|---|
| id | String (UUID) | Primary key |
| amount | Decimal | Never float for financial data |
| type | Enum: INCOME, EXPENSE | |
| category | String | Normalized to lowercase on input |
| date | DateTime | Date of the transaction |
| notes | String? | Optional |
| createdBy | String (FK -> User.id) | onDelete: RESTRICT |
| createdAt | DateTime | Default: now |
| updatedAt | DateTime | Auto-updated |

**Indexes:** `type`, `category`, `date`, `(type, date)` — for filter and aggregation query performance.

**Deletion policy:** `onDelete: RESTRICT` on user-record relation. Financial records must never silently disappear. To remove a user, set status to INACTIVE.

**Category handling:** Free-form string, normalized to lowercase at validation time. A separate Category table adds scope without demonstrating new backend thinking.

## API Endpoints

### Auth

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | /auth/register | Create account (defaults to VIEWER) | No |
| POST | /auth/login | Returns JWT token | No |

### Users (Admin only)

| Method | Path | Description |
|---|---|---|
| GET | /users | List all users (paginated) |
| POST | /users | Create user with assigned role |
| GET | /users/:id | Get user details |
| PATCH | /users/:id | Update user (role, status, name) |
| DELETE | /users/:id | Delete user (blocked if user has records) |

### Records

| Method | Path | Description | Roles |
|---|---|---|---|
| GET | /records | List records (filtered, paginated) | All authenticated |
| POST | /records | Create record | Admin |
| GET | /records/:id | Get single record | All authenticated |
| PATCH | /records/:id | Update record | Admin |
| DELETE | /records/:id | Delete record | Admin |

**Query params for GET /records:** `?type=INCOME&category=salary&startDate=2026-01-01&endDate=2026-03-31&page=1&limit=20`

### Dashboard (Analyst + Admin)

| Method | Path | Description |
|---|---|---|
| GET | /dashboard/summary | Total income, total expenses, net balance |
| GET | /dashboard/category-summary | Category-wise income/expense breakdown |
| GET | /dashboard/recent-activity | Last 10 records |
| GET | /dashboard/trends | Monthly income/expense for last 12 months |

## Access Control Matrix

| Endpoint | VIEWER | ANALYST | ADMIN |
|---|---|---|---|
| Auth (register/login) | Yes | Yes | Yes |
| GET /records, GET /records/:id | Yes | Yes | Yes |
| POST/PATCH/DELETE /records | No | No | Yes |
| GET /dashboard/* | No | Yes | Yes |
| /users/* | No | No | Yes |

## Middleware Chain

```
Request
  -> Auth middleware (verify JWT, reject if invalid, attach user to context)
  -> Role guard (check user.role against route's allowed roles, reject 403 if insufficient)
  -> Validation middleware (run Zod schema on body/query/params, reject 400 if invalid)
  -> Route handler (thin glue: parse validated input, call service, return response)
  -> Service (business logic, calls Prisma)
  -> Prisma -> PostgreSQL

Error handler (global, catches all thrown errors, formats consistent response)
```

## Response Format

### Success

```json
{
  "success": true,
  "data": { },
  "meta": { "page": 1, "limit": 20, "total": 45 }
}
```

`meta` only present on paginated endpoints.

### Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Amount must be a positive number"
  }
}
```

Error codes: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INTERNAL_ERROR`.

## Project Structure

```
src/
├── config/
│   ├── env.ts              # env vars validated with Zod, fail fast
│   └── db.ts               # Prisma client instance
├── middleware/
│   ├── auth.ts             # JWT verification, attach user to context
│   ├── roleGuard.ts        # check role against allowed roles
│   ├── validate.ts         # Zod validation middleware
│   └── errorHandler.ts     # global error handler
├── routes/
│   ├── auth.routes.ts
│   ├── user.routes.ts
│   ├── record.routes.ts
│   └── dashboard.routes.ts
├── services/
│   ├── auth.service.ts
│   ├── user.service.ts
│   ├── record.service.ts
│   └── dashboard.service.ts
├── validations/
│   ├── auth.schema.ts
│   ├── user.schema.ts
│   ├── record.schema.ts
│   └── dashboard.schema.ts
├── helpers/
│   └── response.ts         # success/error response formatters
├── types/
│   └── index.ts            # JWT payload, Hono context types
└── index.ts                # app setup + server start

tests/
├── unit/
│   ├── services/           # mock Prisma, test business logic
│   └── middleware/          # test auth and role guard
└── e2e/                    # spin up app + test DB, hit real endpoints

prisma/
├── schema.prisma
└── seed.ts                 # default admin + sample financial records

podman-compose.yml
.env.example
tsconfig.json
package.json
README.md
```

### Why no controllers layer

Hono route handlers are already thin (parse input, call service, return response). A separate controller that does the same thing adds files and indirection without real separation of concerns. Business logic stays in services.

## Auth Flow

1. **Self-registration** (`POST /auth/register`) — creates user with VIEWER role
2. **Login** (`POST /auth/login`) — validates credentials, checks user is ACTIVE, returns JWT
3. **Admin user creation** (`POST /users`) — admin can create users with any role
4. **Initial admin** — seeded via `prisma/seed.ts` with documented credentials

JWT payload: `{ userId, role }`. Token checked on every authenticated request via auth middleware. Inactive users are rejected at login.

## Assumptions

1. This is a company finance dashboard — all records are shared, not per-user. Access is controlled by role, not ownership.
2. Category is a free-form string (normalized to lowercase), not a separate entity.
3. Financial records should never be silently deleted when a user is removed.
4. Self-registered users default to VIEWER — elevated roles require admin action.
5. Dashboard summaries aggregate all records, not filtered by user.

## Scope Boundaries

**In scope:** Everything described above.

**Out of scope:** Rate limiting, search, soft delete, Swagger/OpenAPI generation, WebSocket real-time updates, file uploads, multi-tenancy.
