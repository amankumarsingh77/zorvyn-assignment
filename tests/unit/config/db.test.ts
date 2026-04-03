import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock external dependencies that db.ts imports
vi.mock("@prisma/adapter-pg", () => ({
  PrismaPg: vi.fn(),
}));

const { queryRawFn } = vi.hoisted(() => ({ queryRawFn: vi.fn() }));

vi.mock("@generated/prisma/client.js", () => ({
  PrismaClient: class MockPrismaClient {
    $queryRaw = queryRawFn;
  },
}));

vi.mock("@/config/env.js", () => ({
  env: { DATABASE_URL: "postgres://test:test@localhost:5432/test" },
}));

import { connectDatabase } from "@/config/db.js";

describe("connectDatabase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // REQ-1, REQ-2: On startup, pings PostgreSQL; if succeeds, connection proceeds normally
  it("completes without throwing when the database ping succeeds", async () => {
    queryRawFn.mockResolvedValueOnce([{ "?column?": 1 }]);

    await expect(connectDatabase()).resolves.toBeUndefined();
    expect(queryRawFn).toHaveBeenCalled();
  });

  // REQ-3: If the ping fails, an error is thrown with a clear message
  it("throws a descriptive error when the database ping fails", async () => {
    queryRawFn.mockRejectedValueOnce(new Error("Connection refused"));

    await expect(connectDatabase()).rejects.toThrow(
      "Failed to connect to database: Connection refused"
    );
  });

  // EDGE: non-Error rejection still produces a clear message
  it("throws a descriptive error when the rejection is not an Error instance", async () => {
    queryRawFn.mockRejectedValueOnce("unexpected string error");

    await expect(connectDatabase()).rejects.toThrow(
      "Failed to connect to database"
    );
  });
});
