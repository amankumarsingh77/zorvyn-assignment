import { prisma } from "../config/db.js";
import type { Prisma } from "../../generated/prisma/client.js";

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

export async function createRecord(data: Prisma.RecordCreateInput): Promise<RecordWithCreator> {
  return prisma.record.create({
    data,
    select: recordSelectWithCreator,
  });
}

export async function updateRecordById(id: string, data: Prisma.RecordUpdateInput): Promise<RecordWithCreator> {
  return prisma.record.update({
    where: { id },
    data,
    select: recordSelectWithCreator,
  });
}

export async function deleteRecordById(id: string): Promise<void> {
  await prisma.record.delete({ where: { id } });
}
