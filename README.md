# Finance Dashboard Backend

A role-based financial records API with dashboard analytics, built with TypeScript and Hono.

## Table of Contents

- [Quick Start](#quick-start)
- [Scripts](#scripts)
- [API Endpoints](#api-endpoints)
- [Access Control](#access-control)
- [Error Responses](#error-responses)
- [Project Structure](#project-structure)
- [Design Decisions](#design-decisions)
- [Assumptions](#assumptions)
- [Running Tests](#running-tests)

## Tech Stack

TypeScript, Hono, Prisma v7, PostgreSQL, Zod, JWT + bcrypt, Vitest, Podman Compose

## Quick Start

**Prerequisites:** Node.js 18+, pnpm, Podman + podman-compose

```bash
git clone <repo-url> && cd zorvyn-assignment
pnpm install
pnpm infra:up          # Start PostgreSQL via podman-compose
cp .env.example .env
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev               # Server starts at http://localhost:3000
```

### Seeded Users

| Email               | Password   | Role    |
| ------------------- | ---------- | ------- |
| admin@example.com   | admin123   | ADMIN   |
| analyst@example.com | analyst123 | ANALYST |
| viewer@example.com  | viewer123  | VIEWER  |

## Scripts

| Script      | Command                | Description                         |
| ----------- | ---------------------- | ----------------------------------- |
| dev         | `tsx watch src/index.ts` | Start dev server with hot reload  |
| build       | `tsc`                  | Compile TypeScript to dist/         |
| start       | `node dist/src/index.js` | Run compiled output               |
| typecheck   | `tsc --noEmit`         | Type check without emitting         |
| test        | `vitest run`           | Run all tests                       |
| test:unit   | `vitest run tests/unit` | Run unit tests only                |
| test:e2e    | `vitest run tests/e2e` | Run e2e tests (requires database)  |
| test:watch  | `vitest`               | Watch mode tests                    |
| db:generate | `prisma generate`      | Regenerate Prisma client            |
| db:migrate  | `prisma migrate dev`   | Create and apply migrations         |
| db:seed     | `tsx prisma/seed.ts`   | Seed database with sample data      |
| infra:up    | `podman-compose up -d` | Start PostgreSQL                    |
| infra:down  | `podman-compose down`  | Stop PostgreSQL                     |

## API Endpoints

All authenticated endpoints require the header: `Authorization: Bearer <token>`

### Health

#### `GET /health`

Health check. Public, no authentication required.

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "database": "connected"
  }
}
```

---

### Authentication

#### `POST /auth/register`

Register a new user. Public. New users are assigned the VIEWER role.

**Request body:**

```json
{
  "email": "user@example.com",
  "password": "secret123",
  "name": "Jane Doe"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Jane Doe",
    "role": "VIEWER",
    "status": "ACTIVE",
    "createdAt": "2026-04-01T00:00:00.000Z",
    "updatedAt": "2026-04-01T00:00:00.000Z"
  }
}
```

#### `POST /auth/login`

Authenticate and receive a JWT token. Public.

**Request body:**

```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "token": "eyJ...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "Jane Doe",
      "role": "VIEWER"
    }
  }
}
```

---

### Users

All user endpoints require ADMIN role.

#### `GET /users`

List users with pagination.

**Query parameters:** `?page=1&limit=20`

Response includes `meta: { page, limit, total, totalPages, hasNextPage }`.

#### `POST /users`

Create a user with a specific role.

**Request body:**

```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "name": "New User",
  "role": "VIEWER"
}
```

Role must be one of: `VIEWER`, `ANALYST`, `ADMIN`.

#### `GET /users/:id`

Get a single user by ID.

#### `PATCH /users/:id`

Update a user. All fields are optional.

**Request body:**

```json
{
  "name": "Updated Name",
  "role": "ANALYST",
  "status": "INACTIVE"
}
```

#### `DELETE /users/:id`

Delete a user. Fails if the user has created any financial records (RESTRICT policy).

---

### Records

Read endpoints are available to all authenticated users. Write endpoints require ADMIN role.

#### `GET /records`

List records with pagination and filtering. All authenticated users.

**Query parameters:** `?page=1&limit=20&type=INCOME&category=salary&startDate=2026-01-01T00:00:00Z&endDate=2026-12-31T23:59:59Z`

All query parameters are optional. Response includes `meta` pagination info and each record includes `creator: { id, name, email }`.

#### `GET /records/:id`

Get a single record by ID. All authenticated users.

#### `POST /records`

Create a financial record. ADMIN only.

**Request body:**

```json
{
  "amount": 1500.50,
  "type": "INCOME",
  "category": "salary",
  "date": "2026-04-01T00:00:00Z",
  "notes": "Monthly salary"
}
```

Type must be `INCOME` or `EXPENSE`. Category is normalized to lowercase on save.

#### `PATCH /records/:id`

Update a record. ADMIN only. All fields are optional.

**Request body:**

```json
{
  "amount": 1600.00,
  "type": "INCOME",
  "category": "salary",
  "date": "2026-04-01T00:00:00Z",
  "notes": "Updated monthly salary"
}
```

#### `DELETE /records/:id`

Delete a record. ADMIN only.

---

### Dashboard

All dashboard endpoints require ANALYST or ADMIN role.

#### `GET /dashboard/summary`

Total income, total expenses, and net balance.

**Query parameters:** `?startDate=2026-01-01T00:00:00Z&endDate=2026-12-31T23:59:59Z` (optional)

**Response:**

```json
{
  "success": true,
  "data": {
    "totalIncome": 5000.00,
    "totalExpenses": 1500.50,
    "netBalance": 3499.50
  }
}
```

#### `GET /dashboard/category-summary`

Breakdown of totals by category and type.

**Query parameters:** `?startDate=...&endDate=...` (optional)

**Response:**

```json
{
  "success": true,
  "data": [
    { "category": "salary", "type": "INCOME", "total": 5000.00 },
    { "category": "rent", "type": "EXPENSE", "total": 1200.00 }
  ]
}
```

#### `GET /dashboard/recent-activity`

The 10 most recent financial records, including `creator: { id, name }`.

#### `GET /dashboard/trends`

Income and expense totals over time. Supports monthly (default) and weekly granularity.

**Query parameters:** `?granularity=monthly` or `?granularity=weekly`

**Monthly response** (default, last 12 months):

```json
{
  "success": true,
  "data": [
    { "month": "2025-05", "income": 5000.00, "expense": 1200.50 },
    { "month": "2025-06", "income": 4800.00, "expense": 1350.00 }
  ]
}
```

**Weekly response** (last 12 weeks, keyed by week start date):

```json
{
  "success": true,
  "data": [
    { "week": "2025-05-26", "income": 1250.00, "expense": 300.00 },
    { "week": "2025-06-02", "income": 1200.00, "expense": 337.50 }
  ]
}
```

### Audit Logs

Audit log endpoints require ADMIN role. Record create, update, and delete operations are automatically logged.

#### `GET /audit-logs`

List audit logs with pagination and filtering. ADMIN only.

**Query parameters:** `?page=1&limit=20&entityId=<uuid>&userId=<uuid>&action=CREATE&startDate=2026-01-01T00:00:00Z&endDate=2026-12-31T23:59:59Z`

All query parameters are optional. Action must be one of: `CREATE`, `UPDATE`, `DELETE`.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "action": "CREATE",
      "entity": "Record",
      "entityId": "uuid",
      "userId": "uuid",
      "changes": { "amount": 1500.50, "type": "INCOME", "category": "salary" },
      "createdAt": "2026-04-01T00:00:00.000Z",
      "user": { "id": "uuid", "name": "Admin User", "email": "admin@example.com" }
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 42 }
}
```

---

## Access Control

| Endpoint              | VIEWER | ANALYST | ADMIN |
| --------------------- | ------ | ------- | ----- |
| `GET /health`         | Yes    | Yes     | Yes   |
| `POST /auth/register` | Yes    | Yes     | Yes   |
| `POST /auth/login`    | Yes    | Yes     | Yes   |
| `GET /records`        | Yes    | Yes     | Yes   |
| `GET /records/:id`    | Yes    | Yes     | Yes   |
| `POST /records`       | No     | No      | Yes   |
| `PATCH /records/:id`  | No     | No      | Yes   |
| `DELETE /records/:id` | No     | No      | Yes   |
| `GET /users`          | No     | No      | Yes   |
| `POST /users`         | No     | No      | Yes   |
| `GET /users/:id`      | No     | No      | Yes   |
| `PATCH /users/:id`    | No     | No      | Yes   |
| `DELETE /users/:id`   | No     | No      | Yes   |
| `GET /dashboard/*`    | No     | Yes     | Yes   |
| `GET /audit-logs`     | No     | No      | Yes   |

## Error Responses

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description"
  }
}
```

### Common Error Codes

| Code             | HTTP Status | Description                              |
| ---------------- | ----------- | ---------------------------------------- |
| VALIDATION_ERROR | 400         | Request body or query params are invalid |
| UNAUTHORIZED     | 401         | Missing or invalid JWT token             |
| FORBIDDEN        | 403         | User's role lacks permission             |
| NOT_FOUND        | 404         | Resource does not exist                  |
| CONFLICT         | 409         | Resource already exists (e.g., email)    |

## Project Structure

```
src/
├── app.ts                  — Hono app with middleware and route mounting
├── index.ts                — Server entry point
├── config/
│   ├── db.ts               — Prisma client singleton (uses @prisma/adapter-pg)
│   └── env.ts              — Zod-validated environment variables
├── constants/
│   └── http.ts             — HTTP status code constants
├── helpers/
│   └── response.ts         — successResponse() / errorResponse() wrappers
├── middleware/
│   ├── auth.ts             — JWT verification, attaches user to context
│   ├── errorHandler.ts     — Global error handler
│   ├── roleGuard.ts        — Role-based access control
│   └── validate.ts         — Zod schema validation middleware
├── repositories/
│   ├── audit.repository.ts    — Audit log queries
│   ├── dashboard.repository.ts — Aggregation queries for analytics
│   ├── health.repository.ts    — Database health check
│   ├── record.repository.ts    — Financial record CRUD queries
│   └── user.repository.ts      — User CRUD queries
├── routes/
│   ├── audit.routes.ts     — Audit log listing (admin)
│   ├── auth.routes.ts      — Registration and login
│   ├── dashboard.routes.ts — Summary, trends, category breakdown
│   ├── record.routes.ts    — Financial record CRUD
│   └── user.routes.ts      — User management (admin)
├── services/
│   ├── audit.service.ts    — Audit log business logic
│   ├── auth.service.ts     — Auth business logic
│   ├── dashboard.service.ts — Analytics computation
│   ├── record.service.ts   — Record business logic
│   └── user.service.ts     — User business logic
├── types/
│   └── index.ts            — JwtPayload, Variables, AppError
└── validations/
    ├── audit.schema.ts     — Audit log query schemas
    ├── auth.schema.ts      — Register/login schemas
    ├── dashboard.schema.ts — Dashboard query schemas
    ├── record.schema.ts    — Record CRUD schemas
    └── user.schema.ts      — User CRUD schemas
prisma/
├── schema.prisma           — User, Record, and AuditLog models
├── seed.ts                 — Sample data seeder
└── migrations/             — Database migrations
```

**Request flow:** Auth middleware -> Role guard -> Validation middleware -> Route handler -> Service -> Repository -> Prisma -> PostgreSQL

## Design Decisions

### Why Hono over Express

Hono is lightweight (~14KB), built on web standards (Request/Response), has first-class TypeScript support, and is significantly faster than Express. For a focused API like this, it provides everything needed without the overhead.

### Why flat-by-layer over feature folders

With four domain areas (auth, users, records, dashboard), the project is small enough that grouping by technical layer (routes, services, repositories) keeps things simple and navigable. Feature folders add indirection without benefit at this scale.

### Why no controllers layer

Hono route handlers are already thin -- they validate input, call a service, and return a response. Adding a separate controller layer would just duplicate this without adding value. The route handlers effectively are the controllers.

### Why PostgreSQL over SQLite/MongoDB

Financial data is inherently relational (users own records, records reference creators). PostgreSQL provides native Decimal types for accurate money handling, powerful aggregation functions for dashboard analytics (SUM, GROUP BY, date_trunc), and proper transaction support. SQLite lacks concurrent access; MongoDB lacks relational integrity.

### Why shared data model (not per-user)

This is a company-wide finance dashboard, not a personal finance app. All financial records belong to the organization and are visible to all authenticated users. The `createdBy` field tracks authorship for audit purposes, not for access control.

### Why RESTRICT on user delete

When a user has created financial records, deleting them would either orphan those records (losing audit trail) or cascade-delete financial data. RESTRICT prevents this -- admins must deactivate users instead, preserving data integrity.

### Why category as normalized string (not separate table)

A separate categories table would require admin endpoints to manage categories, pre-population, and foreign key joins on every query. Free-form strings normalized to lowercase provide flexibility without overhead. If categories needed validation against a fixed list, a separate table would make sense.

### Why Decimal(12,2) for amounts (not float)

IEEE 754 floating point cannot represent values like 0.10 exactly, leading to rounding errors in financial calculations. PostgreSQL's Decimal type stores exact values. Prisma exposes this as a Decimal object, preserving precision through the entire stack.

## Assumptions

- Single-tenant system (one organization)
- No file uploads, rate limiting, soft delete, or multi-tenancy (explicitly out of scope)
- Self-registration creates VIEWER role; only ADMINs can assign other roles
- All financial records are company-wide, visible to all authenticated users
- Category values are free-form text, normalized to lowercase on save
- JWT tokens are stateless -- no token revocation or refresh token mechanism
- The API serves a frontend dashboard; no server-side rendering

## Running Tests

```bash
pnpm test          # Run all tests
pnpm test:unit     # Unit tests only
pnpm test:e2e      # E2E tests (requires running database)
pnpm test:watch    # Watch mode

# Run a single test file
pnpm vitest run tests/unit/services/auth.service.test.ts
```
