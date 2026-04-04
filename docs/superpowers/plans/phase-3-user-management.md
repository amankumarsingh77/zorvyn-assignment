# Phase 3: User Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement admin-only user CRUD — list, create, get, update, delete users with role and status management.

**Architecture:** User service handles business logic. Routes are protected by auth middleware + role guard (ADMIN only). Validation via Zod schemas.

**Tech Stack:** Hono, Prisma, Zod

**Depends on:** Phase 2 (auth & middleware) completed and verified.

---

### Task 1: Create user validation schemas

**Files:**
- Create: `src/validations/user.schema.ts`

- [ ] **Step 1: Create src/validations/user.schema.ts**

```typescript
import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required").max(100),
  role: z.enum(["VIEWER", "ANALYST", "ADMIN"]),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.enum(["VIEWER", "ANALYST", "ADMIN"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one field must be provided",
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
```

---

### Task 2: Create user service

**Files:**
- Create: `src/services/user.service.ts`

- [ ] **Step 1: Create src/services/user.service.ts**

```typescript
import bcrypt from "bcrypt";
import { prisma } from "../config/db.js";
import { AppError } from "../middleware/errorHandler.js";
import type { CreateUserInput, UpdateUserInput, ListUsersQuery } from "../validations/user.schema.js";

const SALT_ROUNDS = 10;

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

export async function listUsers(query: ListUsersQuery) {
  const { page, limit } = query;
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      select: userSelect,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count(),
  ]);

  return { users, total, page, limit };
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: userSelect,
  });

  if (!user) {
    throw new AppError(404, "NOT_FOUND", "User not found");
  }

  return user;
}

export async function createUser(input: CreateUserInput) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existing) {
    throw new AppError(409, "CONFLICT", "Email already registered");
  }

  const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      password: hashedPassword,
      name: input.name,
      role: input.role,
    },
    select: userSelect,
  });

  return user;
}

export async function updateUser(id: string, input: UpdateUserInput) {
  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    throw new AppError(404, "NOT_FOUND", "User not found");
  }

  const updated = await prisma.user.update({
    where: { id },
    data: input,
    select: userSelect,
  });

  return updated;
}

export async function deleteUser(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { _count: { select: { records: true } } },
  });

  if (!user) {
    throw new AppError(404, "NOT_FOUND", "User not found");
  }

  if (user._count.records > 0) {
    throw new AppError(
      409,
      "CONFLICT",
      `Cannot delete user with ${user._count.records} financial record(s). Set status to INACTIVE instead.`
    );
  }

  await prisma.user.delete({ where: { id } });
}
```

---

### Task 3: Create user routes

**Files:**
- Create: `src/routes/user.routes.ts`

- [ ] **Step 1: Create src/routes/user.routes.ts**

```typescript
import { Hono } from "hono";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/roleGuard.js";
import { validate } from "../middleware/validate.js";
import {
  createUserSchema,
  updateUserSchema,
  listUsersQuerySchema,
} from "../validations/user.schema.js";
import * as userService from "../services/user.service.js";
import { successResponse } from "../helpers/response.js";

const users = new Hono();

// All user routes require ADMIN role
users.use("*", authenticate, requireRole("ADMIN"));

users.get("/", validate(listUsersQuerySchema, "query"), async (c) => {
  const query = c.get("validated");
  const { users: data, total, page, limit } = await userService.listUsers(query);
  return c.json(successResponse(data, { page, limit, total }));
});

users.post("/", validate(createUserSchema), async (c) => {
  const data = c.get("validated");
  const user = await userService.createUser(data);
  return c.json(successResponse(user), 201);
});

users.get("/:id", async (c) => {
  const id = c.req.param("id");
  const user = await userService.getUserById(id);
  return c.json(successResponse(user));
});

users.patch("/:id", validate(updateUserSchema), async (c) => {
  const id = c.req.param("id");
  const data = c.get("validated");
  const user = await userService.updateUser(id, data);
  return c.json(successResponse(user));
});

users.delete("/:id", async (c) => {
  const id = c.req.param("id");
  await userService.deleteUser(id);
  return c.json(successResponse({ message: "User deleted" }));
});

export default users;
```

- [ ] **Step 2: Mount user routes in src/index.ts**

Add to `src/index.ts`:

```typescript
import users from "./routes/user.routes.js";

app.route("/users", users);
```

---

### Task 4: Verify user management end-to-end

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Register and login as a regular user, verify access is denied**

```bash
# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "viewer@example.com", "password": "password123", "name": "Viewer User"}'

# Login and save token
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "viewer@example.com", "password": "password123"}' | jq -r '.data.token')

# Try to list users — should be 403
curl -X GET http://localhost:3000/users \
  -H "Authorization: Bearer $TOKEN"
```

Expected: `403` with `"Insufficient permissions"`

- [ ] **Step 3: Manually set a user to ADMIN in the database to test admin routes**

```bash
# Get user id from the register response, then:
npx prisma db execute --stdin <<< "UPDATE users SET role = 'ADMIN' WHERE email = 'viewer@example.com';"
```

Re-login to get a new token with ADMIN role, then test:

```bash
# Login again
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "viewer@example.com", "password": "password123"}' | jq -r '.data.token')

# List users
curl -X GET http://localhost:3000/users \
  -H "Authorization: Bearer $TOKEN"

# Create a user
curl -X POST http://localhost:3000/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "analyst@example.com", "password": "password123", "name": "Analyst User", "role": "ANALYST"}'

# Update a user (use the id from the create response)
curl -X PATCH http://localhost:3000/users/<USER_ID> \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "INACTIVE"}'

# Delete a user (only works if they have no records)
curl -X DELETE http://localhost:3000/users/<USER_ID> \
  -H "Authorization: Bearer $TOKEN"
```

- [ ] **Step 4: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: admin user management with CRUD, role assignment, and status management"
```

---

## Phase 3 Verification Checklist

After completing all tasks, verify:

1. Only ADMIN role can access `/users/*` endpoints
2. VIEWER/ANALYST get 403 on all user routes
3. Unauthenticated requests get 401
4. `GET /users` returns paginated list
5. `POST /users` creates user with specified role
6. `PATCH /users/:id` updates role/status/name
7. `DELETE /users/:id` blocks deletion if user has records
8. Duplicate email returns 409
9. Non-existent user returns 404
10. `npx tsc --noEmit` passes
