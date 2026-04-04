import {
  aggregateAmountByType,
  groupByCategoryAndType,
  findRecentWithCreator,
  queryMonthlyTrends,
  queryWeeklyTrends,
} from "@/repositories/dashboard.repository.js";
import type { DashboardQuery, TrendsQuery } from "@/validations/dashboard.schema.js";

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

interface WeeklyTrendItem {
  readonly week: string;
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

function formatWeek(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

export async function getWeeklyTrends(): Promise<readonly WeeklyTrendItem[]> {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - 12 * 7);
  sinceDate.setHours(0, 0, 0, 0);

  // Align to Monday (PostgreSQL date_trunc('week') uses Monday as week start)
  const dayOfWeek = sinceDate.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  sinceDate.setDate(sinceDate.getDate() - daysToMonday);

  const rows = await queryWeeklyTrends(sinceDate);

  const dataMap = new Map<string, { income: number; expense: number }>();
  for (const row of rows) {
    const key = formatWeek(new Date(row.week));
    const entry = dataMap.get(key) ?? { income: 0, expense: 0 };

    if (row.type === "INCOME") {
      entry.income = Number(row.total);
    } else {
      entry.expense = Number(row.total);
    }

    dataMap.set(key, entry);
  }

  const result: WeeklyTrendItem[] = [];
  const cursor = new Date(sinceDate);
  const now = new Date();

  while (cursor <= now) {
    const key = formatWeek(cursor);
    const entry = dataMap.get(key) ?? { income: 0, expense: 0 };
    result.push({ week: key, income: entry.income, expense: entry.expense });
    cursor.setDate(cursor.getDate() + 7);
  }

  return result;
}

export async function getTrends(query: TrendsQuery): Promise<readonly MonthlyTrendItem[] | readonly WeeklyTrendItem[]> {
  if (query.granularity === "weekly") {
    return getWeeklyTrends();
  }
  return getMonthlyTrends();
}
