import { prisma } from "@/config/db.js";
import { Prisma } from "@generated/prisma/client.js";
import { createAuditLogTx } from "@/repositories/audit.repository.js";

const recordSelectWithCreator = {
  id: true,
  amount: true,
  type: true,
  category: true,
  date: true,
  notes: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
  creator: {
    select: { id: true, name: true, email: true },
  },
} as const;

type RecordWithCreator = Prisma.RecordGetPayload<{ select: typeof recordSelectWithCreator }>;

const AUDITABLE_FIELDS = ["amount", "type", "category", "date", "notes"] as const;

interface FieldDiff {
  readonly old: unknown;
  readonly new: unknown;
}

export function computeChanges(
  oldRecord: Record<string, unknown>,
  newRecord: Record<string, unknown>,
  fields: readonly string[],
): Record<string, FieldDiff> {
  const changes: Record<string, FieldDiff> = {};
  for (const field of fields) {
    const oldRaw = oldRecord[field];
    const oldVal = oldRaw === undefined || oldRaw === null ? "" : `${oldRaw as string | number}`;
    const newRaw = newRecord[field];
    const newVal = newRaw === undefined || newRaw === null ? "" : `${newRaw as string | number}`;
    if (oldVal !== newVal) {
      changes[field] = { old: oldRecord[field], new: newRecord[field] };
    }
  }
  return changes;
}

export async function findRecords(
  where: Prisma.RecordWhereInput,
  skip: number,
  take: number,
): Promise<RecordWithCreator[]> {
  return prisma.record.findMany({
    where,
    skip,
    take,
    orderBy: { date: "desc" },
    select: recordSelectWithCreator,
  });
}

export async function countRecords(where: Prisma.RecordWhereInput): Promise<number> {
  return prisma.record.count({ where });
}

export async function findRecordById(id: string): Promise<RecordWithCreator | null> {
  return prisma.record.findUnique({
    where: { id },
    select: recordSelectWithCreator,
  });
}

export async function createRecord(
  data: Prisma.RecordCreateInput,
  userId: string,
): Promise<RecordWithCreator> {
  return prisma.$transaction(async (tx) => {
    const record = await tx.record.create({
      data,
      select: recordSelectWithCreator,
    });
    await createAuditLogTx(tx, {
      action: "CREATE",
      entity: "Record",
      entityId: record.id,
      changes: {
        amount: record.amount.toString(),
        type: record.type,
        category: record.category,
        date: record.date.toISOString(),
        notes: record.notes,
      },
      user: { connect: { id: userId } },
    });
    return record;
  });
}

export async function updateRecordById(
  id: string,
  data: Prisma.RecordUpdateInput,
  userId: string,
): Promise<RecordWithCreator> {
  return prisma.$transaction(async (tx) => {
    const oldRecord = await tx.record.findUniqueOrThrow({
      where: { id },
      select: { amount: true, type: true, category: true, date: true, notes: true },
    });
    const updated = await tx.record.update({
      where: { id },
      data,
      select: recordSelectWithCreator,
    });
    const changes = computeChanges(
      oldRecord as unknown as Record<string, unknown>,
      updated as unknown as Record<string, unknown>,
      AUDITABLE_FIELDS,
    );
    await createAuditLogTx(tx, {
      action: "UPDATE",
      entity: "Record",
      entityId: id,
      changes: changes as unknown as Prisma.InputJsonValue,
      user: { connect: { id: userId } },
    });
    return updated;
  });
}

export async function deleteRecordById(id: string, userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const record = await tx.record.findUniqueOrThrow({
      where: { id },
      select: { amount: true, type: true, category: true, date: true, notes: true },
    });
    await tx.record.delete({ where: { id } });
    await createAuditLogTx(tx, {
      action: "DELETE",
      entity: "Record",
      entityId: id,
      changes: {
        amount: record.amount.toString(),
        type: record.type,
        category: record.category,
        date: record.date.toISOString(),
        notes: record.notes,
      },
      user: { connect: { id: userId } },
    });
  });
}
