import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock external dependencies that db.ts imports
vi.mock("@prisma/adapter-pg", () => ({
  PrismaPg: vi.fn(),
}));

vi.mock("@generated/prisma/client.js", () => {
  return {
    PrismaClient: class MockPrismaClient {
      $queryRawUnsafe = vi.fn();
    },
  };
});

vi.mock("@/config/env.js", () => ({
  env: { DATABASE_URL: "postgres://test:test@localhost:5432/test" },
}));

import { prisma, connectDatabase } from "@/config/db.js";

const mockedQueryRawUnsafe = prisma.$queryRawUnsafe as ReturnType<typeof vi.fn>;

describe("connectDatabase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // REQ-1, REQ-2: On startup, pings PostgreSQL; if succeeds, connection proceeds normally
  it("completes without throwing when the database ping succeeds", async () => {
    mockedQueryRawUnsafe.mockResolvedValueOnce([{ "?column?": 1 }]);

    await expect(connectDatabase()).resolves.toBeUndefined();
    expect(mockedQueryRawUnsafe).toHaveBeenCalledWith("SELECT 1");
  });

  // REQ-3: If the ping fails, an error is thrown with a clear message
  it("throws a descriptive error when the database ping fails", async () => {
    mockedQueryRawUnsafe.mockRejectedValueOnce(new Error("Connection refused"));

    await expect(connectDatabase()).rejects.toThrow(
      "Failed to connect to database: Connection refused"
    );
  });

  // EDGE: non-Error rejection still produces a clear message
  it("throws a descriptive error when the rejection is not an Error instance", async () => {
    mockedQueryRawUnsafe.mockRejectedValueOnce("unexpected string error");

    await expect(connectDatabase()).rejects.toThrow(
      "Failed to connect to database"
    );
  });
});
