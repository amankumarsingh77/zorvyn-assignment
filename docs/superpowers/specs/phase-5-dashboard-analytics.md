# Phase 5: Dashboard & Analytics — Spec

## Goal

Dashboard summary APIs — totals, category breakdown, recent activity, and monthly trends. Accessible to ANALYST and ADMIN roles only.

## Requirements

### R1: Dashboard validation schemas

- `src/validations/dashboard.schema.ts`
- `dashboardQuerySchema`:
  - `startDate`: ISO 8601 datetime (optional)
  - `endDate`: ISO 8601 datetime (optional)
- Used by summary and category-summary endpoints for date filtering
- Exports `DashboardQuery` type

### R2: Dashboard repository

- `src/repositories/dashboard.repository.ts`
- **aggregateAmountByType(type, dateFilter?):**
  - Uses Prisma `aggregate` with `_sum` on `amount`, filtered by `type`
  - Applies date filter (`gte`/`lte` on `date`) if provided
  - Returns the raw Prisma aggregate result (Decimal or null)
- **groupByCategoryAndType(dateFilter?):**
  - Uses Prisma `groupBy` on `[category, type]` with `_sum` on `amount`
  - Ordered by `_sum.amount` descending
  - Applies date filter if provided
  - Returns raw Prisma groupBy result array
- **findRecentWithCreator(limit):**
  - Fetches `limit` records ordered by `createdAt` descending
  - Includes creator info via Prisma `include` (`{ id, name }`)
  - Returns raw Prisma result array
- **queryMonthlyTrends(sinceDate):**
  - Raw SQL query using `date_trunc('month', date)` for grouping
  - Groups by month and type, sums amounts
  - Filters records where `date >= sinceDate`
  - Returns raw query result rows

### R3: Dashboard service

- `src/services/dashboard.service.ts`
- Calls repository functions — never imports Prisma directly
- **getSummary(query):**
  - Two parallel calls to `aggregateAmountByType` — one for INCOME, one for EXPENSE
  - Converts Decimal results to numbers via `.toNumber()`, defaults null sums to 0
  - Returns `{ totalIncome: number, totalExpenses: number, netBalance: number }`
  - `netBalance = totalIncome - totalExpenses`
  - Returns zeroes (not nulls or errors) when no records exist
- **getCategorySummary(query):**
  - Calls `groupByCategoryAndType` with optional date filter
  - Maps results to `{ category, type, total }`, converting Decimals to numbers
  - Returns empty array when no records exist
- **getRecentActivity():**
  - Calls `findRecentWithCreator(10)`
  - No date filtering — always returns the 10 most recent
  - Returns `{ id, amount, type, category, date, notes, createdAt, creator }`
- **getMonthlyTrends():**
  - Calls `queryMonthlyTrends` with a date 12 months ago
  - Transforms raw rows into `{ month: "YYYY-MM", income: number, expense: number }`
  - Months with no data for one type show 0 (not omitted)
  - Ordered by month ascending (oldest first)

### R4: Dashboard routes

- `src/routes/dashboard.routes.ts`
- All routes protected by `authenticate` + `requireRole("ANALYST", "ADMIN")`
- `GET /dashboard/summary` — validates query, returns totals
- `GET /dashboard/category-summary` — validates query, returns category breakdown
- `GET /dashboard/recent-activity` — returns last 10 records (no query validation needed)
- `GET /dashboard/trends` — returns monthly trends (no query params)
- Mounted as `app.route("/dashboard", dashboard)`

### R5: Date filtering

- Summary and category-summary support optional `startDate` and `endDate` query params
- When provided, only records within the range are aggregated
- Uses `gte` for startDate and `lte` for endDate on the `date` field
- Both params are optional and independent (can provide just one)

### R6: Decimal handling

- Prisma returns `Decimal` objects from aggregations
- Service converts to plain numbers via `.toNumber()` before returning
- Null sums (no matching records) default to 0

## Interfaces

### Dashboard service inputs/outputs

```
getSummary(DashboardQuery) → { totalIncome: number, totalExpenses: number, netBalance: number }
getCategorySummary(DashboardQuery) → Array<{ category: string, type: string, total: number }>
getRecentActivity() → Array<{ id, amount, type, category, date, notes, createdAt, creator: { id, name } }>
getMonthlyTrends() → Array<{ month: string, income: number, expense: number }>
```

### Monthly trends raw SQL

```sql
SELECT
  date_trunc('month', date) AS month,
  type,
  SUM(amount) AS total
FROM records
WHERE date >= $1
GROUP BY date_trunc('month', date), type
ORDER BY month ASC
```

## Acceptance Criteria

1. `GET /dashboard/summary` returns `totalIncome`, `totalExpenses`, `netBalance` as numbers
2. `GET /dashboard/summary` with no records returns all zeroes
3. `GET /dashboard/summary?startDate=...&endDate=...` filters correctly
4. `GET /dashboard/category-summary` returns category/type/total grouped correctly
5. `GET /dashboard/category-summary` with no records returns empty array
6. `GET /dashboard/recent-activity` returns exactly 10 (or fewer) most recent records
7. `GET /dashboard/recent-activity` includes creator name
8. `GET /dashboard/trends` returns monthly data for last 12 months
9. Trends data has both income and expense per month (0 if none)
10. VIEWER gets 403 on all dashboard endpoints
11. ANALYST gets 200 on all dashboard endpoints
12. ADMIN gets 200 on all dashboard endpoints
13. `pnpm typecheck` passes with zero errors
