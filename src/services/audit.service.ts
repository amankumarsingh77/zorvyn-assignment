import type { Prisma } from "@generated/prisma/client.js";
import { findAuditLogs, countAuditLogs } from "@/repositories/audit.repository.js";
import type { ListAuditLogsQuery } from "@/validations/audit.schema.js";

type AuditLogWithUser = Awaited<ReturnType<typeof findAuditLogs>>[number];

interface ListAuditLogsResult {
  readonly auditLogs: AuditLogWithUser[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
}

export async function listAuditLogs(query: ListAuditLogsQuery): Promise<ListAuditLogsResult> {
  const where: Prisma.AuditLogWhereInput = {};

  if (query.entityId) {
    where.entityId = query.entityId;
  }
  if (query.userId) {
    where.userId = query.userId;
  }
  if (query.action) {
    where.action = query.action;
  }
  if (query.startDate || query.endDate) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (query.startDate) dateFilter.gte = new Date(query.startDate);
    if (query.endDate) dateFilter.lte = new Date(query.endDate);
    where.createdAt = dateFilter;
  }

  const skip = (query.page - 1) * query.limit;
  const [auditLogs, total] = await Promise.all([
    findAuditLogs(where, skip, query.limit),
    countAuditLogs(where),
  ]);

  return { auditLogs, total, page: query.page, limit: query.limit };
}
