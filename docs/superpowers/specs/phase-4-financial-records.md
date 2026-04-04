# Phase 4: Financial Records — Spec

## Goal

Financial records CRUD with filtering by date/category/type and pagination. All authenticated users can read. Only ADMIN can create/update/delete.

## Requirements

### R1: Record validation schemas

- `src/validations/record.schema.ts`
- `createRecordSchema`:
  - `amount`: positive number (required)
  - `type`: `z.enum(["INCOME", "EXPENSE"])` — string literal union, not a TypeScript `enum` (required)
  - `category`: string, min 1, max 50, **transformed to lowercase and trimmed** (required)
  - `date`: ISO 8601 datetime string (required)
  - `notes`: string, max 500 (optional)
- `updateRecordSchema`:
  - Same fields as create, all optional. At least one field required.
  - Category still transformed to lowercase when provided
  - `notes` can be set to `null` (to clear it) — `null` is required here because Prisma uses `null` to distinguish "clear the value" from "don't update"
- `listRecordsQuerySchema`:
  - `page`: positive int, default 1
  - `limit`: positive int, max 100, default 20
  - `type`: `z.enum(["INCOME", "EXPENSE"])` (optional filter)
  - `category`: string, transformed to lowercase (optional filter)
  - `startDate`: ISO 8601 datetime (optional filter)
  - `endDate`: ISO 8601 datetime (optional filter)

### R2: Record repository

- `src/repositories/record.repository.ts`
- Thin database access layer — query + return, no business logic or authorization checks
- **findRecords(where, skip, take):**
  - Accepts a Prisma `where` clause, skip, and take
  - Orders by `date` descending
  - Returns records with creator info selected (`{ id, name, email }`)
- **countRecords(where):**
  - Accepts the same `where` clause
  - Returns total count for pagination
- **findRecordById(id):**
  - Returns record with creator info, or `null` if not found
- **createRecord(data):**
  - Accepts typed create input (amount as `Prisma.Decimal`, date as `Date`, etc.)
  - Returns created record with creator info
- **updateRecordById(id, data):**
  - Accepts typed update input
  - Returns updated record with creator info
- **deleteRecordById(id):**
  - Deletes the record

### R3: Record service

- `src/services/record.service.ts`
- Services contain business logic only — no direct Prisma calls, all queries go through the repository
- **listRecords(query):**
  - Builds a `where` object from filters (type, category, date range with `gte`/`lte`)
  - Calls `findRecords` and `countRecords` from the repository
  - Returns `{ records, total, page, limit }`
- **getRecordById(id):**
  - Calls `findRecordById` from the repository
  - Throws `AppError(404, "NOT_FOUND", "Record not found")` if not found
- **createRecord(input, userId):**
  - Converts amount to `Prisma.Decimal`, date to `Date` object
  - Sets `createdBy` to the authenticated user's ID
  - Calls `createRecord` from the repository
  - Returns created record with creator info
- **updateRecord(id, input):**
  - Calls `findRecordById` — throw 404 if not found
  - Builds update data only from provided fields (amount → `Prisma.Decimal`, date → `Date` when provided)
  - Calls `updateRecordById` from the repository
  - Returns updated record with creator info
- **deleteRecord(id):**
  - Calls `findRecordById` — throw 404 if not found
  - Calls `deleteRecordById` from the repository

### R4: Record routes

- `src/routes/record.routes.ts`
- All routes require authentication (`authenticate` middleware on all)
- Read routes (GET) accessible to all authenticated users (VIEWER, ANALYST, ADMIN)
- Write routes (POST, PATCH, DELETE) require `requireRole("ADMIN")`
- `GET /records` — list with filters and pagination, validates query params
- `GET /records/:id` — get single record
- `POST /records` — create record, validates body, returns 201, passes `user.userId` from context
- `PATCH /records/:id` — update record, validates body
- `DELETE /records/:id` — delete record
- Mounted as `app.route("/records", records)`

### R5: Category normalization

- Category is always stored lowercase and trimmed
- Zod `.transform()` handles this at validation time
- Filtering by category also normalizes the input
- This ensures `"Salary"`, `"salary"`, `"SALARY"` all match

### R6: Creator info in responses

- Record responses include `creator: { id, name, email }` via Prisma relation select
- This provides context about who created the record without a separate API call

## Interfaces

### Record repository inputs/outputs

```
findRecords(where, skip, take) → Record[]
countRecords(where) → number
findRecordById(string) → Record | null
createRecord(data) → Record
updateRecordById(string, data) → Record
deleteRecordById(string) → void
```

### Record service inputs/outputs

```
listRecords(ListRecordsQuery) → { records: Record[], total, page, limit }
getRecordById(string) → Record
createRecord(CreateRecordInput, userId: string) → Record
updateRecord(string, UpdateRecordInput) → Record
deleteRecord(string) → void
```

Record shape (returned):
```
{
  id, amount, type, category, date, notes,
  createdBy, createdAt, updatedAt,
  creator: { id, name, email }
}
```

## Acceptance Criteria

1. `POST /records` creates record with category normalized to lowercase
2. `POST /records` stores `createdBy` as the authenticated admin's user ID
3. `GET /records` returns paginated list with `meta` field
4. `GET /records?type=INCOME` filters by type
5. `GET /records?category=salary` filters by category (case-insensitive via normalization)
6. `GET /records?startDate=...&endDate=...` filters by date range
7. Multiple filters can be combined in one request
8. `GET /records/:id` returns record with creator info
9. `PATCH /records/:id` updates only provided fields
10. `DELETE /records/:id` removes the record
11. VIEWER and ANALYST get 403 on POST/PATCH/DELETE
12. VIEWER and ANALYST can GET records successfully
13. Non-existent record returns 404 on GET/PATCH/DELETE
14. Invalid input returns 400 with descriptive errors
15. `pnpm typecheck` passes with zero errors
