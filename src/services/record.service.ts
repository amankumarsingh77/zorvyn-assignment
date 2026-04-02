import { Prisma } from "@generated/prisma/client.js";
import { AppError } from "@/middleware/errorHandler.js";
import { HTTP_NOT_FOUND } from "@/constants/http.js";
import {
  findRecords,
  countRecords,
  findRecordById,
  createRecord as repoCreateRecord,
  updateRecordById,
  deleteRecordById,
} from "@/repositories/record.repository.js";
import type { CreateRecordInput, UpdateRecordInput, ListRecordsQuery } from "@/validations/record.schema.js";

type RecordWithCreator = Awaited<ReturnType<typeof findRecordById>> & {};

interface ListRecordsResult {
  readonly records: RecordWithCreator[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
}

export async function listRecords(query: ListRecordsQuery): Promise<ListRecordsResult> {
  const where: Prisma.RecordWhereInput = {};

  if (query.type) {
    where.type = query.type;
  }
  if (query.category) {
    where.category = query.category;
  }
  if (query.startDate) {
    where.date = { ...where.date as object, gte: new Date(query.startDate) };
  }
  if (query.endDate) {
    where.date = { ...where.date as object, lte: new Date(query.endDate) };
  }

  const skip = (query.page - 1) * query.limit;
  const [records, total] = await Promise.all([findRecords(where, skip, query.limit), countRecords(where)]);
  return { records, total, page: query.page, limit: query.limit };
}

export async function getRecordById(id: string): Promise<RecordWithCreator> {
  const record = await findRecordById(id);
  if (!record) {
    throw new AppError(HTTP_NOT_FOUND, "NOT_FOUND", "Record not found");
  }
  return record;
}

export async function createRecord(input: CreateRecordInput, userId: string): Promise<RecordWithCreator> {
  return repoCreateRecord({
    amount: new Prisma.Decimal(input.amount),
    type: input.type,
    category: input.category,
    date: new Date(input.date),
    notes: input.notes,
    creator: { connect: { id: userId } },
  });
}

export async function updateRecord(id: string, input: UpdateRecordInput): Promise<RecordWithCreator> {
  const existing = await findRecordById(id);
  if (!existing) {
    throw new AppError(HTTP_NOT_FOUND, "NOT_FOUND", "Record not found");
  }

  const data: Prisma.RecordUpdateInput = {};

  if (input.amount !== undefined) {
    data.amount = new Prisma.Decimal(input.amount);
  }
  if (input.type !== undefined) {
    data.type = input.type;
  }
  if (input.category !== undefined) {
    data.category = input.category;
  }
  if (input.date !== undefined) {
    data.date = new Date(input.date);
  }
  if (input.notes !== undefined) {
    data.notes = input.notes;
  }

  return updateRecordById(id, data);
}

export async function deleteRecord(id: string): Promise<void> {
  const existing = await findRecordById(id);
  if (!existing) {
    throw new AppError(HTTP_NOT_FOUND, "NOT_FOUND", "Record not found");
  }
  await deleteRecordById(id);
}
