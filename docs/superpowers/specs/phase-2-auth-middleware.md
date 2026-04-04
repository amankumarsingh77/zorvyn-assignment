# Phase 2: Auth & Middleware — Spec

## Goal

JWT authentication (register + login), auth middleware, role guard, validation middleware, and global error handler. After this phase, the app can authenticate users and protect routes by role.

## Requirements

### R1: Global error handler

- `src/middleware/errorHandler.ts`
- Custom `AppError` class with `statusCode`, `code`, and `message`
- Catches `AppError` instances and returns formatted error response with correct status code
- Catches unknown errors and returns 500 with `INTERNAL_ERROR` code
- Logs unhandled errors to console
- Wired into Hono via `app.onError()`

### R2: Validation middleware

- `src/middleware/validate.ts`
- Accepts a Zod schema and a target: `"json"` (request body), `"query"` (query params), `"param"` (URL params)
- Default target is `"json"`
- On invalid JSON body, throws `AppError(400, "VALIDATION_ERROR", "Invalid JSON body")`
- On schema validation failure, throws `AppError(400, "VALIDATION_ERROR", ...)` with field-specific messages joined by commas
- Format: `"fieldName: error message, otherField: error message"`
- On success, sets `validated` on Hono context (`c.set("validated", result.data)`)

### R3: Auth validation schemas

- `src/validations/auth.schema.ts`
- `registerSchema`: email (valid email), password (min 6 chars), name (min 1, max 100)
- `loginSchema`: email (valid email), password (min 1)
- Exports inferred types: `RegisterInput`, `LoginInput`

### R4: Auth service

- `src/services/auth.service.ts`
- **register(input):**
  - Check if email exists — if yes, throw `AppError(409, "CONFLICT", "Email already registered")`
  - Hash password with bcrypt (10 salt rounds)
  - Create user with VIEWER role (default)
  - Return user without password field
- **login(input):**
  - Find user by email — if not found, throw `AppError(401, "UNAUTHORIZED", "Invalid email or password")`
  - Check user status — if INACTIVE, throw `AppError(403, "FORBIDDEN", "Account is inactive")`
  - Compare password with bcrypt — if wrong, throw `AppError(401, "UNAUTHORIZED", "Invalid email or password")`
  - Same error message for "not found" and "wrong password" (no info leak)
  - Sign JWT with `{ userId, role }` payload, 24h expiry
  - Return `{ token, user: { id, email, name, role } }`

### R5: Auth routes

- `src/routes/auth.routes.ts`
- `POST /auth/register` — validate body with registerSchema, call auth service, return 201
- `POST /auth/login` — validate body with loginSchema, call auth service, return 200
- No authentication required on either endpoint
- Mounted on app as `app.route("/auth", auth)`

### R6: Auth middleware (JWT verification)

- `src/middleware/auth.ts`
- Reads `Authorization` header
- Missing or non-Bearer header → `AppError(401, "UNAUTHORIZED", "Missing or invalid authorization header")`
- Invalid/expired token → `AppError(401, "UNAUTHORIZED", "Invalid or expired token")`
- Valid token → decode payload, set `user` on Hono context (`c.set("user", payload)`)
- JWT secret from `env.JWT_SECRET`

### R7: Role guard middleware

- `src/middleware/roleGuard.ts`
- `requireRole(...allowedRoles)` — factory function returning middleware
- Reads `user` from Hono context (set by auth middleware)
- If user's role is not in `allowedRoles` → `AppError(403, "FORBIDDEN", "Insufficient permissions")`
- Must run after auth middleware in the chain

## Interfaces

### Auth service inputs/outputs

```
register(RegisterInput) → { id, email, name, role, status, createdAt }
login(LoginInput) → { token: string, user: { id, email, name, role } }
```

### Middleware chain order

```
errorHandler (global via onError)
  → authenticate (verify JWT, set user)
  → requireRole (check role)
  → validate (check body/query/params)
  → route handler
```

## Acceptance Criteria

1. `POST /auth/register` with valid input returns 201 with user data (no password in response)
2. `POST /auth/register` with existing email returns 409
3. `POST /auth/register` with invalid input returns 400 with field-specific errors
4. `POST /auth/login` with valid credentials returns 200 with JWT token
5. `POST /auth/login` with wrong password returns 401 with generic message
6. `POST /auth/login` with non-existent email returns 401 with same generic message
7. `POST /auth/login` with inactive user returns 403
8. Auth middleware rejects requests without Authorization header (401)
9. Auth middleware rejects expired/invalid tokens (401)
10. Role guard rejects users without required role (403)
11. `pnpm typecheck` passes with zero errors
