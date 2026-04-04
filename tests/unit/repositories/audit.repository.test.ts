import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate, mockFindMany, mockCount } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindMany: vi.fn(),
  mockCount: vi.fn(),
}));

vi.mock("@/config/db.js", () => ({
  prisma: {
    auditLog: {
      create: mockCreate,
      findMany: mockFindMany,
      count: mockCount,
    },
  },
}));

import {
  createAuditLog,
  createAuditLogTx,
  findAuditLogs,
  countAuditLogs,
} from "@/repositories/audit.repository.js";

describe("createAuditLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls prisma.auditLog.create with correct data", async () => {
    const data = {
      action: "CREATE" as const,
      entity: "Record",
      entityId: "record-1",
      changes: { amount: 500, type: "EXPENSE" },
      user: { connect: { id: "user-1" } },
    };

    mockCreate.mockResolvedValueOnce(undefined);

    await createAuditLog(data);

    expect(mockCreate).toHaveBeenCalledOnce();
    expect(mockCreate).toHaveBeenCalledWith({ data });
  });
});

describe("createAuditLogTx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls tx.auditLog.create with correct data", async () => {
    const mockTxCreate = vi.fn().mockResolvedValueOnce(undefined);
    const tx = {
      auditLog: { create: mockTxCreate },
    };

    const data = {
      action: "DELETE" as const,
      entity: "Record",
      entityId: "record-2",
      changes: { amount: 100 },
      user: { connect: { id: "user-2" } },
    };

    await createAuditLogTx(tx as never, data);

    expect(mockTxCreate).toHaveBeenCalledOnce();
    expect(mockTxCreate).toHaveBeenCalledWith({ data });
  });
});

describe("findAuditLogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies filters, pagination, and orders by createdAt desc", async () => {
    const where = { entity: "Record", userId: "user-1" };
    const mockResults = [
      {
        id: "log-1",
        action: "CREATE",
        entity: "Record",
        entityId: "record-1",
        userId: "user-1",
        changes: {},
        createdAt: new Date(),
        user: { id: "user-1", name: "Test", email: "test@example.com" },
      },
    ];

    mockFindMany.mockResolvedValueOnce(mockResults);

    const result = await findAuditLogs(where, 0, 20);

    expect(mockFindMany).toHaveBeenCalledOnce();
    expect(mockFindMany).toHaveBeenCalledWith({
      where,
      skip: 0,
      take: 20,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        userId: true,
        changes: true,
        createdAt: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
    expect(result).toEqual(mockResults);
  });

  it("applies skip and take for pagination", async () => {
    const where = {};
    mockFindMany.mockResolvedValueOnce([]);

    await findAuditLogs(where, 40, 20);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 40, take: 20 }),
    );
  });

  it("includes user relation with id, name, email", async () => {
    mockFindMany.mockResolvedValueOnce([]);

    await findAuditLogs({}, 0, 10);

    const call = mockFindMany.mock.calls[0][0] as { select: { user: { select: Record<string, boolean> } } };
    expect(call.select.user.select).toEqual({
      id: true,
      name: true,
      email: true,
    });
  });
});

describe("countAuditLogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts with the same filter logic", async () => {
    const where = { entity: "Record", action: "UPDATE" as const };
    mockCount.mockResolvedValueOnce(42);

    const result = await countAuditLogs(where);

    expect(mockCount).toHaveBeenCalledOnce();
    expect(mockCount).toHaveBeenCalledWith({ where });
    expect(result).toBe(42);
  });
});
