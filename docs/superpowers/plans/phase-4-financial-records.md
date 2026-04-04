# Phase 4: Financial Records — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement financial records CRUD with filtering by date/category/type and pagination. All authenticated users can read. Only ADMIN can create/update/delete.

**Architecture:** Record service handles business logic and query building. Routes use auth middleware for all endpoints and role guard (ADMIN) for write operations. Category is normalized to lowercase at validation time.

**Tech Stack:** Hono, Prisma, Zod

**Depends on:** Phase 3 (user management) completed and verified.

---

### Task 1: Create record validation schemas

**Files:**
- Create: `src/validations/record.schema.ts`

- [ ] **Step 1: Create src/validations/record.schema.ts**

```typescript
import { z } from "zod";

export const createRecordSchema = z.object({
  amount: z.number().positive("Amount must be a positive number"),
  type: z.enum(["INCOME", "EXPENSE"]),
  category: z.string().min(1, "Category is required").max(50).transform((v) => v.toLowerCase().trim()),
  date: z.string().datetime({ message: "Date must be a valid ISO 8601 datetime" }),
  notes: z.string().max(500).optional(),
});

export const updateRecordSchema = z.object({
  amount: z.number().positive("Amount must be a positive number").optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  category: z.string().min(1).max(50).transform((v) => v.toLowerCase().trim()).optional(),
  date: z.string().datetime().optional(),
  notes: z.string().max(500).optional().nullable(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one field must be provided",
});

export const listRecordsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  category: z.string().transform((v) => v.toLowerCase().trim()).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type CreateRecordInput = z.infer<typeof createRecordSchema>;
export type UpdateRecordInput = z.infer<typeof updateRecordSchema>;
export type ListRecordsQuery = z.infer<typeof listRecordsQuerySchema>;
```

---

### Task 2: Create record service

**Files:**
- Create: `src/services/record.service.ts`

- [ ] **Step 1: Create src/services/record.service.ts**

```typescript
import { Prisma } from "@prisma/client";
import { prisma } from "../config/db.js";
import { AppError } from "../middleware/errorHandler.js";
import type {
  CreateRecordInput,
  UpdateRecordInput,
  ListRecordsQuery,
} from "../validations/record.schema.js";

const recordSelect = {
  id: true,
  amount: true,
  type: true,
  category: true,
  date: true,
  notes: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
  creator: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
};

function buildWhereClause(query: ListRecordsQuery): Prisma.RecordWhereInput {
  const where: Prisma.RecordWhereInput = {};

  if (query.type) {
    where.type = query.type;
  }

  if (query.category) {
    where.category = query.category;
  }

  if (query.startDate || query.endDate) {
    where.date = {};
    if (query.startDate) {
      where.date.gte = new Date(query.startDate);
    }
    if (query.endDate) {
      where.date.lte = new Date(query.endDate);
    }
  }

  return where;
}

export async function listRecords(query: ListRecordsQuery) {
  const { page, limit } = query;
  const skip = (page - 1) * limit;
  const where = buildWhereClause(query);

  const [records, total] = await Promise.all([
    prisma.record.findMany({
      where,
      select: recordSelect,
      skip,
      take: limit,
      orderBy: { date: "desc" },
    }),
    prisma.record.count({ where }),
  ]);

  return { records, total, page, limit };
}

export async function getRecordById(id: string) {
  const record = await prisma.record.findUnique({
    where: { id },
    select: recordSelect,
  });

  if (!record) {
    throw new AppError(404, "NOT_FOUND", "Record not found");
  }

  return record;
}

export async function createRecord(input: CreateRecordInput, userId: string) {
  const record = await prisma.record.create({
    data: {
      amount: new Prisma.Decimal(input.amount),
      type: input.type,
      category: input.category,
      date: new Date(input.date),
      notes: input.notes,
      createdBy: userId,
    },
    select: recordSelect,
  });

  return record;
}

export async function updateRecord(id: string, input: UpdateRecordInput) {
  const existing = await prisma.record.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(404, "NOT_FOUND", "Record not found");
  }

  const data: Prisma.RecordUpdateInput = {};

  if (input.amount !== undefined) {
    data.amount = new Prisma.Decimal(input.amount);
  }
  if (input.type !== undefined) {
    data.type = input.type;
  }
  if (input.category !== undefined) {
    data.category = input.category;
  }
  if (input.date !== undefined) {
    data.date = new Date(input.date);
  }
  if (input.notes !== undefined) {
    data.notes = input.notes;
  }

  const record = await prisma.record.update({
    where: { id },
    data,
    select: recordSelect,
  });

  return record;
}

export async function deleteRecord(id: string) {
  const existing = await prisma.record.findUnique({ where: { id } });

  if (!existing) {
    throw new AppError(404, "NOT_FOUND", "Record not found");
  }

  await prisma.record.delete({ where: { id } });
}
```

---

### Task 3: Create record routes

**Files:**
- Create: `src/routes/record.routes.ts`

- [ ] **Step 1: Create src/routes/record.routes.ts**

```typescript
import { Hono } from "hono";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/roleGuard.js";
import { validate } from "../middleware/validate.js";
import {
  createRecordSchema,
  updateRecordSchema,
  listRecordsQuerySchema,
} from "../validations/record.schema.js";
import * as recordService from "../services/record.service.js";
import { successResponse } from "../helpers/response.js";
import type { JwtPayload } from "../types/index.js";

const records = new Hono();

// All record routes require authentication
records.use("*", authenticate);

records.get("/", validate(listRecordsQuerySchema, "query"), async (c) => {
  const query = c.get("validated");
  const { records: data, total, page, limit } = await recordService.listRecords(query);
  return c.json(successResponse(data, { page, limit, total }));
});

records.get("/:id", async (c) => {
  const id = c.req.param("id");
  const record = await recordService.getRecordById(id);
  return c.json(successResponse(record));
});

records.post("/", requireRole("ADMIN"), validate(createRecordSchema), async (c) => {
  const data = c.get("validated");
  const user = c.get("user") as JwtPayload;
  const record = await recordService.createRecord(data, user.userId);
  return c.json(successResponse(record), 201);
});

records.patch("/:id", requireRole("ADMIN"), validate(updateRecordSchema), async (c) => {
  const id = c.req.param("id");
  const data = c.get("validated");
  const record = await recordService.updateRecord(id, data);
  return c.json(successResponse(record));
});

records.delete("/:id", requireRole("ADMIN"), async (c) => {
  const id = c.req.param("id");
  await recordService.deleteRecord(id);
  return c.json(successResponse({ message: "Record deleted" }));
});

export default records;
```

- [ ] **Step 2: Mount record routes in src/index.ts**

Add to `src/index.ts`:

```typescript
import records from "./routes/record.routes.js";

app.route("/records", records);
```

---

### Task 4: Verify records end-to-end

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Login as admin (from Phase 3 setup) and create records**

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "viewer@example.com", "password": "password123"}' | jq -r '.data.token')

# Create an income record
curl -X POST http://localhost:3000/records \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 5000, "type": "INCOME", "category": "Salary", "date": "2026-03-15T00:00:00.000Z", "notes": "March salary"}'

# Create an expense record
curl -X POST http://localhost:3000/records \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 200, "type": "EXPENSE", "category": "Utilities", "date": "2026-03-20T00:00:00.000Z"}'
```

Expected: `201` with record data. Note that category should be lowercased (`"salary"`, `"utilities"`).

- [ ] **Step 3: List records with filters**

```bash
# All records
curl -X GET http://localhost:3000/records \
  -H "Authorization: Bearer $TOKEN"

# Filter by type
curl -X GET "http://localhost:3000/records?type=INCOME" \
  -H "Authorization: Bearer $TOKEN"

# Filter by date range
curl -X GET "http://localhost:3000/records?startDate=2026-03-01T00:00:00.000Z&endDate=2026-03-31T23:59:59.000Z" \
  -H "Authorization: Bearer $TOKEN"
```

- [ ] **Step 4: Test that VIEWER cannot create records**

```bash
# Register and login as viewer
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "viewer2@example.com", "password": "password123", "name": "Viewer 2"}'

VIEWER_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "viewer2@example.com", "password": "password123"}' | jq -r '.data.token')

# Try to create — should be 403
curl -X POST http://localhost:3000/records \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "type": "INCOME", "category": "Test", "date": "2026-03-15T00:00:00.000Z"}'
```

Expected: `403` with `"Insufficient permissions"`

- [ ] **Step 5: Test that VIEWER can read records**

```bash
curl -X GET http://localhost:3000/records \
  -H "Authorization: Bearer $VIEWER_TOKEN"
```

Expected: `200` with paginated records list.

- [ ] **Step 6: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: financial records CRUD with filtering, pagination, and role-based access"
```

---

## Phase 4 Verification Checklist

After completing all tasks, verify:

1. `POST /records` creates record with normalized category (lowercase)
2. `GET /records` returns paginated list with `meta` field
3. Filtering works: `?type=INCOME`, `?category=salary`, `?startDate=...&endDate=...`
4. `GET /records/:id` returns single record with creator info
5. `PATCH /records/:id` updates specific fields
6. `DELETE /records/:id` removes the record
7. VIEWER and ANALYST can read but not write
8. Only ADMIN can create/update/delete
9. Non-existent record returns 404
10. Invalid input returns 400 with descriptive errors
11. `npx tsc --noEmit` passes
