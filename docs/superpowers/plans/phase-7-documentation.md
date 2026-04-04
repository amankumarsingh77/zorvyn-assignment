# Phase 7: Documentation & Cleanup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Write a comprehensive README with setup instructions, API documentation, architecture overview, assumptions, and tradeoffs. Final cleanup pass.

**Architecture:** Single README.md covering everything a reviewer needs to evaluate the project.

**Tech Stack:** Markdown

**Depends on:** Phase 6 (seed & tests) completed and verified.

---

### Task 1: Create the README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create README.md**

```markdown
# Finance Dashboard Backend

A backend API for a company finance dashboard with role-based access control, financial records management, and analytics.

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Hono
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Validation:** Zod
- **Auth:** JWT + bcrypt
- **Testing:** Vitest
- **Container:** Podman

## Quick Start

### Prerequisites

- Node.js 18+
- Podman and podman-compose
- npm

### Setup

1. Clone the repository:

```bash
git clone <repo-url>
cd zorvyn-assignment
```

2. Install dependencies:

```bash
npm install
```

3. Start PostgreSQL:

```bash
podman-compose up -d
```

4. Set up environment:

```bash
cp .env.example .env
```

5. Run database migrations:

```bash
npx prisma migrate dev
```

6. Seed the database:

```bash
npm run db:seed
```

7. Start the development server:

```bash
npm run dev
```

Server runs at `http://localhost:3000`.

### Seeded Users

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | admin123 |
| Analyst | analyst@example.com | analyst123 |
| Viewer | viewer@example.com | viewer123 |

## API Documentation

### Authentication

All endpoints except `/auth/*` and `/health` require a Bearer token in the Authorization header:

```
Authorization: Bearer <token>
```

#### POST /auth/register

Create a new account. Defaults to VIEWER role.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name"
}
```

**Response:** `201`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "VIEWER",
    "status": "ACTIVE",
    "createdAt": "2026-04-01T00:00:00.000Z"
  }
}
```

#### POST /auth/login

**Body:**
```json
{
  "email": "admin@example.com",
  "password": "admin123"
}
```

**Response:** `200`
```json
{
  "success": true,
  "data": {
    "token": "jwt-token-here",
    "user": {
      "id": "uuid",
      "email": "admin@example.com",
      "name": "Admin User",
      "role": "ADMIN"
    }
  }
}
```

### Users (Admin only)

#### GET /users?page=1&limit=20

List all users with pagination.

#### POST /users

Create a user with a specific role.

**Body:**
```json
{
  "email": "analyst@company.com",
  "password": "password123",
  "name": "New Analyst",
  "role": "ANALYST"
}
```

#### GET /users/:id

Get a specific user by ID.

#### PATCH /users/:id

Update a user's name, role, or status.

**Body (all fields optional):**
```json
{
  "name": "Updated Name",
  "role": "ADMIN",
  "status": "INACTIVE"
}
```

#### DELETE /users/:id

Delete a user. Fails if the user has associated financial records (returns 409).

### Financial Records

#### GET /records?page=1&limit=20&type=INCOME&category=salary&startDate=2026-01-01T00:00:00.000Z&endDate=2026-12-31T23:59:59.000Z

List records with optional filters and pagination. All query params are optional.

**Roles:** All authenticated users.

#### GET /records/:id

Get a single record with creator info.

**Roles:** All authenticated users.

#### POST /records

Create a new financial record.

**Roles:** Admin only.

**Body:**
```json
{
  "amount": 5000,
  "type": "INCOME",
  "category": "Salary",
  "date": "2026-03-15T00:00:00.000Z",
  "notes": "March salary"
}
```

Note: Category is normalized to lowercase on input.

#### PATCH /records/:id

Update a record. All fields optional.

**Roles:** Admin only.

#### DELETE /records/:id

Delete a record.

**Roles:** Admin only.

### Dashboard (Analyst + Admin)

#### GET /dashboard/summary?startDate=...&endDate=...

Returns total income, total expenses, and net balance. Date filters optional.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalIncome": 60000,
    "totalExpenses": 25000,
    "netBalance": 35000
  }
}
```

#### GET /dashboard/category-summary?startDate=...&endDate=...

Returns income/expense totals grouped by category.

**Response:**
```json
{
  "success": true,
  "data": [
    { "category": "salary", "type": "INCOME", "total": 60000 },
    { "category": "rent", "type": "EXPENSE", "total": 14400 }
  ]
}
```

#### GET /dashboard/recent-activity

Returns the 10 most recent financial records.

#### GET /dashboard/trends

Returns monthly income and expense totals for the last 12 months.

**Response:**
```json
{
  "success": true,
  "data": [
    { "month": "2025-05", "income": 5000, "expense": 2100 },
    { "month": "2025-06", "income": 6500, "expense": 1950 }
  ]
}
```

### Health Check

#### GET /health

Returns database connectivity status. No authentication required.

## Access Control

| Endpoint | VIEWER | ANALYST | ADMIN |
|----------|--------|---------|-------|
| POST /auth/register, /login | Yes | Yes | Yes |
| GET /records | Yes | Yes | Yes |
| POST/PATCH/DELETE /records | No | No | Yes |
| GET /dashboard/* | No | Yes | Yes |
| /users/* | No | No | Yes |

## Error Responses

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Amount must be a positive number"
  }
}
```

Error codes: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INTERNAL_ERROR`

## Project Structure

```
src/
├── config/          # Environment validation, database client
├── middleware/       # Auth, role guard, validation, error handler
├── routes/          # Route definitions
├── services/        # Business logic
├── validations/     # Zod schemas
├── helpers/         # Response formatters
├── types/           # Shared TypeScript types
├── app.ts           # Hono app setup
└── index.ts         # Server entry point

tests/
├── unit/            # Service and middleware unit tests
└── e2e/             # API endpoint tests

prisma/
├── schema.prisma    # Data model
└── seed.ts          # Sample data
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled server |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run typecheck` | Check types without emitting |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed the database |
| `npm run db:generate` | Regenerate Prisma client |

## Design Decisions and Tradeoffs

1. **Hono over Express** — TypeScript-first framework with cleaner types and built-in validation support. Express's type system requires manual augmentation and casting.

2. **Flat-by-layer over feature folders** — With only 3 domains (auth, records, dashboard), feature folders add indirection without benefit. The reviewer sees the entire API surface by opening `routes/`.

3. **No controllers layer** — Hono's route handlers are thin enough (parse → service → respond) that a separate controller layer just duplicates function signatures.

4. **PostgreSQL over SQLite** — Financial data needs proper aggregation (GROUP BY, SUM, date_trunc). PostgreSQL handles this natively and demonstrates real-world database skills.

5. **Shared data model** — All financial records are visible to all authenticated users, scoped by role permissions rather than ownership. This models a company finance dashboard, not a personal finance app.

6. **RESTRICT on user delete** — Financial records must never silently disappear. Users with records cannot be deleted; set status to INACTIVE instead.

7. **Category as normalized string** — Free-form categories normalized to lowercase at input, rather than a separate Category entity. Avoids extra CRUD surface without clear benefit.

8. **Decimal for amounts** — Uses PostgreSQL DECIMAL(12,2) to avoid floating-point errors in financial calculations.

## Assumptions

1. Company finance dashboard — shared data, role-based access (not per-user data)
2. Self-registered users default to VIEWER — admin promotes as needed
3. Dashboard summaries aggregate all records across all users
4. JWT tokens expire after 24 hours
5. Categories are free-form text, not a managed entity

## Running Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Specific test file
npx vitest run tests/unit/services/auth.service.test.ts
```

Tests require a running PostgreSQL instance (e2e tests hit the real database).
```

---

### Task 2: Final cleanup and verification

- [ ] **Step 1: Verify .env.example is complete**

Ensure `.env.example` has all required variables:

```
DATABASE_URL=postgresql://finance_user:finance_pass@localhost:5432/finance_db
JWT_SECRET=your-secret-key-change-in-production
PORT=3000
```

- [ ] **Step 2: Run full verification**

```bash
# TypeScript check
npx tsc --noEmit

# Run all tests
npm test

# Start server and test health
npm run dev &
sleep 2
curl http://localhost:3000/health
kill %1
```

Expected: All checks pass.

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "docs: comprehensive README with API docs, setup guide, and design decisions"
```

---

## Phase 7 Verification Checklist

After completing all tasks, verify:

1. README covers: setup, API docs, access control, error format, project structure, scripts, design decisions, assumptions
2. A new developer can follow the README and have the project running in under 5 minutes
3. `.env.example` has all required variables
4. All TypeScript checks pass
5. All tests pass
6. The project is in a clean, committable state
