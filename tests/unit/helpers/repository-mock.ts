import { vi } from "vitest";

interface UserRepositoryMock {
  findUserByEmail: ReturnType<typeof vi.fn>;
  findUserByEmailWithPassword: ReturnType<typeof vi.fn>;
  createUser: ReturnType<typeof vi.fn>;
  findUsers: ReturnType<typeof vi.fn>;
  countUsers: ReturnType<typeof vi.fn>;
  findUserById: ReturnType<typeof vi.fn>;
  createUserWithRole: ReturnType<typeof vi.fn>;
  updateUserById: ReturnType<typeof vi.fn>;
  deleteUserById: ReturnType<typeof vi.fn>;
  countUserRecords: ReturnType<typeof vi.fn>;
}

interface RecordRepositoryMock {
  findRecords: ReturnType<typeof vi.fn>;
  countRecords: ReturnType<typeof vi.fn>;
  findRecordById: ReturnType<typeof vi.fn>;
  createRecord: ReturnType<typeof vi.fn>;
  updateRecordById: ReturnType<typeof vi.fn>;
  deleteRecordById: ReturnType<typeof vi.fn>;
}

interface DashboardRepositoryMock {
  aggregateAmountByType: ReturnType<typeof vi.fn>;
  groupByCategoryAndType: ReturnType<typeof vi.fn>;
  findRecentWithCreator: ReturnType<typeof vi.fn>;
  queryMonthlyTrends: ReturnType<typeof vi.fn>;
}

export function createUserRepositoryMock(): UserRepositoryMock {
  return {
    findUserByEmail: vi.fn(),
    findUserByEmailWithPassword: vi.fn(),
    createUser: vi.fn(),
    findUsers: vi.fn(),
    countUsers: vi.fn(),
    findUserById: vi.fn(),
    createUserWithRole: vi.fn(),
    updateUserById: vi.fn(),
    deleteUserById: vi.fn(),
    countUserRecords: vi.fn(),
  };
}

export function createRecordRepositoryMock(): RecordRepositoryMock {
  return {
    findRecords: vi.fn(),
    countRecords: vi.fn(),
    findRecordById: vi.fn(),
    createRecord: vi.fn(),
    updateRecordById: vi.fn(),
    deleteRecordById: vi.fn(),
  };
}

export function createDashboardRepositoryMock(): DashboardRepositoryMock {
  return {
    aggregateAmountByType: vi.fn(),
    groupByCategoryAndType: vi.fn(),
    findRecentWithCreator: vi.fn(),
    queryMonthlyTrends: vi.fn(),
  };
}
