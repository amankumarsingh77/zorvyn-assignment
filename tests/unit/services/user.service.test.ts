import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcrypt";

const {
  mockFindUsers,
  mockCountUsers,
  mockFindUserById,
  mockFindUserByEmail,
  mockCreateUserWithRole,
  mockUpdateUserById,
  mockDeleteUserById,
  mockCountUserRecords,
} = vi.hoisted(() => ({
  mockFindUsers: vi.fn(),
  mockCountUsers: vi.fn(),
  mockFindUserById: vi.fn(),
  mockFindUserByEmail: vi.fn(),
  mockCreateUserWithRole: vi.fn(),
  mockUpdateUserById: vi.fn(),
  mockDeleteUserById: vi.fn(),
  mockCountUserRecords: vi.fn(),
}));

vi.mock("@/repositories/user.repository.js", () => ({
  findUsers: mockFindUsers,
  countUsers: mockCountUsers,
  findUserById: mockFindUserById,
  findUserByEmail: mockFindUserByEmail,
  createUserWithRole: mockCreateUserWithRole,
  updateUserById: mockUpdateUserById,
  deleteUserById: mockDeleteUserById,
  countUserRecords: mockCountUserRecords,
}));

import {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from "@/services/user.service.js";

const sampleUser = {
  id: "user-1",
  email: "test@example.com",
  name: "Test User",
  role: "VIEWER",
  status: "ACTIVE",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

describe("listUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns users with pagination metadata", async () => {
    mockFindUsers.mockResolvedValueOnce([sampleUser]);
    mockCountUsers.mockResolvedValueOnce(1);

    const result = await listUsers({ page: 1, limit: 10 });

    expect(result).toEqual({
      users: [sampleUser],
      total: 1,
      page: 1,
      limit: 10,
    });
    expect(mockFindUsers).toHaveBeenCalledWith(0, 10);
    expect(mockCountUsers).toHaveBeenCalledOnce();
  });
});

describe("getUserById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns user when found", async () => {
    mockFindUserById.mockResolvedValueOnce(sampleUser);

    const result = await getUserById("user-1");

    expect(result).toEqual(sampleUser);
    expect(mockFindUserById).toHaveBeenCalledWith("user-1");
  });

  it("throws NOT_FOUND when not found", async () => {
    mockFindUserById.mockResolvedValueOnce(null);

    await expect(getUserById("nonexistent"))
      .rejects
      .toMatchObject({ code: "NOT_FOUND", statusCode: 404 });
  });
});

describe("createUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hashes password with bcrypt and creates user with role", async () => {
    mockFindUserByEmail.mockResolvedValueOnce(null);
    mockCreateUserWithRole.mockResolvedValueOnce(sampleUser);

    const input = {
      email: "test@example.com",
      password: "plaintext123",
      name: "Test User",
      role: "VIEWER" as const,
    };
    const result = await createUser(input);

    expect(result).toEqual(sampleUser);
    expect(mockCreateUserWithRole).toHaveBeenCalledOnce();

    const createArg = mockCreateUserWithRole.mock.calls[0][0] as {
      email: string;
      password: string;
      name: string;
      role: string;
    };
    expect(createArg.email).toBe(input.email);
    expect(createArg.name).toBe(input.name);
    expect(createArg.role).toBe(input.role);
    expect(createArg.password).not.toBe(input.password);

    const isHashed = await bcrypt.compare(input.password, createArg.password);
    expect(isHashed).toBe(true);
  });

  it("throws CONFLICT for duplicate email", async () => {
    mockFindUserByEmail.mockResolvedValueOnce(sampleUser);

    await expect(
      createUser({
        email: "test@example.com",
        password: "password123",
        name: "Another User",
        role: "VIEWER" as const,
      }),
    )
      .rejects
      .toMatchObject({ code: "CONFLICT", statusCode: 409 });
  });
});

describe("updateUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates user when found", async () => {
    const updatedUser = { ...sampleUser, name: "Updated Name" };
    mockFindUserById.mockResolvedValueOnce(sampleUser);
    mockUpdateUserById.mockResolvedValueOnce(updatedUser);

    const result = await updateUser("user-1", { name: "Updated Name" });

    expect(result).toEqual(updatedUser);
    expect(mockUpdateUserById).toHaveBeenCalledWith("user-1", { name: "Updated Name" });
  });

  it("throws NOT_FOUND when not found", async () => {
    mockFindUserById.mockResolvedValueOnce(null);

    await expect(updateUser("nonexistent", { name: "New Name" }))
      .rejects
      .toMatchObject({ code: "NOT_FOUND", statusCode: 404 });
  });
});

describe("deleteUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes user when no records exist", async () => {
    mockFindUserById.mockResolvedValueOnce(sampleUser);
    mockCountUserRecords.mockResolvedValueOnce(0);
    mockDeleteUserById.mockResolvedValueOnce(undefined);

    await deleteUser("user-1");

    expect(mockDeleteUserById).toHaveBeenCalledWith("user-1");
  });

  it("throws CONFLICT when user has records, includes count in message", async () => {
    mockFindUserById.mockResolvedValueOnce(sampleUser);
    mockCountUserRecords.mockResolvedValueOnce(5);

    await expect(deleteUser("user-1"))
      .rejects
      .toMatchObject({
        code: "CONFLICT",
        statusCode: 409,
        message: "Cannot delete user with 5 financial record(s). Set status to INACTIVE instead.",
      });
  });

  it("throws NOT_FOUND when user not found", async () => {
    mockFindUserById.mockResolvedValueOnce(null);

    await expect(deleteUser("nonexistent"))
      .rejects
      .toMatchObject({ code: "NOT_FOUND", statusCode: 404 });
  });
});
