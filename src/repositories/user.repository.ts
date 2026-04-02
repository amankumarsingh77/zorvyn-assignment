import { prisma } from "@/config/db.js";
import type { Prisma, Role } from "@generated/prisma/client.js";

const userSelectWithoutPassword = {
  id: true,
  email: true,
  name: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

type UserWithoutPassword = Prisma.UserGetPayload<{ select: typeof userSelectWithoutPassword }>;

export async function findUserByEmail(email: string): Promise<UserWithoutPassword | null> {
  return prisma.user.findUnique({
    where: { email },
    select: userSelectWithoutPassword,
  });
}

export async function findUserByEmailWithPassword(email: string): Promise<Prisma.UserGetPayload<object> | null> {
  return prisma.user.findUnique({ where: { email } });
}

export async function createUser(data: Prisma.UserCreateInput): Promise<UserWithoutPassword> {
  return prisma.user.create({
    data,
    select: userSelectWithoutPassword,
  });
}

export async function findUsers(skip: number, take: number): Promise<UserWithoutPassword[]> {
  return prisma.user.findMany({
    skip,
    take,
    orderBy: { createdAt: "desc" },
    select: userSelectWithoutPassword,
  });
}

export async function countUsers(): Promise<number> {
  return prisma.user.count();
}

export async function findUserById(id: string): Promise<UserWithoutPassword | null> {
  return prisma.user.findUnique({
    where: { id },
    select: userSelectWithoutPassword,
  });
}

export async function createUserWithRole(data: {
  email: string;
  password: string;
  name: string;
  role: Role;
}): Promise<UserWithoutPassword> {
  return prisma.user.create({
    data,
    select: userSelectWithoutPassword,
  });
}

export async function updateUserById(id: string, data: Prisma.UserUpdateInput): Promise<UserWithoutPassword> {
  return prisma.user.update({
    where: { id },
    data,
    select: userSelectWithoutPassword,
  });
}

export async function deleteUserById(id: string): Promise<void> {
  await prisma.user.delete({ where: { id } });
}

export async function countUserRecords(userId: string): Promise<number> {
  return prisma.record.count({ where: { createdBy: userId } });
}
