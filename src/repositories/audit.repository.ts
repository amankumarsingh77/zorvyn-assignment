import { prisma } from "@/config/db.js";
import type { Prisma } from "@generated/prisma/client.js";

const auditLogSelectWithUser = {
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
} as const;

export async function createAuditLog(data: Prisma.AuditLogCreateInput): Promise<void> {
  await prisma.auditLog.create({ data });
}

export async function createAuditLogTx(
  tx: Prisma.TransactionClient,
  data: Prisma.AuditLogCreateInput,
): Promise<void> {
  await tx.auditLog.create({ data });
}

export async function findAuditLogs(
  where: Prisma.AuditLogWhereInput,
  skip: number,
  take: number,
) {
  return prisma.auditLog.findMany({
    where,
    skip,
    take,
    orderBy: { createdAt: "desc" },
    select: auditLogSelectWithUser,
  });
}

export async function countAuditLogs(where: Prisma.AuditLogWhereInput): Promise<number> {
  return prisma.auditLog.count({ where });
}
