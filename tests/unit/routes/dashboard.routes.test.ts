import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { AppEnv } from "@/types/index.js";

const { mockGetSummary, mockGetCategorySummary, mockGetRecentActivity, mockGetTrends } = vi.hoisted(() => ({
  mockGetSummary: vi.fn(),
  mockGetCategorySummary: vi.fn(),
  mockGetRecentActivity: vi.fn(),
  mockGetTrends: vi.fn(),
}));

vi.mock("@/services/dashboard.service.js", () => ({
  getSummary: mockGetSummary,
  getCategorySummary: mockGetCategorySummary,
  getRecentActivity: mockGetRecentActivity,
  getTrends: mockGetTrends,
}));

vi.mock("@/middleware/auth.js", () => ({
  authenticate: vi.fn().mockImplementation(async (c, next) => {
    c.set("user", { userId: "test-user-id", role: "ANALYST" });
    await next();
  }),
}));

import { authenticate } from "@/middleware/auth.js";
import { errorHandler } from "@/middleware/errorHandler.js";
import { dashboardRoutes } from "@/routes/dashboard.routes.js";

const mockAuthenticate = vi.mocked(authenticate);

function createApp(): Hono<AppEnv> {
  const app = new Hono<AppEnv>();
  app.onError(errorHandler);
  app.route("/dashboard", dashboardRoutes);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthenticate.mockImplementation(async (c, next) => {
    c.set("user", { userId: "test-user-id", role: "ANALYST" });
    await next();
  });
});

describe("GET /dashboard/summary", () => {
  it("returns 200 with summary data for ANALYST", async () => {
    const summaryData = { totalIncome: 5000, totalExpenses: 3000, netBalance: 2000 };
    mockGetSummary.mockResolvedValueOnce(summaryData);

    const app = createApp();
    const res = await app.request("/dashboard/summary");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, data: summaryData });
    expect(mockGetSummary).toHaveBeenCalledOnce();
  });

  it("returns 403 for VIEWER", async () => {
    mockAuthenticate.mockImplementationOnce(async (c, next) => {
      c.set("user", { userId: "test-user-id", role: "VIEWER" });
      await next();
    });

    const app = createApp();
    const res = await app.request("/dashboard/summary");
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body).toEqual({
      success: false,
      error: { code: "FORBIDDEN", message: "Insufficient permissions" },
    });
  });
});

describe("GET /dashboard/category-summary", () => {
  it("returns 200 with category data for ANALYST", async () => {
    const categoryData = [
      { category: "food", type: "EXPENSE", total: 1200 },
      { category: "salary", type: "INCOME", total: 5000 },
    ];
    mockGetCategorySummary.mockResolvedValueOnce(categoryData);

    const app = createApp();
    const res = await app.request("/dashboard/category-summary");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, data: categoryData });
    expect(mockGetCategorySummary).toHaveBeenCalledOnce();
  });

  it("returns 403 for VIEWER", async () => {
    mockAuthenticate.mockImplementationOnce(async (c, next) => {
      c.set("user", { userId: "test-user-id", role: "VIEWER" });
      await next();
    });

    const app = createApp();
    const res = await app.request("/dashboard/category-summary");
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body).toEqual({
      success: false,
      error: { code: "FORBIDDEN", message: "Insufficient permissions" },
    });
  });
});

describe("GET /dashboard/recent-activity", () => {
  it("returns 200 with recent activity for ANALYST", async () => {
    const activityData = [
      { id: "1", amount: 100, type: "INCOME", category: "salary" },
    ];
    mockGetRecentActivity.mockResolvedValueOnce(activityData);

    const app = createApp();
    const res = await app.request("/dashboard/recent-activity");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, data: activityData });
    expect(mockGetRecentActivity).toHaveBeenCalledOnce();
  });

  it("returns 403 for VIEWER", async () => {
    mockAuthenticate.mockImplementationOnce(async (c, next) => {
      c.set("user", { userId: "test-user-id", role: "VIEWER" });
      await next();
    });

    const app = createApp();
    const res = await app.request("/dashboard/recent-activity");
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body).toEqual({
      success: false,
      error: { code: "FORBIDDEN", message: "Insufficient permissions" },
    });
  });
});

describe("GET /dashboard/trends", () => {
  it("returns 200 with monthly trends by default for ADMIN", async () => {
    mockAuthenticate.mockImplementationOnce(async (c, next) => {
      c.set("user", { userId: "test-user-id", role: "ADMIN" });
      await next();
    });

    const trendsData = [
      { month: "2025-01", income: 5000, expense: 3000 },
      { month: "2025-02", income: 5500, expense: 2800 },
    ];
    mockGetTrends.mockResolvedValueOnce(trendsData);

    const app = createApp();
    const res = await app.request("/dashboard/trends");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, data: trendsData });
    expect(mockGetTrends).toHaveBeenCalledWith({ granularity: "monthly" });
  });

  it("passes weekly granularity to service", async () => {
    const weeklyData = [
      { week: "2025-06-02", income: 1200, expense: 300 },
    ];
    mockGetTrends.mockResolvedValueOnce(weeklyData);

    const app = createApp();
    const res = await app.request("/dashboard/trends?granularity=weekly");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, data: weeklyData });
    expect(mockGetTrends).toHaveBeenCalledWith({ granularity: "weekly" });
  });

  it("returns 403 for VIEWER", async () => {
    mockAuthenticate.mockImplementationOnce(async (c, next) => {
      c.set("user", { userId: "test-user-id", role: "VIEWER" });
      await next();
    });

    const app = createApp();
    const res = await app.request("/dashboard/trends");
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body).toEqual({
      success: false,
      error: { code: "FORBIDDEN", message: "Insufficient permissions" },
    });
  });
});
