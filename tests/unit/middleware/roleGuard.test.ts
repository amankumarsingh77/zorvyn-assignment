import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import type { AppEnv } from "@/types/index.js";
import { requireRole } from "@/middleware/roleGuard.js";
import { errorHandler } from "@/middleware/errorHandler.js";
import type { Role } from "@generated/prisma/client.js";

function createApp(userRole: Role, ...allowedRoles: Role[]): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.onError(errorHandler);

  app.use("*", async (c, next) => {
    c.set("user", { userId: "user-1", role: userRole });
    await next();
  });

  app.get("/protected", requireRole(...allowedRoles), (c) => {
    return c.json({ ok: true }, 200);
  });

  return app;
}

describe("requireRole", () => {
  it("allows access for matching role", async () => {
    const app = createApp("ADMIN", "ADMIN");
    const res = await app.request("/protected");
    expect(res.status).toBe(200);
  });

  it("denies access (403) for non-matching role", async () => {
    const app = createApp("VIEWER", "ADMIN");
    const res = await app.request("/protected");
    expect(res.status).toBe(403);
  });

  it("allows any of multiple specified roles", async () => {
    const app = createApp("ANALYST", "ANALYST", "ADMIN");
    const res = await app.request("/protected");
    expect(res.status).toBe(200);
  });

  it("denies roles not in the allowed list", async () => {
    const app = createApp("VIEWER", "ANALYST", "ADMIN");
    const res = await app.request("/protected");
    expect(res.status).toBe(403);
  });
});
