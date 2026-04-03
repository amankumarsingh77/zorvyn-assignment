import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "@/types/index.js";

const TEST_JWT_SECRET = "test-secret-key-for-jwt-signing";

const {
  mockFindUserByEmail,
  mockFindUserByEmailWithPassword,
  mockCreateUser,
} = vi.hoisted(() => ({
  mockFindUserByEmail: vi.fn(),
  mockFindUserByEmailWithPassword: vi.fn(),
  mockCreateUser: vi.fn(),
}));

vi.mock("@/repositories/user.repository.js", () => ({
  findUserByEmail: mockFindUserByEmail,
  findUserByEmailWithPassword: mockFindUserByEmailWithPassword,
  createUser: mockCreateUser,
}));

vi.mock("@/config/env.js", () => ({
  env: {
    JWT_SECRET: "test-secret-key-for-jwt-signing",
    JWT_EXPIRY: "24h",
  },
}));

import { register, login } from "@/services/auth.service.js";

describe("register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates user with hashed password and returns user without password", async () => {
    const input = { email: "test@example.com", password: "plaintext123", name: "Test User" };
    const createdUser = {
      id: "user-1",
      email: input.email,
      name: input.name,
      role: "VIEWER",
      status: "ACTIVE",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    };

    mockFindUserByEmail.mockResolvedValueOnce(null);
    mockCreateUser.mockResolvedValueOnce(createdUser);

    const result = await register(input);

    expect(mockCreateUser).toHaveBeenCalledOnce();
    const createArg = mockCreateUser.mock.calls[0][0] as { email: string; password: string; name: string };
    expect(createArg.password).not.toBe(input.password);
    const isHashed = await bcrypt.compare(input.password, createArg.password);
    expect(isHashed).toBe(true);

    expect(result).toEqual(createdUser);
    expect(result).not.toHaveProperty("password");
  });

  it("throws CONFLICT for duplicate email", async () => {
    const existingUser = {
      id: "user-1",
      email: "existing@example.com",
      name: "Existing",
      role: "VIEWER",
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockFindUserByEmail.mockResolvedValueOnce(existingUser);

    await expect(register({ email: "existing@example.com", password: "password123", name: "New User" }))
      .rejects
      .toMatchObject({ code: "CONFLICT", statusCode: 409 });
  });
});

describe("login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns JWT token with correct payload for valid credentials", async () => {
    const password = "correct-password";
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = {
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
      password: hashedPassword,
      role: "ANALYST",
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockFindUserByEmailWithPassword.mockResolvedValueOnce(user);

    const result = await login({ email: user.email, password });

    expect(result).toHaveProperty("token");
    expect(result).toHaveProperty("user");
    expect(result.user).toEqual({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const decoded = jwt.verify(result.token, TEST_JWT_SECRET) as JwtPayload;
    expect(decoded.userId).toBe(user.id);
    expect(decoded.role).toBe(user.role);
  });

  it("throws UNAUTHORIZED for wrong password", async () => {
    const hashedPassword = await bcrypt.hash("correct-password", 10);

    const user = {
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
      password: hashedPassword,
      role: "VIEWER",
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockFindUserByEmailWithPassword.mockResolvedValueOnce(user);

    await expect(login({ email: user.email, password: "wrong-password" }))
      .rejects
      .toMatchObject({ code: "UNAUTHORIZED", message: "Invalid email or password" });
  });

  it("throws UNAUTHORIZED for non-existent email", async () => {
    mockFindUserByEmailWithPassword.mockResolvedValueOnce(null);

    await expect(login({ email: "nobody@example.com", password: "any-password" }))
      .rejects
      .toMatchObject({ code: "UNAUTHORIZED", message: "Invalid email or password" });
  });

  it("throws FORBIDDEN for inactive user", async () => {
    const hashedPassword = await bcrypt.hash("password123", 10);

    const user = {
      id: "user-1",
      email: "inactive@example.com",
      name: "Inactive User",
      password: hashedPassword,
      role: "VIEWER",
      status: "INACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockFindUserByEmailWithPassword.mockResolvedValueOnce(user);

    await expect(login({ email: user.email, password: "password123" }))
      .rejects
      .toMatchObject({ code: "FORBIDDEN" });
  });
});
