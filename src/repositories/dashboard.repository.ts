import { prisma } from "@/config/db.js";
import { Prisma, type RecordType } from "@generated/prisma/client.js";

interface DateFilter {
  readonly startDate?: Date;
  readonly endDate?: Date;
}

export interface MonthlyTrendRow {
  month: Date;
  type: string;
  total: string;
}

function buildDateWhere(dateFilter?: DateFilter): Prisma.RecordWhereInput {
  if (!dateFilter?.startDate && !dateFilter?.endDate) return {};

  const date: Prisma.RecordWhereInput["date"] = {};
  if (dateFilter.startDate) date.gte = dateFilter.startDate;
  if (dateFilter.endDate) date.lte = dateFilter.endDate;

  return { date };
}

export async function aggregateAmountByType(
  type: RecordType,
  dateFilter?: DateFilter,
): Promise<Prisma.Decimal | null> {
  const result = await prisma.record.aggregate({
    where: { type, ...buildDateWhere(dateFilter) },
    _sum: { amount: true },
  });
  return result._sum.amount;
}

export async function groupByCategoryAndType(dateFilter?: DateFilter) {
  return prisma.record.groupBy({
    by: ["category", "type"],
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
    where: buildDateWhere(dateFilter),
  });
}

export async function findRecentWithCreator(limit: number) {
  return prisma.record.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      amount: true,
      type: true,
      category: true,
      date: true,
      notes: true,
      createdAt: true,
      creator: {
        select: { id: true, name: true },
      },
    },
  });
}

export async function queryMonthlyTrends(sinceDate: Date): Promise<MonthlyTrendRow[]> {
  return prisma.$queryRaw<MonthlyTrendRow[]>`
    SELECT date_trunc('month', date) AS month, type, SUM(amount) AS total
    FROM records
    WHERE date >= ${sinceDate}
    GROUP BY date_trunc('month', date), type
    ORDER BY month ASC`;
}
