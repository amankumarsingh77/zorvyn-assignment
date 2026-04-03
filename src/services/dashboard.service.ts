import {
  aggregateAmountByType,
  groupByCategoryAndType,
  findRecentWithCreator,
  queryMonthlyTrends,
} from "@/repositories/dashboard.repository.js";
import type { DashboardQuery } from "@/validations/dashboard.schema.js";

interface DateFilter {
  readonly startDate?: Date;
  readonly endDate?: Date;
}

interface SummaryResult {
  readonly totalIncome: number;
  readonly totalExpenses: number;
  readonly netBalance: number;
}

interface CategorySummaryItem {
  readonly category: string;
  readonly type: string;
  readonly total: number;
}

interface MonthlyTrendItem {
  readonly month: string;
  readonly income: number;
  readonly expense: number;
}

function buildDateFilter(query: DashboardQuery): DateFilter | undefined {
  if (!query.startDate && !query.endDate) return undefined;

  const filter: { startDate?: Date; endDate?: Date } = {};
  if (query.startDate) filter.startDate = new Date(query.startDate);
  if (query.endDate) filter.endDate = new Date(query.endDate);
  return filter;
}

function formatMonth(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export async function getSummary(query: DashboardQuery): Promise<SummaryResult> {
  const dateFilter = buildDateFilter(query);

  const [incomeResult, expenseResult] = await Promise.all([
    aggregateAmountByType("INCOME", dateFilter),
    aggregateAmountByType("EXPENSE", dateFilter),
  ]);

  const totalIncome = incomeResult?.toNumber() ?? 0;
  const totalExpenses = expenseResult?.toNumber() ?? 0;

  return {
    totalIncome,
    totalExpenses,
    netBalance: totalIncome - totalExpenses,
  };
}

export async function getCategorySummary(query: DashboardQuery): Promise<readonly CategorySummaryItem[]> {
  const dateFilter = buildDateFilter(query);
  const results = await groupByCategoryAndType(dateFilter);

  return results.map((r) => ({
    category: r.category,
    type: r.type,
    total: r._sum.amount?.toNumber() ?? 0,
  }));
}

export async function getRecentActivity(): Promise<Awaited<ReturnType<typeof findRecentWithCreator>>> {
  return findRecentWithCreator(10);
}

export async function getMonthlyTrends(): Promise<readonly MonthlyTrendItem[]> {
  const sinceDate = new Date();
  sinceDate.setMonth(sinceDate.getMonth() - 12);
  sinceDate.setDate(1);
  sinceDate.setHours(0, 0, 0, 0);

  const rows = await queryMonthlyTrends(sinceDate);

  const dataMap = new Map<string, { income: number; expense: number }>();
  for (const row of rows) {
    const key = formatMonth(new Date(row.month));
    const entry = dataMap.get(key) ?? { income: 0, expense: 0 };

    if (row.type === "INCOME") {
      entry.income = Number(row.total);
    } else {
      entry.expense = Number(row.total);
    }

    dataMap.set(key, entry);
  }

  const result: MonthlyTrendItem[] = [];
  const cursor = new Date(sinceDate);

  while (cursor <= new Date()) {
    const key = formatMonth(cursor);
    const entry = dataMap.get(key) ?? { income: 0, expense: 0 };
    result.push({ month: key, income: entry.income, expense: entry.expense });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return result;
}
