import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { AppEnv } from "@/types/index.js";

const { mockListAuditLogs } = vi.hoisted(() => ({
  mockListAuditLogs: vi.fn(),
}));

vi.mock("@/services/audit.service.js", () => ({
  listAuditLogs: mockListAuditLogs,
}));

vi.mock("@/middleware/auth.js", () => ({
  authenticate: vi.fn().mockImplementation(async (c, next) => {
    c.set("user", { userId: "test-user-id", role: "ADMIN" });
    await next();
  }),
}));

import { authenticate } from "@/middleware/auth.js";
import { errorHandler } from "@/middleware/errorHandler.js";
import { auditRoutes } from "@/routes/audit.routes.js";

const mockAuthenticate = vi.mocked(authenticate);

function createApp(): Hono<AppEnv> {
  const app = new Hono<AppEnv>();
  app.onError(errorHandler);
  app.route("/audit-logs", auditRoutes);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthenticate.mockImplementation(async (c, next) => {
    c.set("user", { userId: "test-user-id", role: "ADMIN" });
    await next();
  });
});

describe("GET /audit-logs", () => {
  it("returns 200 with paginated audit logs for ADMIN", async () => {
    const auditLogs = [
      { id: "log-1", entityId: "rec-1", userId: "user-1", action: "CREATE", changes: {}, createdAt: "2026-04-04T00:00:00.000Z" },
      { id: "log-2", entityId: "rec-2", userId: "user-2", action: "UPDATE", changes: {}, createdAt: "2026-04-04T01:00:00.000Z" },
    ];
    mockListAuditLogs.mockResolvedValueOnce({
      auditLogs,
      total: 2,
      page: 1,
      limit: 20,
    });

    const app = createApp();
    const res = await app.request("/audit-logs");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      success: true,
      data: auditLogs,
      meta: {
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
      },
    });
    expect(mockListAuditLogs).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
    });
  });

  it("passes query filters to service", async () => {
    mockListAuditLogs.mockResolvedValueOnce({
      auditLogs: [],
      total: 0,
      page: 1,
      limit: 20,
    });

    const app = createApp();
    const entityId = "550e8400-e29b-41d4-a716-446655440000";
    const userId = "660e8400-e29b-41d4-a716-446655440000";
    const res = await app.request(
      `/audit-logs?entityId=${entityId}&userId=${userId}&action=CREATE&page=2&limit=10`
    );

    expect(res.status).toBe(200);
    expect(mockListAuditLogs).toHaveBeenCalledWith({
      entityId,
      userId,
      action: "CREATE",
      page: 2,
      limit: 10,
    });
  });

  it("returns 403 for VIEWER", async () => {
    mockAuthenticate.mockImplementationOnce(async (c, next) => {
      c.set("user", { userId: "test-user-id", role: "VIEWER" });
      await next();
    });

    const app = createApp();
    const res = await app.request("/audit-logs");
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body).toEqual({
      success: false,
      error: { code: "FORBIDDEN", message: "Insufficient permissions" },
    });
  });

  it("returns 403 for ANALYST", async () => {
    mockAuthenticate.mockImplementationOnce(async (c, next) => {
      c.set("user", { userId: "test-user-id", role: "ANALYST" });
      await next();
    });

    const app = createApp();
    const res = await app.request("/audit-logs");
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body).toEqual({
      success: false,
      error: { code: "FORBIDDEN", message: "Insufficient permissions" },
    });
  });

  it("returns pagination meta with hasNextPage true when more pages exist", async () => {
    mockListAuditLogs.mockResolvedValueOnce({
      auditLogs: [{ id: "log-1" }],
      total: 25,
      page: 1,
      limit: 10,
    });

    const app = createApp();
    const res = await app.request("/audit-logs?page=1&limit=10");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.meta).toEqual({
      page: 1,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasNextPage: true,
    });
  });
});
