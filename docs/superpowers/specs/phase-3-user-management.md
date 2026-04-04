# Phase 3: User Management — Spec

## Goal

Admin-only CRUD for users — list, create, get, update, delete with role and status management.

## Requirements

### R1: User validation schemas

- `src/validations/user.schema.ts`
- `createUserSchema`: email (valid email), password (min 6), name (min 1, max 100), role (enum: VIEWER, ANALYST, ADMIN)
- `updateUserSchema`: name (optional), role (optional), status (optional, enum: ACTIVE, INACTIVE). At least one field required — use Zod `.refine()` to reject empty objects with `AppError(400, "VALIDATION_ERROR", "At least one field must be provided")`
- `listUsersQuerySchema`: page (positive int, default 1), limit (positive int, max 100, default 20)
- Exports inferred types: `CreateUserInput`, `UpdateUserInput`, `ListUsersQuery`

### R2: HTTP constants

- Add `HTTP_NOT_FOUND = 404 as const` to `src/constants/http.ts`

### R3: User repository

- `src/repositories/user.repository.ts` (extend existing file)
- All queries exclude `password` from the result using Prisma `select` — no endpoint ever returns the password field, even hashed
- **findUsers(skip, take):** paginated query ordered by `createdAt` descending, returns users without password
- **countUsers():** returns total user count
- **findUserById(id):** returns user without password, or `null`
- **createUserWithRole(data):** creates user with explicit role, returns user without password
- **updateUser(id, data):** updates only provided fields, returns updated user without password
- **deleteUser(id):** deletes user
- **countUserRecords(userId):** returns count of records created by this user

### R4: User service

- `src/services/user.service.ts`
- Services call repository functions only — no direct `prisma.` calls
- **listUsers(query):**
  - Calls `findUsers` and `countUsers` from repository
  - Use `Promise.all` for the two independent queries
  - Returns `{ users, total, page, limit }`
- **getUserById(id):**
  - Calls `findUserById` from repository
  - Throws `AppError(HTTP_NOT_FOUND, "NOT_FOUND", "User not found")` if not found
- **createUser(input):**
  - Calls `findUserByEmail` from repository to check uniqueness — throw `AppError(HTTP_CONFLICT, "CONFLICT", "Email already registered")` if exists
  - Hash password with bcrypt (10 salt rounds)
  - Calls `createUserWithRole` from repository with specified role
  - Return user without password
- **updateUser(id, input):**
  - Calls `findUserById` from repository — throw `AppError(HTTP_NOT_FOUND, "NOT_FOUND", "User not found")` if not found
  - Calls `updateUser` from repository with only provided fields
  - Return updated user without password
- **deleteUser(id):**
  - Calls `findUserById` from repository — throw `AppError(HTTP_NOT_FOUND, "NOT_FOUND", "User not found")` if not found
  - Calls `countUserRecords` from repository — if count > 0, throw `AppError(HTTP_CONFLICT, "CONFLICT", "Cannot delete user with N financial record(s). Set status to INACTIVE instead.")`
  - Calls `deleteUser` from repository

### R5: User routes

- `src/routes/user.routes.ts`
- All routes protected by `authenticate` + `requireRole("ADMIN")`
- `GET /users` — list users, paginated, validates query params
- `POST /users` — create user with role, validates body, returns 201
- `GET /users/:id` — get single user
- `PATCH /users/:id` — update user fields, validates body
- `DELETE /users/:id` — delete user (blocked if has records)
- Mounted as `app.route("/users", users)`
- Use named export (`export { userRoutes }`) — no default export
- Use `AppEnv` type for Hono generic, use `schema.parse(c.get("validated"))` for input narrowing (no `as` casts)
- Use HTTP constants from `src/constants/http.ts` for all status codes (e.g., `HTTP_CREATED` for 201)

## Interfaces

### User service inputs/outputs

```
listUsers(ListUsersQuery) → { users: User[], total: number, page: number, limit: number }
getUserById(string) → User
createUser(CreateUserInput) → User
updateUser(string, UpdateUserInput) → User
deleteUser(string) → void
```

User shape (returned): `{ id, email, name, role, status, createdAt, updatedAt }` — never includes `password`

## Acceptance Criteria

1. All `/users/*` endpoints return 403 for VIEWER and ANALYST roles
2. All `/users/*` endpoints return 401 for unauthenticated requests
3. `GET /users` returns paginated list with `meta` field
4. `GET /users?page=2&limit=5` returns correct page
5. `POST /users` creates user with specified role (not default VIEWER)
6. `POST /users` with duplicate email returns 409
7. `PATCH /users/:id` updates only provided fields
8. `PATCH /users/:id` with non-existent id returns 404
9. `PATCH /users/:id` with empty body returns 400
10. `DELETE /users/:id` succeeds for users with no records
11. `DELETE /users/:id` returns 409 for users with records, with helpful message
12. No endpoint returns the password field
13. No direct `prisma.` calls in service or route files
14. No `as X` type assertions in route handlers
15. No magic number HTTP status codes outside `src/constants/http.ts`
16. `pnpm typecheck` passes with zero errors
