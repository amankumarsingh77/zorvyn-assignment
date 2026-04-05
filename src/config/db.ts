import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@generated/prisma/client.js";
import { env } from "@/config/env.js";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 2000;

export async function connectDatabase(): Promise<void> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.info("Database connection established");
      return;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      if (attempt === MAX_RETRIES) {
        throw new Error(`Failed to connect to database: ${message}`, { cause: error });
      }
      console.warn(`Database not ready (attempt ${attempt}/${MAX_RETRIES}), retrying in ${RETRY_DELAY_MS}ms...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}
