import bcrypt from "bcrypt";
import { AppError } from "@/middleware/errorHandler.js";
import { HTTP_NOT_FOUND, HTTP_CONFLICT } from "@/constants/http.js";
import {
  findUsers,
  countUsers,
  findUserById,
  findUserByEmail,
  createUserWithRole,
  updateUserById,
  deleteUserById,
  countUserRecords,
} from "@/repositories/user.repository.js";
import type { CreateUserInput, UpdateUserInput, ListUsersQuery } from "@/validations/user.schema.js";

const SALT_ROUNDS = 10;

type UserWithoutPassword = NonNullable<Awaited<ReturnType<typeof findUserById>>>;

interface ListUsersResult {
  readonly users: UserWithoutPassword[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
}

export async function listUsers(query: ListUsersQuery): Promise<ListUsersResult> {
  const skip = (query.page - 1) * query.limit;
  const [users, total] = await Promise.all([findUsers(skip, query.limit), countUsers()]);
  return { users, total, page: query.page, limit: query.limit };
}

export async function getUserById(id: string): Promise<UserWithoutPassword> {
  const user = await findUserById(id);
  if (!user) {
    throw new AppError(HTTP_NOT_FOUND, "NOT_FOUND", "User not found");
  }
  return user;
}

export async function createUser(input: CreateUserInput): Promise<UserWithoutPassword> {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new AppError(HTTP_CONFLICT, "CONFLICT", "Email already registered");
  }
  const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);
  return createUserWithRole({
    email: input.email,
    password: hashedPassword,
    name: input.name,
    role: input.role,
  });
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<UserWithoutPassword> {
  const user = await findUserById(id);
  if (!user) {
    throw new AppError(HTTP_NOT_FOUND, "NOT_FOUND", "User not found");
  }
  return updateUserById(id, input);
}

export async function deleteUser(id: string): Promise<void> {
  const user = await findUserById(id);
  if (!user) {
    throw new AppError(HTTP_NOT_FOUND, "NOT_FOUND", "User not found");
  }
  const count = await countUserRecords(id);
  if (count > 0) {
    throw new AppError(HTTP_CONFLICT, "CONFLICT", `Cannot delete user with ${count} financial record(s). Set status to INACTIVE instead.`);
  }
  await deleteUserById(id);
}
