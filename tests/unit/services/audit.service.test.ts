import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindAuditLogs, mockCountAuditLogs } = vi.hoisted(() => ({
  mockFindAuditLogs: vi.fn(),
  mockCountAuditLogs: vi.fn(),
}));

vi.mock("@/repositories/audit.repository.js", () => ({
  findAuditLogs: mockFindAuditLogs,
  countAuditLogs: mockCountAuditLogs,
}));

import { listAuditLogs } from "@/services/audit.service.js";
import { listAuditLogsQuerySchema } from "@/validations/audit.schema.js";

const makeFakeLog = (overrides: Record<string, unknown> = {}) => ({
  id: "log-1",
  action: "CREATE",
  entity: "Record",
  entityId: "entity-1",
  userId: "user-1",
  changes: null,
  createdAt: new Date("2025-01-15T10:00:00Z"),
  user: { id: "user-1", name: "Test User", email: "test@example.com" },
  ...overrides,
});

describe("listAuditLogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all logs with pagination metadata when no filters", async () => {
    const logs = [makeFakeLog(), makeFakeLog({ id: "log-2" })];
    mockFindAuditLogs.mockResolvedValueOnce(logs);
    mockCountAuditLogs.mockResolvedValueOnce(2);

    const result = await listAuditLogs({ page: 1, limit: 20 });

    expect(result).toEqual({
      auditLogs: logs,
      total: 2,
      page: 1,
      limit: 20,
    });
    expect(mockFindAuditLogs).toHaveBeenCalledWith({}, 0, 20);
    expect(mockCountAuditLogs).toHaveBeenCalledWith({});
  });

  it("filters by entityId (exact match)", async () => {
    const entityId = "550e8400-e29b-41d4-a716-446655440000";
    mockFindAuditLogs.mockResolvedValueOnce([]);
    mockCountAuditLogs.mockResolvedValueOnce(0);

    await listAuditLogs({ page: 1, limit: 20, entityId });

    expect(mockFindAuditLogs).toHaveBeenCalledWith(
      { entityId },
      0,
      20,
    );
  });

  it("filters by userId (exact match)", async () => {
    const userId = "550e8400-e29b-41d4-a716-446655440001";
    mockFindAuditLogs.mockResolvedValueOnce([]);
    mockCountAuditLogs.mockResolvedValueOnce(0);

    await listAuditLogs({ page: 1, limit: 20, userId });

    expect(mockFindAuditLogs).toHaveBeenCalledWith(
      { userId },
      0,
      20,
    );
  });

  it("filters by action (exact match on enum)", async () => {
    mockFindAuditLogs.mockResolvedValueOnce([]);
    mockCountAuditLogs.mockResolvedValueOnce(0);

    await listAuditLogs({ page: 1, limit: 20, action: "DELETE" });

    expect(mockFindAuditLogs).toHaveBeenCalledWith(
      { action: "DELETE" },
      0,
      20,
    );
  });

  it("filters by date range (startDate and endDate)", async () => {
    const startDate = "2025-01-01T00:00:00Z";
    const endDate = "2025-01-31T23:59:59Z";
    mockFindAuditLogs.mockResolvedValueOnce([]);
    mockCountAuditLogs.mockResolvedValueOnce(0);

    await listAuditLogs({ page: 1, limit: 20, startDate, endDate });

    expect(mockFindAuditLogs).toHaveBeenCalledWith(
      {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      0,
      20,
    );
  });

  it("filters by startDate only", async () => {
    const startDate = "2025-01-01T00:00:00Z";
    mockFindAuditLogs.mockResolvedValueOnce([]);
    mockCountAuditLogs.mockResolvedValueOnce(0);

    await listAuditLogs({ page: 1, limit: 20, startDate });

    expect(mockFindAuditLogs).toHaveBeenCalledWith(
      { createdAt: { gte: new Date(startDate) } },
      0,
      20,
    );
  });

  it("combines multiple filters with AND logic", async () => {
    const userId = "550e8400-e29b-41d4-a716-446655440001";
    const startDate = "2025-01-01T00:00:00Z";
    mockFindAuditLogs.mockResolvedValueOnce([]);
    mockCountAuditLogs.mockResolvedValueOnce(0);

    await listAuditLogs({
      page: 1,
      limit: 20,
      action: "UPDATE",
      userId,
      startDate,
    });

    expect(mockFindAuditLogs).toHaveBeenCalledWith(
      {
        userId,
        action: "UPDATE",
        createdAt: { gte: new Date(startDate) },
      },
      0,
      20,
    );
  });

  it("calculates correct skip/take from page and limit", async () => {
    mockFindAuditLogs.mockResolvedValueOnce([]);
    mockCountAuditLogs.mockResolvedValueOnce(0);

    await listAuditLogs({ page: 3, limit: 10 });

    expect(mockFindAuditLogs).toHaveBeenCalledWith({}, 20, 10);
  });
});

describe("listAuditLogsQuerySchema", () => {
  it("coerces page and limit to numbers and uses defaults", () => {
    const result = listAuditLogsQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it("coerces string page/limit to numbers", () => {
    const result = listAuditLogsQuerySchema.parse({ page: "3", limit: "50" });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(50);
  });

  it("accepts valid AuditAction values", () => {
    for (const action of ["CREATE", "UPDATE", "DELETE"]) {
      const result = listAuditLogsQuerySchema.parse({ action });
      expect(result.action).toBe(action);
    }
  });

  it("rejects invalid action values", () => {
    expect(() => listAuditLogsQuerySchema.parse({ action: "INVALID" })).toThrow();
  });

  it("accepts valid UUID for entityId", () => {
    const result = listAuditLogsQuerySchema.parse({
      entityId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.entityId).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("rejects non-UUID for entityId", () => {
    expect(() => listAuditLogsQuerySchema.parse({ entityId: "not-a-uuid" })).toThrow();
  });

  it("accepts valid UUID for userId", () => {
    const result = listAuditLogsQuerySchema.parse({
      userId: "550e8400-e29b-41d4-a716-446655440001",
    });
    expect(result.userId).toBe("550e8400-e29b-41d4-a716-446655440001");
  });

  it("rejects non-UUID for userId", () => {
    expect(() => listAuditLogsQuerySchema.parse({ userId: "bad" })).toThrow();
  });
});
