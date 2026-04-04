import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock declarations using vi.hoisted
const {
  mockCreate,
  mockUpdate,
  mockDelete,
  mockFindUniqueOrThrow,
  mockFindMany,
  mockFindUnique,
  mockCount,
  mockTransaction,
  mockAuditCreate,
} = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
  mockFindUniqueOrThrow: vi.fn(),
  mockFindMany: vi.fn(),
  mockFindUnique: vi.fn(),
  mockCount: vi.fn(),
  mockTransaction: vi.fn(),
  mockAuditCreate: vi.fn(),
}));

vi.mock("@/config/db.js", () => ({
  prisma: {
    record: {
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
      findUniqueOrThrow: mockFindUniqueOrThrow,
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      count: mockCount,
    },
    $transaction: mockTransaction,
  },
}));

vi.mock("@/repositories/audit.repository.js", () => ({
  createAuditLogTx: mockAuditCreate,
}));

import {
  createRecord,
  updateRecordById,
  deleteRecordById,
  computeChanges,
} from "@/repositories/record.repository.js";

const AUDITABLE_FIELDS = ["amount", "type", "category", "date", "notes"] as const;

describe("computeChanges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only fields that differ between old and new", () => {
    const oldRecord = { amount: "100.00", type: "INCOME", category: "salary" };
    const newRecord = { amount: "200.00", type: "INCOME", category: "bonus" };

    const result = computeChanges(oldRecord, newRecord, ["amount", "type", "category"]);

    expect(result).toEqual({
      amount: { old: "100.00", new: "200.00" },
      category: { old: "salary", new: "bonus" },
    });
    expect(result).not.toHaveProperty("type");
  });

  it("returns empty object when no fields differ", () => {
    const record = { amount: "100.00", type: "INCOME" };
    const result = computeChanges(record, record, ["amount", "type"]);
    expect(result).toEqual({});
  });

  it("handles Decimal fields by comparing string representations", () => {
    const oldRecord = { amount: { toString: () => "100.00" } };
    const newRecord = { amount: { toString: () => "200.00" } };

    const result = computeChanges(
      oldRecord as unknown as Record<string, unknown>,
      newRecord as unknown as Record<string, unknown>,
      ["amount"],
    );

    expect(result).toEqual({
      amount: { old: oldRecord.amount, new: newRecord.amount },
    });
  });

  it("treats equal Decimal string representations as unchanged", () => {
    const oldRecord = { amount: { toString: () => "100.00" } };
    const newRecord = { amount: { toString: () => "100.00" } };

    const result = computeChanges(
      oldRecord as unknown as Record<string, unknown>,
      newRecord as unknown as Record<string, unknown>,
      ["amount"],
    );

    expect(result).toEqual({});
  });

  it("handles undefined/null fields by converting to empty string for comparison", () => {
    const oldRecord = { notes: undefined };
    const newRecord = { notes: "some note" };

    const result = computeChanges(
      oldRecord as unknown as Record<string, unknown>,
      newRecord as unknown as Record<string, unknown>,
      ["notes"],
    );

    expect(result).toEqual({
      notes: { old: undefined, new: "some note" },
    });
  });
});

describe("createRecord", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a record and an audit log entry with action CREATE atomically", async () => {
    const userId = "user-1";
    const createdRecord = {
      id: "record-1",
      amount: { toString: () => "500.00" },
      type: "EXPENSE",
      category: "rent",
      date: new Date("2026-01-15"),
      notes: "Monthly rent",
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      creator: { id: userId, name: "Test User", email: "test@example.com" },
    };

    const txClient = {
      record: {
        create: vi.fn().mockResolvedValueOnce(createdRecord),
      },
      auditLog: { create: vi.fn() },
    };

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(txClient));
    mockAuditCreate.mockResolvedValueOnce(undefined);

    const data = {
      amount: 500,
      type: "EXPENSE" as const,
      category: "rent",
      date: new Date("2026-01-15"),
      notes: "Monthly rent",
      creator: { connect: { id: userId } },
    };

    const result = await createRecord(data as never, userId);

    expect(result).toEqual(createdRecord);
    expect(mockTransaction).toHaveBeenCalledOnce();
    expect(txClient.record.create).toHaveBeenCalledOnce();
    expect(mockAuditCreate).toHaveBeenCalledOnce();
    expect(mockAuditCreate).toHaveBeenCalledWith(
      txClient,
      expect.objectContaining({
        action: "CREATE",
        entity: "Record",
        entityId: "record-1",
        user: { connect: { id: userId } },
      }),
    );
  });

  it("includes all record fields in CREATE audit changes", async () => {
    const userId = "user-1";
    const createdRecord = {
      id: "record-1",
      amount: { toString: () => "250.00" },
      type: "INCOME",
      category: "freelance",
      date: new Date("2026-02-01"),
      notes: null,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      creator: { id: userId, name: "Test", email: "test@test.com" },
    };

    const txClient = {
      record: { create: vi.fn().mockResolvedValueOnce(createdRecord) },
      auditLog: { create: vi.fn() },
    };

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(txClient));
    mockAuditCreate.mockResolvedValueOnce(undefined);

    await createRecord({} as never, userId);

    const auditCall = mockAuditCreate.mock.calls[0] as unknown[];
    const auditData = auditCall[1] as { changes: Record<string, unknown> };

    expect(auditData.changes).toEqual({
      amount: "250.00",
      type: "INCOME",
      category: "freelance",
      date: createdRecord.date.toISOString(),
      notes: null,
    });
  });
});

describe("updateRecordById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches old record, updates, computes diff, and creates UPDATE audit log atomically", async () => {
    const id = "record-1";
    const userId = "user-1";
    const oldRecord = {
      amount: { toString: () => "100.00" },
      type: "INCOME",
      category: "salary",
      date: new Date("2026-01-01"),
      notes: "Old note",
    };
    const updatedRecord = {
      id,
      amount: { toString: () => "200.00" },
      type: "INCOME",
      category: "salary",
      date: new Date("2026-01-01"),
      notes: "New note",
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      creator: { id: userId, name: "Test", email: "test@test.com" },
    };

    const txClient = {
      record: {
        findUniqueOrThrow: vi.fn().mockResolvedValueOnce(oldRecord),
        update: vi.fn().mockResolvedValueOnce(updatedRecord),
      },
      auditLog: { create: vi.fn() },
    };

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(txClient));
    mockAuditCreate.mockResolvedValueOnce(undefined);

    const result = await updateRecordById(id, { notes: "New note" } as never, userId);

    expect(result).toEqual(updatedRecord);
    expect(mockTransaction).toHaveBeenCalledOnce();
    expect(txClient.record.findUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id } }),
    );
    expect(txClient.record.update).toHaveBeenCalledOnce();
    expect(mockAuditCreate).toHaveBeenCalledWith(
      txClient,
      expect.objectContaining({
        action: "UPDATE",
        entity: "Record",
        entityId: id,
        user: { connect: { id: userId } },
      }),
    );
  });

  it("includes only changed fields in UPDATE audit changes", async () => {
    const id = "record-1";
    const userId = "user-1";
    const oldRecord = {
      amount: { toString: () => "100.00" },
      type: "INCOME",
      category: "salary",
      date: new Date("2026-01-01"),
      notes: "Same note",
    };
    const updatedRecord = {
      id,
      amount: { toString: () => "500.00" },
      type: "INCOME",
      category: "salary",
      date: new Date("2026-01-01"),
      notes: "Same note",
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      creator: { id: userId, name: "Test", email: "test@test.com" },
    };

    const txClient = {
      record: {
        findUniqueOrThrow: vi.fn().mockResolvedValueOnce(oldRecord),
        update: vi.fn().mockResolvedValueOnce(updatedRecord),
      },
    };

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(txClient));
    mockAuditCreate.mockResolvedValueOnce(undefined);

    await updateRecordById(id, { amount: 500 } as never, userId);

    const auditCall = mockAuditCreate.mock.calls[0] as unknown[];
    const auditData = auditCall[1] as { changes: Record<string, unknown> };

    // Only amount changed
    expect(auditData.changes).toHaveProperty("amount");
    expect(auditData.changes).not.toHaveProperty("type");
    expect(auditData.changes).not.toHaveProperty("category");
    expect(auditData.changes).not.toHaveProperty("notes");
  });

  it("creates UPDATE audit log even with no actual changes (empty changes object)", async () => {
    const id = "record-1";
    const userId = "user-1";
    const sameRecord = {
      amount: { toString: () => "100.00" },
      type: "INCOME",
      category: "salary",
      date: new Date("2026-01-01"),
      notes: "Same",
    };
    const updatedRecord = {
      id,
      ...sameRecord,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      creator: { id: userId, name: "Test", email: "test@test.com" },
    };

    const txClient = {
      record: {
        findUniqueOrThrow: vi.fn().mockResolvedValueOnce(sameRecord),
        update: vi.fn().mockResolvedValueOnce(updatedRecord),
      },
    };

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(txClient));
    mockAuditCreate.mockResolvedValueOnce(undefined);

    await updateRecordById(id, {} as never, userId);

    expect(mockAuditCreate).toHaveBeenCalledOnce();
    const auditCall = mockAuditCreate.mock.calls[0] as unknown[];
    const auditData = auditCall[1] as { changes: Record<string, unknown> };
    expect(auditData.changes).toEqual({});
  });
});

describe("deleteRecordById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches record, deletes it, and creates DELETE audit log with full snapshot atomically", async () => {
    const id = "record-1";
    const userId = "user-1";
    const existingRecord = {
      amount: { toString: () => "300.00" },
      type: "EXPENSE",
      category: "utilities",
      date: new Date("2026-03-01"),
      notes: "Electric bill",
    };

    const txClient = {
      record: {
        findUniqueOrThrow: vi.fn().mockResolvedValueOnce(existingRecord),
        delete: vi.fn().mockResolvedValueOnce(undefined),
      },
    };

    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(txClient));
    mockAuditCreate.mockResolvedValueOnce(undefined);

    await deleteRecordById(id, userId);

    expect(mockTransaction).toHaveBeenCalledOnce();
    expect(txClient.record.findUniqueOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id } }),
    );
    expect(txClient.record.delete).toHaveBeenCalledWith({ where: { id } });
    expect(mockAuditCreate).toHaveBeenCalledWith(
      txClient,
      expect.objectContaining({
        action: "DELETE",
        entity: "Record",
        entityId: id,
        changes: {
          amount: "300.00",
          type: "EXPENSE",
          category: "utilities",
          date: existingRecord.date.toISOString(),
          notes: "Electric bill",
        },
        user: { connect: { id: userId } },
      }),
    );
  });
});
