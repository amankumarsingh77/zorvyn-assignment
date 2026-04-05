import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@generated/prisma/client.js";

const {
  mockFindRecords,
  mockCountRecords,
  mockFindRecordById,
  mockCreateRecord,
  mockUpdateRecordById,
  mockDeleteRecordById,
} = vi.hoisted(() => ({
  mockFindRecords: vi.fn(),
  mockCountRecords: vi.fn(),
  mockFindRecordById: vi.fn(),
  mockCreateRecord: vi.fn(),
  mockUpdateRecordById: vi.fn(),
  mockDeleteRecordById: vi.fn(),
}));

vi.mock("@/repositories/record.repository.js", () => ({
  findRecords: mockFindRecords,
  countRecords: mockCountRecords,
  findRecordById: mockFindRecordById,
  createRecord: mockCreateRecord,
  updateRecordById: mockUpdateRecordById,
  deleteRecordById: mockDeleteRecordById,
}));

import {
  listRecords,
  getRecordById,
  createRecord,
  updateRecord,
  deleteRecord,
} from "@/services/record.service.js";

const sampleRecord = {
  id: "rec-1",
  amount: new Prisma.Decimal("1500.00"),
  type: "INCOME",
  category: "salary",
  date: new Date("2024-06-01"),
  notes: "June salary",
  createdBy: "user-1",
  createdAt: new Date("2024-06-01"),
  updatedAt: new Date("2024-06-01"),
  creator: { id: "user-1", name: "Test User", email: "test@example.com" },
};

describe("listRecords", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns records with pagination metadata", async () => {
    mockFindRecords.mockResolvedValueOnce([sampleRecord]);
    mockCountRecords.mockResolvedValueOnce(1);

    const result = await listRecords({ page: 1, limit: 10 });

    expect(result).toEqual({
      records: [sampleRecord],
      total: 1,
      page: 1,
      limit: 10,
    });
    expect(mockFindRecords).toHaveBeenCalledWith({}, 0, 10);
    expect(mockCountRecords).toHaveBeenCalledWith({});
  });

  it("builds where clause from type filter", async () => {
    mockFindRecords.mockResolvedValueOnce([]);
    mockCountRecords.mockResolvedValueOnce(0);

    await listRecords({ page: 1, limit: 10, type: "INCOME" });

    expect(mockFindRecords).toHaveBeenCalledWith({ type: "INCOME" }, 0, 10);
    expect(mockCountRecords).toHaveBeenCalledWith({ type: "INCOME" });
  });

  it("builds where clause from category filter", async () => {
    mockFindRecords.mockResolvedValueOnce([]);
    mockCountRecords.mockResolvedValueOnce(0);

    await listRecords({ page: 1, limit: 10, category: "salary" });

    expect(mockFindRecords).toHaveBeenCalledWith({ category: "salary" }, 0, 10);
  });

  it("builds where clause from date range", async () => {
    mockFindRecords.mockResolvedValueOnce([]);
    mockCountRecords.mockResolvedValueOnce(0);

    await listRecords({ page: 1, limit: 10, startDate: "2024-01-01", endDate: "2024-12-31" });

    const expectedWhere = {
      date: {
        gte: new Date("2024-01-01"),
        lte: new Date("2024-12-31"),
      },
    };
    expect(mockFindRecords).toHaveBeenCalledWith(expectedWhere, 0, 10);
    expect(mockCountRecords).toHaveBeenCalledWith(expectedWhere);
  });

  it("combines multiple filters", async () => {
    mockFindRecords.mockResolvedValueOnce([]);
    mockCountRecords.mockResolvedValueOnce(0);

    await listRecords({
      page: 2,
      limit: 5,
      type: "EXPENSE",
      category: "rent",
      startDate: "2024-01-01",
    });

    const expectedWhere = {
      type: "EXPENSE",
      category: "rent",
      date: { gte: new Date("2024-01-01") },
    };
    expect(mockFindRecords).toHaveBeenCalledWith(expectedWhere, 5, 5);
    expect(mockCountRecords).toHaveBeenCalledWith(expectedWhere);
  });
});

describe("getRecordById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns record when found", async () => {
    mockFindRecordById.mockResolvedValueOnce(sampleRecord);

    const result = await getRecordById("rec-1");

    expect(result).toEqual(sampleRecord);
    expect(mockFindRecordById).toHaveBeenCalledWith("rec-1");
  });

  it("throws NOT_FOUND when not found", async () => {
    mockFindRecordById.mockResolvedValueOnce(null);

    await expect(getRecordById("nonexistent"))
      .rejects
      .toMatchObject({ code: "NOT_FOUND", statusCode: 404 });
  });
});

describe("createRecord", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("converts amount to Prisma.Decimal and creates record with connected user", async () => {
    mockCreateRecord.mockResolvedValueOnce(sampleRecord);

    const input = {
      amount: 1500,
      type: "INCOME" as const,
      category: "salary",
      date: "2024-06-01",
    };
    const result = await createRecord(input, "user-1");

    expect(result).toEqual(sampleRecord);
    expect(mockCreateRecord).toHaveBeenCalledWith({
      amount: new Prisma.Decimal(1500),
      type: "INCOME",
      category: "salary",
      date: new Date("2024-06-01"),
      notes: undefined,
      creator: { connect: { id: "user-1" } },
    });
  });

  it("passes all fields including optional notes", async () => {
    mockCreateRecord.mockResolvedValueOnce(sampleRecord);

    const input = {
      amount: 500,
      type: "EXPENSE" as const,
      category: "food",
      date: "2024-07-15",
      notes: "Lunch with team",
    };
    await createRecord(input, "user-2");

    expect(mockCreateRecord).toHaveBeenCalledWith({
      amount: new Prisma.Decimal(500),
      type: "EXPENSE",
      category: "food",
      date: new Date("2024-07-15"),
      notes: "Lunch with team",
      creator: { connect: { id: "user-2" } },
    });
  });
});

describe("updateRecord", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates only provided fields (partial update)", async () => {
    const updatedRecord = { ...sampleRecord, category: "bonus" };
    mockFindRecordById.mockResolvedValueOnce(sampleRecord);
    mockUpdateRecordById.mockResolvedValueOnce(updatedRecord);

    const result = await updateRecord("rec-1", { category: "bonus" });

    expect(result).toEqual(updatedRecord);
    expect(mockUpdateRecordById).toHaveBeenCalledWith("rec-1", { category: "bonus" });
  });

  it("throws NOT_FOUND when record does not exist", async () => {
    mockFindRecordById.mockResolvedValueOnce(null);

    await expect(updateRecord("nonexistent", { category: "bonus" }))
      .rejects
      .toMatchObject({ code: "NOT_FOUND", statusCode: 404 });
  });
});

describe("deleteRecord", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes record when found", async () => {
    mockFindRecordById.mockResolvedValueOnce(sampleRecord);
    mockDeleteRecordById.mockResolvedValueOnce(undefined);

    await deleteRecord("rec-1");

    expect(mockDeleteRecordById).toHaveBeenCalledWith("rec-1");
  });

  it("throws NOT_FOUND when not found", async () => {
    mockFindRecordById.mockResolvedValueOnce(null);

    await expect(deleteRecord("nonexistent"))
      .rejects
      .toMatchObject({ code: "NOT_FOUND", statusCode: 404 });
  });
});
