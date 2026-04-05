import bcrypt from "bcrypt";
import { app } from "../../src/app.js";
import { connectDatabase, prisma } from "../../src/config/db.js";

const TEST_PREFIX = `test-usr-${Date.now()}`;
const adminEmail = `${TEST_PREFIX}-admin@example.com`;
const viewerEmail = `${TEST_PREFIX}-viewer@example.com`;
const analystEmail = `${TEST_PREFIX}-analyst@example.com`;
const duplicateEmail = `${TEST_PREFIX}-dup@example.com`;
const deletableEmail = `${TEST_PREFIX}-deletable@example.com`;
const hasRecordsEmail = `${TEST_PREFIX}-hasrecords@example.com`;

let adminToken: string;
let viewerToken: string;
let analystToken: string;
let deletableUserId: string;
let hasRecordsUserId: string;

const createdUserEmails: string[] = [];
const createdRecordIds: string[] = [];

async function getAuthToken(email: string, password: string): Promise<string> {
  const res = await app.request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  return body.data.token as string;
}

beforeAll(async () => {
  await connectDatabase();

  const hashedPassword = await bcrypt.hash("password123", 10);

  // Create admin user
  await prisma.user.create({
    data: {
      email: adminEmail,
      password: hashedPassword,
      name: "Test Admin",
      role: "ADMIN",
    },
  });
  createdUserEmails.push(adminEmail);

  // Create viewer user
  await prisma.user.create({
    data: {
      email: viewerEmail,
      password: hashedPassword,
      name: "Test Viewer",
      role: "VIEWER",
    },
  });
  createdUserEmails.push(viewerEmail);

  // Create analyst user
  await prisma.user.create({
    data: {
      email: analystEmail,
      password: hashedPassword,
      name: "Test Analyst",
      role: "ANALYST",
    },
  });
  createdUserEmails.push(analystEmail);

  // Create a user that can be deleted (no records)
  const deletableUser = await prisma.user.create({
    data: {
      email: deletableEmail,
      password: hashedPassword,
      name: "Deletable User",
      role: "VIEWER",
    },
  });
  deletableUserId = deletableUser.id;
  createdUserEmails.push(deletableEmail);

  // Create a user with records (cannot be deleted)
  const hasRecordsUser = await prisma.user.create({
    data: {
      email: hasRecordsEmail,
      password: hashedPassword,
      name: "Has Records User",
      role: "VIEWER",
    },
  });
  hasRecordsUserId = hasRecordsUser.id;
  createdUserEmails.push(hasRecordsEmail);

  // Create a record for the hasRecordsUser
  const record = await prisma.record.create({
    data: {
      amount: 100,
      type: "INCOME",
      category: "salary",
      date: new Date("2025-06-15"),
      createdBy: hasRecordsUserId,
    },
  });
  createdRecordIds.push(record.id);

  adminToken = await getAuthToken(adminEmail, "password123");
  viewerToken = await getAuthToken(viewerEmail, "password123");
  analystToken = await getAuthToken(analystEmail, "password123");
});

afterAll(async () => {
  if (createdRecordIds.length > 0) {
    await prisma.auditLog.deleteMany({
      where: { entityId: { in: createdRecordIds } },
    });
    await prisma.record.deleteMany({
      where: { id: { in: createdRecordIds } },
    });
  }
  await prisma.auditLog.deleteMany({
    where: { user: { email: { in: createdUserEmails } } },
  });
  await prisma.user.deleteMany({
    where: { email: { in: createdUserEmails } },
  });
  await prisma.$disconnect();
});

describe("POST /users", () => {
  it("ADMIN creates user with ANALYST role, gets 201 with user data (no password)", async () => {
    const newEmail = `${TEST_PREFIX}-created-analyst@example.com`;
    createdUserEmails.push(newEmail);

    const res = await app.request("/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        email: newEmail,
        password: "password123",
        name: "Created Analyst",
        role: "ANALYST",
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("id");
    expect(body.data.email).toBe(newEmail);
    expect(body.data.role).toBe("ANALYST");
    expect(body.data).not.toHaveProperty("password");
  });

  it("returns 409 CONFLICT for duplicate email", async () => {
    // First, create a user
    const dupCreateEmail = duplicateEmail;
    createdUserEmails.push(dupCreateEmail);

    await app.request("/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        email: dupCreateEmail,
        password: "password123",
        name: "Duplicate User",
        role: "VIEWER",
      }),
    });

    // Try to create with same email
    const res = await app.request("/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        email: dupCreateEmail,
        password: "password123",
        name: "Duplicate User 2",
        role: "VIEWER",
      }),
    });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("CONFLICT");
  });
});

describe("GET /users", () => {
  it("ADMIN lists users, gets 200 with data array and pagination meta", async () => {
    const res = await app.request("/users", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.meta).toBeDefined();
    expect(body.meta).toHaveProperty("page");
    expect(body.meta).toHaveProperty("limit");
    expect(body.meta).toHaveProperty("total");
  });
});

describe("GET /users/:id", () => {
  it("ADMIN gets user by ID, gets 200", async () => {
    const res = await app.request(`/users/${deletableUserId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(deletableUserId);
    expect(body.data).not.toHaveProperty("password");
  });

  it("returns 404 for non-existent ID", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await app.request(`/users/${fakeId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("NOT_FOUND");
  });
});

describe("PATCH /users/:id", () => {
  it("ADMIN updates user role and status, gets 200 with updated fields", async () => {
    const res = await app.request(`/users/${hasRecordsUserId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ role: "ANALYST", status: "INACTIVE" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.role).toBe("ANALYST");
    expect(body.data.status).toBe("INACTIVE");
  });
});

describe("DELETE /users/:id", () => {
  it("ADMIN deletes user without records, gets 200", async () => {
    const res = await app.request(`/users/${deletableUserId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Remove from cleanup list since already deleted
    const idx = createdUserEmails.indexOf(deletableEmail);
    if (idx !== -1) createdUserEmails.splice(idx, 1);
  });

  it("returns 409 CONFLICT for user with records", async () => {
    const res = await app.request(`/users/${hasRecordsUserId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("CONFLICT");
  });
});

describe("Access control", () => {
  it("VIEWER accessing GET /users returns 403", async () => {
    const res = await app.request("/users", {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("ANALYST accessing GET /users returns 403", async () => {
    const res = await app.request("/users", {
      headers: { Authorization: `Bearer ${analystToken}` },
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("Unauthenticated GET /users returns 401", async () => {
    const res = await app.request("/users");

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
