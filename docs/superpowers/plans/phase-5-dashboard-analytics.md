# Phase 5: Dashboard & Analytics — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement dashboard summary APIs — totals, category breakdown, recent activity, and monthly trends. Accessible to ANALYST and ADMIN roles only.

**Architecture:** Dashboard service uses Prisma aggregation queries and raw SQL (for monthly trends with date_trunc). Routes protected by auth + role guard (ANALYST, ADMIN).

**Tech Stack:** Hono, Prisma, Zod, PostgreSQL aggregate functions

**Depends on:** Phase 4 (financial records) completed and verified.

---

### Task 1: Create dashboard validation schemas

**Files:**
- Create: `src/validations/dashboard.schema.ts`

- [ ] **Step 1: Create src/validations/dashboard.schema.ts**

```typescript
import { z } from "zod";

export const dashboardQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
```

---

### Task 2: Create dashboard service

**Files:**
- Create: `src/services/dashboard.service.ts`

- [ ] **Step 1: Create src/services/dashboard.service.ts**

```typescript
import { Prisma } from "@prisma/client";
import { prisma } from "../config/db.js";
import type { DashboardQuery } from "../validations/dashboard.schema.js";

function buildDateFilter(query: DashboardQuery): Prisma.RecordWhereInput {
  if (!query.startDate && !query.endDate) return {};

  const date: Prisma.DateTimeFilter = {};
  if (query.startDate) date.gte = new Date(query.startDate);
  if (query.endDate) date.lte = new Date(query.endDate);

  return { date };
}

export async function getSummary(query: DashboardQuery) {
  const where = buildDateFilter(query);

  const [incomeResult, expenseResult] = await Promise.all([
    prisma.record.aggregate({
      where: { ...where, type: "INCOME" },
      _sum: { amount: true },
    }),
    prisma.record.aggregate({
      where: { ...where, type: "EXPENSE" },
      _sum: { amount: true },
    }),
  ]);

  const totalIncome = incomeResult._sum.amount?.toNumber() ?? 0;
  const totalExpenses = expenseResult._sum.amount?.toNumber() ?? 0;
  const netBalance = totalIncome - totalExpenses;

  return {
    totalIncome,
    totalExpenses,
    netBalance,
  };
}

export async function getCategorySummary(query: DashboardQuery) {
  const where = buildDateFilter(query);

  const results = await prisma.record.groupBy({
    by: ["category", "type"],
    where,
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
  });

  return results.map((r) => ({
    category: r.category,
    type: r.type,
    total: r._sum.amount?.toNumber() ?? 0,
  }));
}

export async function getRecentActivity() {
  const records = await prisma.record.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      amount: true,
      type: true,
      category: true,
      date: true,
      notes: true,
      createdAt: true,
      creator: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return records;
}

export async function getMonthlyTrends() {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const results = await prisma.$queryRaw<
    Array<{ month: Date; type: string; total: Prisma.Decimal }>
  >`
    SELECT
      date_trunc('month', date) AS month,
      type,
      SUM(amount) AS total
    FROM records
    WHERE date >= ${twelveMonthsAgo}
    GROUP BY date_trunc('month', date), type
    ORDER BY month ASC
  `;

  const trendsMap = new Map<string, { month: string; income: number; expense: number }>();

  for (const row of results) {
    const monthKey = new Date(row.month).toISOString().slice(0, 7); // "2026-03"
    const existing = trendsMap.get(monthKey) ?? { month: monthKey, income: 0, expense: 0 };

    if (row.type === "INCOME") {
      existing.income = Number(row.total);
    } else {
      existing.expense = Number(row.total);
    }

    trendsMap.set(monthKey, existing);
  }

  return Array.from(trendsMap.values());
}
```

---

### Task 3: Create dashboard routes

**Files:**
- Create: `src/routes/dashboard.routes.ts`

- [ ] **Step 1: Create src/routes/dashboard.routes.ts**

```typescript
import { Hono } from "hono";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/roleGuard.js";
import { validate } from "../middleware/validate.js";
import { dashboardQuerySchema } from "../validations/dashboard.schema.js";
import * as dashboardService from "../services/dashboard.service.js";
import { successResponse } from "../helpers/response.js";

const dashboard = new Hono();

// All dashboard routes require ANALYST or ADMIN role
dashboard.use("*", authenticate, requireRole("ANALYST", "ADMIN"));

dashboard.get("/summary", validate(dashboardQuerySchema, "query"), async (c) => {
  const query = c.get("validated");
  const summary = await dashboardService.getSummary(query);
  return c.json(successResponse(summary));
});

dashboard.get("/category-summary", validate(dashboardQuerySchema, "query"), async (c) => {
  const query = c.get("validated");
  const categories = await dashboardService.getCategorySummary(query);
  return c.json(successResponse(categories));
});

dashboard.get("/recent-activity", async (c) => {
  const activity = await dashboardService.getRecentActivity();
  return c.json(successResponse(activity));
});

dashboard.get("/trends", async (c) => {
  const trends = await dashboardService.getMonthlyTrends();
  return c.json(successResponse(trends));
});

export default dashboard;
```

- [ ] **Step 2: Mount dashboard routes in src/index.ts**

Add to `src/index.ts`:

```typescript
import dashboard from "./routes/dashboard.routes.js";

app.route("/dashboard", dashboard);
```

---

### Task 4: Verify dashboard end-to-end

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Login as admin and verify summaries**

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "viewer@example.com", "password": "password123"}' | jq -r '.data.token')

# Summary
curl -X GET http://localhost:3000/dashboard/summary \
  -H "Authorization: Bearer $TOKEN"

# Category summary
curl -X GET http://localhost:3000/dashboard/category-summary \
  -H "Authorization: Bearer $TOKEN"

# Recent activity
curl -X GET http://localhost:3000/dashboard/recent-activity \
  -H "Authorization: Bearer $TOKEN"

# Monthly trends
curl -X GET http://localhost:3000/dashboard/trends \
  -H "Authorization: Bearer $TOKEN"
```

Expected: All return `200` with `{"success":true,"data":{...}}`

- [ ] **Step 3: Test summary with date filters**

```bash
curl -X GET "http://localhost:3000/dashboard/summary?startDate=2026-03-01T00:00:00.000Z&endDate=2026-03-31T23:59:59.000Z" \
  -H "Authorization: Bearer $TOKEN"
```

Expected: `200` with totals filtered to March 2026.

- [ ] **Step 4: Test that VIEWER cannot access dashboard**

```bash
VIEWER_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "viewer2@example.com", "password": "password123"}' | jq -r '.data.token')

curl -X GET http://localhost:3000/dashboard/summary \
  -H "Authorization: Bearer $VIEWER_TOKEN"
```

Expected: `403` with `"Insufficient permissions"`

- [ ] **Step 5: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: dashboard APIs with summary, category breakdown, recent activity, and monthly trends"
```

---

## Phase 5 Verification Checklist

After completing all tasks, verify:

1. `GET /dashboard/summary` returns totalIncome, totalExpenses, netBalance
2. `GET /dashboard/category-summary` returns category-wise breakdown
3. `GET /dashboard/recent-activity` returns last 10 records
4. `GET /dashboard/trends` returns monthly income/expense for last 12 months
5. Date filters work on summary and category-summary
6. VIEWER gets 403 on all dashboard endpoints
7. ANALYST and ADMIN can access all dashboard endpoints
8. Empty database returns zeroes, not errors
9. `npx tsc --noEmit` passes
