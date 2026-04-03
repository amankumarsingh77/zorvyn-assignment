import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@generated/prisma/client.js";
import { env } from "@/config/env.js";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.info("Database connection established");
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to connect to database: ${message}`);
  }
}
