# Phase 6: Seed Data & Tests — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a database seed script with a default admin and sample financial records. Write unit tests for services and middleware, and e2e tests for all API endpoints.

**Architecture:** Seed script uses Prisma client directly. Unit tests mock Prisma with vitest. E2e tests spin up the Hono app and hit endpoints using the Hono test client (no network needed).

**Tech Stack:** Vitest, Prisma, Hono test client, bcrypt

**Depends on:** Phase 5 (dashboard) completed and verified.

---

### Task 1: Create the database seed script

**Files:**
- Create: `prisma/seed.ts`

- [ ] **Step 1: Create prisma/seed.ts**

```typescript
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.record.deleteMany();
  await prisma.user.deleteMany();

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.create({
    data: {
      email: "admin@example.com",
      password: adminPassword,
      name: "Admin User",
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  // Create analyst user
  const analystPassword = await bcrypt.hash("analyst123", 10);
  const analyst = await prisma.user.create({
    data: {
      email: "analyst@example.com",
      password: analystPassword,
      name: "Analyst User",
      role: "ANALYST",
      status: "ACTIVE",
    },
  });

  // Create viewer user
  const viewerPassword = await bcrypt.hash("viewer123", 10);
  await prisma.user.create({
    data: {
      email: "viewer@example.com",
      password: viewerPassword,
      name: "Viewer User",
      role: "VIEWER",
      status: "ACTIVE",
    },
  });

  // Create sample financial records
  const categories = {
    income: ["salary", "freelance", "investments", "bonus"],
    expense: ["rent", "utilities", "groceries", "transport", "entertainment"],
  };

  const records = [];

  // Generate 12 months of sample data
  for (let monthOffset = 11; monthOffset >= 0; monthOffset--) {
    const date = new Date();
    date.setMonth(date.getMonth() - monthOffset);
    date.setDate(1);

    // Monthly salary
    records.push({
      amount: 5000,
      type: "INCOME" as const,
      category: "salary",
      date: new Date(date),
      notes: `Salary for ${date.toLocaleString("default", { month: "long", year: "numeric" })}`,
      createdBy: admin.id,
    });

    // Random freelance income (some months)
    if (monthOffset % 3 === 0) {
      records.push({
        amount: 1500,
        type: "INCOME" as const,
        category: "freelance",
        date: new Date(date.getFullYear(), date.getMonth(), 15),
        notes: "Freelance project payment",
        createdBy: admin.id,
      });
    }

    // Monthly rent
    records.push({
      amount: 1200,
      type: "EXPENSE" as const,
      category: "rent",
      date: new Date(date.getFullYear(), date.getMonth(), 1),
      notes: "Monthly rent",
      createdBy: admin.id,
    });

    // Utilities
    records.push({
      amount: 150 + Math.round(Math.random() * 50),
      type: "EXPENSE" as const,
      category: "utilities",
      date: new Date(date.getFullYear(), date.getMonth(), 5),
      notes: "Electricity and water",
      createdBy: analyst.id,
    });

    // Groceries (twice a month)
    records.push({
      amount: 200 + Math.round(Math.random() * 100),
      type: "EXPENSE" as const,
      category: "groceries",
      date: new Date(date.getFullYear(), date.getMonth(), 10),
      createdBy: admin.id,
    });

    records.push({
      amount: 180 + Math.round(Math.random() * 80),
      type: "EXPENSE" as const,
      category: "groceries",
      date: new Date(date.getFullYear(), date.getMonth(), 25),
      createdBy: admin.id,
    });
  }

  await prisma.record.createMany({ data: records });

  console.log(`Seeded ${records.length} financial records`);
  console.log("Seeded users:");
  console.log("  Admin:   admin@example.com / admin123");
  console.log("  Analyst: analyst@example.com / analyst123");
  console.log("  Viewer:  viewer@example.com / viewer123");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 2: Add seed config to package.json**

Add to `package.json`:

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

- [ ] **Step 3: Run the seed**

```bash
npm run db:seed
```

Expected: Output showing seeded records and user credentials.

- [ ] **Step 4: Verify seed data via the API**

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "admin123"}' | jq -r '.data.token')

# Check dashboard has data
curl -X GET http://localhost:3000/dashboard/summary \
  -H "Authorization: Bearer $TOKEN"

# Check records exist
curl -X GET http://localhost:3000/records \
  -H "Authorization: Bearer $TOKEN"
```

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: database seed script with admin, analyst, viewer, and 12 months of sample data"
```

---

### Task 2: Set up Vitest configuration

**Files:**
- Create: `vitest.config.ts`

- [ ] **Step 1: Create vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts", "src/config/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

---

### Task 3: Create Prisma mock for unit tests

**Files:**
- Create: `tests/unit/helpers/prisma-mock.ts`

- [ ] **Step 1: Create tests/unit/helpers/prisma-mock.ts**

```typescript
import { vi } from "vitest";

export function createPrismaMock() {
  return {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    record: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $disconnect: vi.fn(),
  };
}
```

---

### Task 4: Write unit tests for auth service

**Files:**
- Create: `tests/unit/services/auth.service.test.ts`

- [ ] **Step 1: Create tests/unit/services/auth.service.test.ts**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Mock prisma before importing the service
vi.mock("../../../src/config/db.js", () => {
  const { createPrismaMock } = require("../helpers/prisma-mock");
  return { prisma: createPrismaMock() };
});

vi.mock("../../../src/config/env.js", () => ({
  env: { JWT_SECRET: "test-secret-key-for-testing", PORT: 3000 },
}));

import { prisma } from "../../../src/config/db.js";
import * as authService from "../../../src/services/auth.service.js";

const mockPrisma = prisma as unknown as ReturnType<typeof import("../helpers/prisma-mock").createPrismaMock>;

describe("auth.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("register", () => {
    it("should create a new user with hashed password", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        name: "Test User",
        role: "VIEWER",
        status: "ACTIVE",
        createdAt: new Date(),
      });

      const result = await authService.register({
        email: "test@example.com",
        password: "password123",
        name: "Test User",
      });

      expect(result.email).toBe("test@example.com");
      expect(result.role).toBe("VIEWER");
      expect(mockPrisma.user.create).toHaveBeenCalledOnce();

      // Verify password was hashed
      const createCall = mockPrisma.user.create.mock.calls[0][0];
      const isHashed = await bcrypt.compare("password123", createCall.data.password);
      expect(isHashed).toBe(true);
    });

    it("should throw CONFLICT if email already exists", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: "existing" });

      await expect(
        authService.register({
          email: "exists@example.com",
          password: "password123",
          name: "Test",
        })
      ).rejects.toThrow("Email already registered");
    });
  });

  describe("login", () => {
    it("should return token and user for valid credentials", async () => {
      const hashedPassword = await bcrypt.hash("password123", 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        password: hashedPassword,
        name: "Test User",
        role: "ADMIN",
        status: "ACTIVE",
      });

      const result = await authService.login({
        email: "test@example.com",
        password: "password123",
      });

      expect(result.token).toBeDefined();
      expect(result.user.email).toBe("test@example.com");

      // Verify JWT payload
      const decoded = jwt.verify(result.token, "test-secret-key-for-testing") as any;
      expect(decoded.userId).toBe("user-1");
      expect(decoded.role).toBe("ADMIN");
    });

    it("should throw UNAUTHORIZED for wrong password", async () => {
      const hashedPassword = await bcrypt.hash("password123", 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        password: hashedPassword,
        status: "ACTIVE",
      });

      await expect(
        authService.login({
          email: "test@example.com",
          password: "wrongpassword",
        })
      ).rejects.toThrow("Invalid email or password");
    });

    it("should throw FORBIDDEN for inactive user", async () => {
      const hashedPassword = await bcrypt.hash("password123", 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
        password: hashedPassword,
        status: "INACTIVE",
      });

      await expect(
        authService.login({
          email: "test@example.com",
          password: "password123",
        })
      ).rejects.toThrow("Account is inactive");
    });

    it("should throw UNAUTHORIZED for non-existent email", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({
          email: "nobody@example.com",
          password: "password123",
        })
      ).rejects.toThrow("Invalid email or password");
    });
  });
});
```

- [ ] **Step 2: Run the unit tests**

```bash
npx vitest run tests/unit/services/auth.service.test.ts
```

Expected: All tests pass.

---

### Task 5: Write unit tests for middleware

**Files:**
- Create: `tests/unit/middleware/roleGuard.test.ts`

- [ ] **Step 1: Create tests/unit/middleware/roleGuard.test.ts**

```typescript
import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import { requireRole } from "../../../src/middleware/roleGuard.js";
import { errorHandler } from "../../../src/middleware/errorHandler.js";

function createTestApp(...roles: Parameters<typeof requireRole>) {
  const app = new Hono();
  app.onError(errorHandler);

  app.use("*", async (c, next) => {
    // Simulate authenticated user — set via query param for test flexibility
    const role = c.req.query("role") ?? "VIEWER";
    c.set("user", { userId: "test-user", role });
    await next();
  });

  app.get("/protected", requireRole(...roles), (c) => {
    return c.json({ message: "access granted" });
  });

  return app;
}

describe("requireRole middleware", () => {
  it("should allow access for matching role", async () => {
    const app = createTestApp("ADMIN");
    const res = await app.request("/protected?role=ADMIN");
    expect(res.status).toBe(200);
  });

  it("should deny access for non-matching role", async () => {
    const app = createTestApp("ADMIN");
    const res = await app.request("/protected?role=VIEWER");
    expect(res.status).toBe(403);

    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("should allow any of multiple roles", async () => {
    const app = createTestApp("ANALYST", "ADMIN");

    const analystRes = await app.request("/protected?role=ANALYST");
    expect(analystRes.status).toBe(200);

    const adminRes = await app.request("/protected?role=ADMIN");
    expect(adminRes.status).toBe(200);

    const viewerRes = await app.request("/protected?role=VIEWER");
    expect(viewerRes.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run the middleware tests**

```bash
npx vitest run tests/unit/middleware/roleGuard.test.ts
```

Expected: All tests pass.

---

### Task 6: Write e2e tests for auth endpoints

**Files:**
- Create: `tests/e2e/auth.test.ts`

- [ ] **Step 1: Create tests/e2e/auth.test.ts**

Note: E2e tests hit the real database. Ensure the test database is running and set `DATABASE_URL` in `.env` or use a separate test env.

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

// Import the app without starting the server
// We need to create a test-friendly app export
import app from "../../src/index.js";

const prisma = new PrismaClient();

describe("Auth E2E", () => {
  const testEmail = `e2e-auth-${Date.now()}@test.com`;

  afterAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({ where: { email: { startsWith: "e2e-auth-" } } });
    await prisma.$disconnect();
  });

  describe("POST /auth/register", () => {
    it("should register a new user", async () => {
      const res = await app.request("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testEmail,
          password: "password123",
          name: "E2E Test User",
        }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.email).toBe(testEmail);
      expect(body.data.role).toBe("VIEWER");
      expect(body.data).not.toHaveProperty("password");
    });

    it("should reject duplicate email", async () => {
      const res = await app.request("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testEmail,
          password: "password123",
          name: "Duplicate",
        }),
      });

      expect(res.status).toBe(409);
    });

    it("should reject invalid input", async () => {
      const res = await app.request("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "not-an-email",
          password: "12",
          name: "",
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST /auth/login", () => {
    it("should login with valid credentials", async () => {
      const res = await app.request("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testEmail,
          password: "password123",
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.token).toBeDefined();
      expect(body.data.user.email).toBe(testEmail);
    });

    it("should reject wrong password", async () => {
      const res = await app.request("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testEmail,
          password: "wrongpassword",
        }),
      });

      expect(res.status).toBe(401);
    });

    it("should reject non-existent email", async () => {
      const res = await app.request("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "nonexistent@test.com",
          password: "password123",
        }),
      });

      expect(res.status).toBe(401);
    });
  });
});
```

- [ ] **Step 2: Run e2e tests**

```bash
npx vitest run tests/e2e/auth.test.ts
```

Expected: All tests pass.

**Note:** The e2e tests import the app directly and use Hono's built-in test client — no HTTP server needed. However, `src/index.ts` currently calls `serve()` on import, which will start the server. Before running e2e tests, we need to separate the app creation from the server start. This is addressed in Task 7.

---

### Task 7: Separate app creation from server start

**Files:**
- Modify: `src/index.ts`
- Create: `src/app.ts`

- [ ] **Step 1: Extract app setup into src/app.ts**

```typescript
import { Hono } from "hono";
import { errorHandler } from "./middleware/errorHandler.js";
import { successResponse } from "./helpers/response.js";
import { prisma } from "./config/db.js";
import auth from "./routes/auth.routes.js";
import users from "./routes/user.routes.js";
import records from "./routes/record.routes.js";
import dashboard from "./routes/dashboard.routes.js";

const app = new Hono();

app.onError(errorHandler);

app.get("/health", async (c) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return c.json(successResponse({ status: "healthy", database: "connected" }));
  } catch {
    return c.json(successResponse({ status: "unhealthy", database: "disconnected" }), 503);
  }
});

app.route("/auth", auth);
app.route("/users", users);
app.route("/records", records);
app.route("/dashboard", dashboard);

export default app;
```

- [ ] **Step 2: Simplify src/index.ts to just start the server**

```typescript
import { serve } from "@hono/node-server";
import { env } from "./config/env.js";
import app from "./app.js";

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`);
});
```

- [ ] **Step 3: Update e2e tests to import from app.ts**

In `tests/e2e/auth.test.ts`, change the import:

```typescript
import app from "../../src/app.js";
```

- [ ] **Step 4: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 5: Verify dev server still works**

```bash
npm run dev
```

Expected: `Server running on http://localhost:3000`

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: seed script, unit tests, e2e tests, and app/server separation"
```

---

## Phase 6 Verification Checklist

After completing all tasks, verify:

1. `npm run db:seed` populates the database with 3 users and ~72 records
2. Login works with seeded credentials (admin@example.com / admin123)
3. Dashboard summaries show meaningful data from seed
4. `npx vitest run` passes all unit and e2e tests
5. Dev server still starts correctly after the app/server split
6. `npx tsc --noEmit` passes
