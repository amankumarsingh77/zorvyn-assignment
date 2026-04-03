import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockAggregateAmountByType,
  mockGroupByCategoryAndType,
  mockFindRecentWithCreator,
  mockQueryMonthlyTrends,
} = vi.hoisted(() => ({
  mockAggregateAmountByType: vi.fn(),
  mockGroupByCategoryAndType: vi.fn(),
  mockFindRecentWithCreator: vi.fn(),
  mockQueryMonthlyTrends: vi.fn(),
}));

vi.mock("@/repositories/dashboard.repository.js", () => ({
  aggregateAmountByType: mockAggregateAmountByType,
  groupByCategoryAndType: mockGroupByCategoryAndType,
  findRecentWithCreator: mockFindRecentWithCreator,
  queryMonthlyTrends: mockQueryMonthlyTrends,
}));

import {
  getSummary,
  getCategorySummary,
  getRecentActivity,
  getMonthlyTrends,
} from "@/services/dashboard.service.js";

function mockDecimal(value: number) {
  return { toNumber: () => value };
}

describe("getSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns income, expenses, and netBalance from aggregated data", async () => {
    mockAggregateAmountByType.mockResolvedValueOnce(mockDecimal(5000));
    mockAggregateAmountByType.mockResolvedValueOnce(mockDecimal(3000));

    const result = await getSummary({});

    expect(result).toEqual({
      totalIncome: 5000,
      totalExpenses: 3000,
      netBalance: 2000,
    });
  });

  it("returns all zeroes when no records exist (null sums)", async () => {
    mockAggregateAmountByType.mockResolvedValueOnce(null);
    mockAggregateAmountByType.mockResolvedValueOnce(null);

    const result = await getSummary({});

    expect(result).toEqual({
      totalIncome: 0,
      totalExpenses: 0,
      netBalance: 0,
    });
  });

  it("passes date filter to repository when startDate/endDate provided", async () => {
    mockAggregateAmountByType.mockResolvedValue(mockDecimal(0));

    await getSummary({
      startDate: "2024-01-01T00:00:00.000Z",
      endDate: "2024-12-31T23:59:59.000Z",
    });

    const expectedFilter = {
      startDate: new Date("2024-01-01T00:00:00.000Z"),
      endDate: new Date("2024-12-31T23:59:59.000Z"),
    };

    expect(mockAggregateAmountByType).toHaveBeenCalledWith("INCOME", expectedFilter);
    expect(mockAggregateAmountByType).toHaveBeenCalledWith("EXPENSE", expectedFilter);
  });
});

describe("getCategorySummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns category breakdown with totals", async () => {
    mockGroupByCategoryAndType.mockResolvedValueOnce([
      { category: "salary", type: "INCOME", _sum: { amount: mockDecimal(5000) } },
      { category: "rent", type: "EXPENSE", _sum: { amount: mockDecimal(1500) } },
    ]);

    const result = await getCategorySummary({});

    expect(result).toEqual([
      { category: "salary", type: "INCOME", total: 5000 },
      { category: "rent", type: "EXPENSE", total: 1500 },
    ]);
  });

  it("returns empty array when no records exist", async () => {
    mockGroupByCategoryAndType.mockResolvedValueOnce([]);

    const result = await getCategorySummary({});

    expect(result).toEqual([]);
  });
});

describe("getRecentActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns recent records with creator info", async () => {
    const mockRecords = [
      {
        id: "1",
        amount: mockDecimal(500),
        type: "INCOME",
        category: "salary",
        date: new Date("2024-06-01"),
        notes: null,
        createdAt: new Date("2024-06-01"),
        creator: { id: "user-1", name: "Alice" },
      },
    ];
    mockFindRecentWithCreator.mockResolvedValueOnce(mockRecords);

    const result = await getRecentActivity();

    expect(result).toEqual(mockRecords);
  });

  it("calls repository with limit of 10", async () => {
    mockFindRecentWithCreator.mockResolvedValueOnce([]);

    await getRecentActivity();

    expect(mockFindRecentWithCreator).toHaveBeenCalledWith(10);
  });
});

describe("getMonthlyTrends", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("transforms raw SQL rows into month/income/expense format", async () => {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    mockQueryMonthlyTrends.mockResolvedValueOnce([
      { month: currentMonth, type: "INCOME", total: mockDecimal(4000) },
      { month: currentMonth, type: "EXPENSE", total: mockDecimal(2000) },
    ]);

    const result = await getMonthlyTrends();

    const expectedKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`;
    const currentEntry = result.find((r) => r.month === expectedKey);

    expect(currentEntry).toEqual({
      month: expectedKey,
      income: 4000,
      expense: 2000,
    });
  });

  it("fills months with no data as 0", async () => {
    mockQueryMonthlyTrends.mockResolvedValueOnce([]);

    const result = await getMonthlyTrends();

    for (const entry of result) {
      expect(entry.income).toBe(0);
      expect(entry.expense).toBe(0);
    }
  });

  it("returns 12 months ordered ascending", async () => {
    mockQueryMonthlyTrends.mockResolvedValueOnce([]);

    const result = await getMonthlyTrends();

    // Should have at least 12 months (12 or 13 depending on day of month)
    expect(result.length).toBeGreaterThanOrEqual(12);
    expect(result.length).toBeLessThanOrEqual(13);

    // Verify ascending order
    for (let i = 1; i < result.length; i++) {
      expect(result[i].month > result[i - 1].month).toBe(true);
    }
  });
});
