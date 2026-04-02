import { prisma } from "../config/db.js";
import type { Prisma } from "../../generated/prisma/client.js";

export async function findUserByEmail(email: string): Promise<Prisma.UserGetPayload<object> | null> {
  return prisma.user.findUnique({ where: { email } });
}

export async function createUser(data: Prisma.UserCreateInput): Promise<Prisma.UserGetPayload<object>> {
  return prisma.user.create({ data });
}
