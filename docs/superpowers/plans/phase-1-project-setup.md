# Phase 1: Project Setup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up a working TypeScript + Hono + Prisma + PostgreSQL project that starts, connects to the database, and responds to a health check endpoint.

**Architecture:** Hono app with Prisma ORM, PostgreSQL via Podman, environment config validated with Zod. Flat-by-layer structure.

**Tech Stack:** TypeScript, Hono, Prisma, PostgreSQL, Zod, Podman Compose, tsx, Vitest

---

### Task 1: Initialize Node.js project and install dependencies

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`

- [ ] **Step 1: Initialize project**

```bash
npm init -y
```

- [ ] **Step 2: Install production dependencies**

```bash
npm install hono @hono/node-server prisma @prisma/client zod dotenv jsonwebtoken bcrypt
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install -D typescript @types/node @types/jsonwebtoken @types/bcrypt tsx vitest
```

- [ ] **Step 4: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist",
    "rootDir": ".",
    "resolveJsonModule": true,
    "declaration": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "paths": {
      "@/*": ["./src/*"]
    },
    "baseUrl": "."
  },
  "include": ["src/**/*", "prisma/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 5: Add scripts to package.json**

Add these to the `"scripts"` section:

```json
{
  "dev": "tsx watch src/index.ts",
  "build": "tsc",
  "start": "node dist/src/index.js",
  "db:generate": "prisma generate",
  "db:migrate": "prisma migrate dev",
  "db:push": "prisma db push",
  "db:seed": "tsx prisma/seed.ts",
  "test": "vitest run",
  "test:watch": "vitest",
  "typecheck": "tsc --noEmit"
}
```

Also add `"type": "module"` to package.json root.

- [ ] **Step 6: Create .gitignore**

```
node_modules/
dist/
.env
assignment.txt
docs/superpowers/
```

---

### Task 2: Set up Podman Compose for PostgreSQL

**Files:**
- Create: `podman-compose.yml`

- [ ] **Step 1: Create podman-compose.yml**

```yaml
version: "3.8"

services:
  postgres:
    image: docker.io/library/postgres:16-alpine
    container_name: finance-db
    environment:
      POSTGRES_USER: finance_user
      POSTGRES_PASSWORD: finance_pass
      POSTGRES_DB: finance_db
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

- [ ] **Step 2: Start PostgreSQL**

```bash
podman-compose up -d
```

- [ ] **Step 3: Verify PostgreSQL is running**

```bash
podman exec finance-db pg_isready -U finance_user
```

Expected: `/var/run/postgresql:5432 - accepting connections`

---

### Task 3: Set up environment configuration

**Files:**
- Create: `src/config/env.ts`
- Create: `.env`
- Create: `.env.example`

- [ ] **Step 1: Create .env.example**

```
DATABASE_URL=postgresql://finance_user:finance_pass@localhost:5432/finance_db
JWT_SECRET=your-secret-key-change-in-production
PORT=3000
```

- [ ] **Step 2: Create .env with actual values**

```
DATABASE_URL=postgresql://finance_user:finance_pass@localhost:5432/finance_db
JWT_SECRET=dev-secret-key-not-for-production
PORT=3000
```

- [ ] **Step 3: Create src/config/env.ts**

```typescript
import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(10),
  PORT: z.coerce.number().default(3000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
```

---

### Task 4: Set up Prisma schema with User and Record models

**Files:**
- Create: `prisma/schema.prisma`

- [ ] **Step 1: Initialize Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

This creates `prisma/schema.prisma` and updates `.env` with a `DATABASE_URL` placeholder. Our `.env` already has the correct URL, so ignore the placeholder.

- [ ] **Step 2: Replace prisma/schema.prisma with the full schema**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  VIEWER
  ANALYST
  ADMIN
}

enum Status {
  ACTIVE
  INACTIVE
}

enum RecordType {
  INCOME
  EXPENSE
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String
  role      Role     @default(VIEWER)
  status    Status   @default(ACTIVE)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  records Record[]

  @@map("users")
}

model Record {
  id        String     @id @default(uuid())
  amount    Decimal    @db.Decimal(12, 2)
  type      RecordType
  category  String
  date      DateTime
  notes     String?
  createdBy String
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  creator User @relation(fields: [createdBy], references: [id], onDelete: Restrict)

  @@index([type])
  @@index([category])
  @@index([date])
  @@index([type, date])
  @@map("records")
}
```

- [ ] **Step 3: Run the migration**

```bash
npx prisma migrate dev --name init
```

Expected: Migration created and applied successfully. Prisma Client generated.

- [ ] **Step 4: Verify the migration**

```bash
npx prisma db pull
```

Should show no drift — schema matches the database.

---

### Task 5: Create Prisma client instance

**Files:**
- Create: `src/config/db.ts`

- [ ] **Step 1: Create src/config/db.ts**

```typescript
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
```

---

### Task 6: Create shared types

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Create src/types/index.ts**

```typescript
import type { Role } from "@prisma/client";

export type JwtPayload = {
  userId: string;
  role: Role;
};

export type Variables = {
  user: JwtPayload;
};
```

---

### Task 7: Create response helpers

**Files:**
- Create: `src/helpers/response.ts`

- [ ] **Step 1: Create src/helpers/response.ts**

```typescript
type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
};

export function successResponse<T>(data: T, meta?: PaginationMeta) {
  const response: { success: true; data: T; meta?: PaginationMeta } = {
    success: true,
    data,
  };
  if (meta) {
    response.meta = meta;
  }
  return response;
}

export function errorResponse(code: string, message: string) {
  return {
    success: false,
    error: { code, message },
  };
}
```

---

### Task 8: Create Hono app with health check endpoint

**Files:**
- Create: `src/index.ts`

- [ ] **Step 1: Create src/index.ts**

```typescript
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { env } from "./config/env.js";
import { prisma } from "./config/db.js";
import { successResponse } from "./helpers/response.js";

const app = new Hono();

app.get("/health", async (c) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return c.json(successResponse({ status: "healthy", database: "connected" }));
  } catch {
    return c.json(successResponse({ status: "unhealthy", database: "disconnected" }), 503);
  }
});

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`);
});

export default app;
```

- [ ] **Step 2: Start the dev server**

```bash
npm run dev
```

Expected: `Server running on http://localhost:3000`

- [ ] **Step 3: Test the health endpoint**

```bash
curl http://localhost:3000/health
```

Expected:

```json
{"success":true,"data":{"status":"healthy","database":"connected"}}
```

- [ ] **Step 4: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: No errors.

---

### Task 9: Create directory structure for remaining phases

**Files:**
- Create: `src/middleware/.gitkeep`
- Create: `src/routes/.gitkeep`
- Create: `src/services/.gitkeep`
- Create: `src/validations/.gitkeep`
- Create: `tests/unit/.gitkeep`
- Create: `tests/e2e/.gitkeep`

- [ ] **Step 1: Create empty directories**

```bash
mkdir -p src/middleware src/routes src/services src/validations tests/unit tests/e2e
touch src/middleware/.gitkeep src/routes/.gitkeep src/services/.gitkeep src/validations/.gitkeep tests/unit/.gitkeep tests/e2e/.gitkeep
```

- [ ] **Step 2: Commit the project setup**

```bash
git add .
git commit -m "feat: project setup with Hono, Prisma, PostgreSQL, and health check"
```

---

## Phase 1 Verification Checklist

After completing all tasks, verify:

1. `podman-compose up -d` starts PostgreSQL
2. `npm run dev` starts the server on port 3000
3. `curl http://localhost:3000/health` returns `{"success":true,"data":{"status":"healthy","database":"connected"}}`
4. `npx tsc --noEmit` passes with no errors
5. The project structure matches:

```
src/
├── config/
│   ├── env.ts              # environment variables (validated with Zod)
│   └── db.ts               # Prisma client instance
├── middleware/
│   ├── auth.ts             # JWT verification, attach user to context
│   ├── roleGuard.ts        # check role against allowed roles
│   ├── validate.ts         # Zod validation middleware
│   └── errorHandler.ts     # global error handler
├── routes/
│   ├── auth.routes.ts
│   ├── user.routes.ts
│   ├── record.routes.ts
│   └── dashboard.routes.ts
├── services/
│   ├── auth.service.ts
│   ├── user.service.ts
│   ├── record.service.ts
│   └── dashboard.service.ts
├── validations/
│   ├── auth.schema.ts
│   ├── user.schema.ts
│   ├── record.schema.ts
│   └── dashboard.schema.ts
├── helpers/
│   └── response.ts         # success/error response formatters
├── types/
│   └── index.ts            # shared types (JWT payload, context, etc.)
└── index.ts                # app setup + server start

tests/
├── unit/
│   ├── services/
│   │   ├── auth.service.test.ts
│   │   ├── user.service.test.ts
│   │   ├── record.service.test.ts
│   │   └── dashboard.service.test.ts
│   └── middleware/
│       ├── auth.test.ts
│       └── roleGuard.test.ts
└── e2e/
    ├── auth.test.ts
    ├── users.test.ts
    ├── records.test.ts
    └── dashboard.test.ts

prisma/
├── schema.prisma
└── seed.ts

.env
.env.example
.gitignore
package.json
podman-compose.yml
tsconfig.json
README.md
```
