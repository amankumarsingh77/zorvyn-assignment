---
paths:
  - "src/middleware/auth.ts"
  - "src/middleware/roleGuard.ts"
  - "src/services/auth.service.ts"
  - "src/routes/auth.routes.ts"
---

# Auth Rules

## JWT

- Use `jsonwebtoken` for signing and verifying tokens
- JWT secret comes from `env.JWT_SECRET` — never hardcoded
- Token payload contains `userId` and `role` only (defined in `src/types/index.ts` as `JwtPayload`)
- Auth middleware verifies the token and attaches the decoded payload to Hono's context variables

## Passwords

- Use `bcrypt` for hashing and comparing passwords
- Never store or log plaintext passwords
- Never return password hashes in API responses

## Role-based access

- Three roles: `VIEWER`, `ANALYST`, `ADMIN` (defined as Prisma enum)
- Role guard middleware checks `context.var.user.role` against allowed roles for the route
- Apply auth middleware first, then role guard — role guard assumes the user is already authenticated

## User status

- Users have an `ACTIVE` or `INACTIVE` status
- Inactive users should not be able to authenticate
