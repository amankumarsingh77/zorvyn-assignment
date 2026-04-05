import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { AppEnv } from "@/types/index.js";
import { errorHandler } from "@/middleware/errorHandler.js";

const mockFindUserById = vi.hoisted(() => vi.fn());
const mockVerify = vi.hoisted(() => vi.fn());
const mockEnv = vi.hoisted(() => ({ JWT_SECRET: "test-secret" }));

vi.mock("@/repositories/user.repository.js", () => ({
  findUserById: mockFindUserById,
}));

vi.mock("jsonwebtoken", () => ({
  default: { verify: mockVerify },
}));

vi.mock("@/config/env.js", () => ({
  env: mockEnv,
}));

import { authenticate } from "@/middleware/auth.js";

function createApp(): Hono<AppEnv> {
  const app = new Hono<AppEnv>();
  app.onError(errorHandler);
  app.get("/test", authenticate, (c) => {
    const user = c.get("user");
    return c.json({ ok: true, user }, 200);
  });
  return app;
}

describe("authenticate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws UNAUTHORIZED when no Authorization header", async () => {
    const app = createApp();
    const res = await app.request("/test");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("throws UNAUTHORIZED when header doesn't start with 'Bearer '", async () => {
    const app = createApp();
    const res = await app.request("/test", {
      headers: { Authorization: "Basic abc123" },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("sets user in context and calls next() for valid token with active user", async () => {
    const payload = { userId: "user-1", role: "ADMIN" };
    mockVerify.mockReturnValue(payload);
    mockFindUserById.mockResolvedValue({ id: "user-1", status: "ACTIVE" });

    const app = createApp();
    const res = await app.request("/test", {
      headers: { Authorization: "Bearer valid-token" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.user).toEqual(payload);
  });

  it("throws UNAUTHORIZED for expired/invalid token (jwt.verify throws)", async () => {
    mockVerify.mockImplementation(() => {
      throw new Error("jwt expired");
    });

    const app = createApp();
    const res = await app.request("/test", {
      headers: { Authorization: "Bearer expired-token" },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(body.error.message).toBe("Invalid or expired token");
  });

  it("throws UNAUTHORIZED when token payload doesn't match JwtPayload shape", async () => {
    mockVerify.mockReturnValue({ sub: "123" }); // missing userId and role

    const app = createApp();
    const res = await app.request("/test", {
      headers: { Authorization: "Bearer bad-payload-token" },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(body.error.message).toBe("Invalid token payload");
  });

  it("throws UNAUTHORIZED when user no longer exists in database", async () => {
    mockVerify.mockReturnValue({ userId: "user-gone", role: "VIEWER" });
    mockFindUserById.mockResolvedValue(null);

    const app = createApp();
    const res = await app.request("/test", {
      headers: { Authorization: "Bearer valid-token" },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(body.error.message).toBe("User no longer exists");
  });

  it("throws FORBIDDEN when user status is INACTIVE", async () => {
    mockVerify.mockReturnValue({ userId: "user-2", role: "VIEWER" });
    mockFindUserById.mockResolvedValue({ id: "user-2", status: "INACTIVE" });

    const app = createApp();
    const res = await app.request("/test", {
      headers: { Authorization: "Bearer valid-token" },
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
    expect(body.error.message).toBe("Account is inactive");
  });
});
