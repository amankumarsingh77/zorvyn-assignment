# Phase 2: Auth & Middleware — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement JWT authentication (register + login), auth middleware, role guard middleware, validation middleware, and global error handler.

**Architecture:** Auth service handles registration/login logic. Middleware chain: error handler (global) → auth (verify JWT) → role guard (check permissions) → validation (Zod). Routes call services directly.

**Tech Stack:** Hono, JWT (jsonwebtoken), bcrypt, Zod, Prisma

**Depends on:** Phase 1 (project setup) completed and verified.

---

### Task 1: Create the global error handler middleware

**Files:**
- Create: `src/middleware/errorHandler.ts`

- [ ] **Step 1: Create src/middleware/errorHandler.ts**

```typescript
import type { Context } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import { errorResponse } from "../helpers/response.js";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

export function errorHandler(err: Error, c: Context) {
  if (err instanceof AppError) {
    return c.json(errorResponse(err.code, err.message), err.statusCode as StatusCode);
  }

  console.error("Unhandled error:", err);
  return c.json(errorResponse("INTERNAL_ERROR", "An unexpected error occurred"), 500);
}
```

- [ ] **Step 2: Wire error handler into the app**

Modify `src/index.ts` — add the `onError` handler:

```typescript
import { errorHandler } from "./middleware/errorHandler.js";

// After creating the app
app.onError(errorHandler);
```

---

### Task 2: Create the validation middleware

**Files:**
- Create: `src/middleware/validate.ts`

- [ ] **Step 1: Create src/middleware/validate.ts**

```typescript
import type { Context, Next } from "hono";
import type { ZodSchema } from "zod";
import { AppError } from "./errorHandler.js";

type Target = "json" | "query" | "param";

export function validate(schema: ZodSchema, target: Target = "json") {
  return async (c: Context, next: Next) => {
    let data: unknown;

    if (target === "json") {
      data = await c.req.json().catch(() => {
        throw new AppError(400, "VALIDATION_ERROR", "Invalid JSON body");
      });
    } else if (target === "query") {
      data = c.req.query();
    } else {
      data = c.req.param();
    }

    const result = schema.safeParse(data);

    if (!result.success) {
      const message = result.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      throw new AppError(400, "VALIDATION_ERROR", message);
    }

    c.set("validated", result.data);
    await next();
  };
}
```

---

### Task 3: Create auth validation schemas

**Files:**
- Create: `src/validations/auth.schema.ts`

- [ ] **Step 1: Create src/validations/auth.schema.ts**

```typescript
import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required").max(100),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
```

---

### Task 4: Create the auth service

**Files:**
- Create: `src/services/auth.service.ts`

- [ ] **Step 1: Create src/services/auth.service.ts**

```typescript
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../config/db.js";
import { env } from "../config/env.js";
import { AppError } from "../middleware/errorHandler.js";
import type { RegisterInput, LoginInput } from "../validations/auth.schema.js";
import type { JwtPayload } from "../types/index.js";

const SALT_ROUNDS = 10;

export async function register(input: RegisterInput) {
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
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  return user;
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    throw new AppError(401, "UNAUTHORIZED", "Invalid email or password");
  }

  if (user.status === "INACTIVE") {
    throw new AppError(403, "FORBIDDEN", "Account is inactive");
  }

  const validPassword = await bcrypt.compare(input.password, user.password);

  if (!validPassword) {
    throw new AppError(401, "UNAUTHORIZED", "Invalid email or password");
  }

  const payload: JwtPayload = {
    userId: user.id,
    role: user.role,
  };

  const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: "24h" });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
}
```

---

### Task 5: Create auth routes

**Files:**
- Create: `src/routes/auth.routes.ts`

- [ ] **Step 1: Create src/routes/auth.routes.ts**

```typescript
import { Hono } from "hono";
import { validate } from "../middleware/validate.js";
import { registerSchema, loginSchema } from "../validations/auth.schema.js";
import * as authService from "../services/auth.service.js";
import { successResponse } from "../helpers/response.js";

const auth = new Hono();

auth.post("/register", validate(registerSchema), async (c) => {
  const data = c.get("validated");
  const user = await authService.register(data);
  return c.json(successResponse(user), 201);
});

auth.post("/login", validate(loginSchema), async (c) => {
  const data = c.get("validated");
  const result = await authService.login(data);
  return c.json(successResponse(result));
});

export default auth;
```

- [ ] **Step 2: Mount auth routes in src/index.ts**

Add to `src/index.ts`:

```typescript
import auth from "./routes/auth.routes.js";

// After the health endpoint
app.route("/auth", auth);
```

---

### Task 6: Create the auth middleware (JWT verification)

**Files:**
- Create: `src/middleware/auth.ts`

- [ ] **Step 1: Create src/middleware/auth.ts**

```typescript
import type { Context, Next } from "hono";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "./errorHandler.js";
import type { JwtPayload } from "../types/index.js";

export async function authenticate(c: Context, next: Next) {
  const header = c.req.header("Authorization");

  if (!header || !header.startsWith("Bearer ")) {
    throw new AppError(401, "UNAUTHORIZED", "Missing or invalid authorization header");
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    c.set("user", payload);
    await next();
  } catch {
    throw new AppError(401, "UNAUTHORIZED", "Invalid or expired token");
  }
}
```

---

### Task 7: Create the role guard middleware

**Files:**
- Create: `src/middleware/roleGuard.ts`

- [ ] **Step 1: Create src/middleware/roleGuard.ts**

```typescript
import type { Context, Next } from "hono";
import type { Role } from "@prisma/client";
import { AppError } from "./errorHandler.js";
import type { JwtPayload } from "../types/index.js";

export function requireRole(...allowedRoles: Role[]) {
  return async (c: Context, next: Next) => {
    const user = c.get("user") as JwtPayload;

    if (!user) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication required");
    }

    if (!allowedRoles.includes(user.role)) {
      throw new AppError(403, "FORBIDDEN", "Insufficient permissions");
    }

    await next();
  };
}
```

---

### Task 8: Verify the auth flow end-to-end

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Register a new user**

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123", "name": "Test User"}'
```

Expected: `201` with `{"success":true,"data":{"id":"...","email":"test@example.com","name":"Test User","role":"VIEWER","status":"ACTIVE",...}}`

- [ ] **Step 3: Login with the registered user**

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

Expected: `200` with `{"success":true,"data":{"token":"...","user":{...}}}`

- [ ] **Step 4: Test validation — register with bad email**

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "notanemail", "password": "123", "name": ""}'
```

Expected: `400` with validation errors for email, password length, and name.

- [ ] **Step 5: Test duplicate email**

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123", "name": "Test User"}'
```

Expected: `409` with `"Email already registered"`

- [ ] **Step 6: Test login with wrong password**

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "wrongpassword"}'
```

Expected: `401` with `"Invalid email or password"`

- [ ] **Step 7: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "feat: auth system with register, login, JWT middleware, role guard, and validation"
```

---

## Phase 2 Verification Checklist

After completing all tasks, verify:

1. `POST /auth/register` creates a user with VIEWER role
2. `POST /auth/login` returns a JWT token
3. Duplicate email registration returns 409
4. Invalid input returns 400 with descriptive error messages
5. Wrong password returns 401 with generic message (no info leak)
6. Inactive user login returns 403
7. `npx tsc --noEmit` passes with no errors
