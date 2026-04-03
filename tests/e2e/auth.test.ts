import { app } from "../../src/app.js";
import { connectDatabase, prisma } from "../../src/config/db.js";

const TEST_PREFIX = `test-auth-${Date.now()}`;
const testEmails: string[] = [];

function testEmail(label: string): string {
  const email = `${TEST_PREFIX}-${label}@example.com`;
  testEmails.push(email);
  return email;
}

beforeAll(async () => {
  await connectDatabase();
});

afterAll(async () => {
  if (testEmails.length > 0) {
    await prisma.user.deleteMany({
      where: { email: { in: testEmails } },
    });
  }
  await prisma.$disconnect();
});

describe("POST /auth/register", () => {
  it("creates user, returns 201 with success and VIEWER role, no password in response", async () => {
    const email = testEmail("register");
    const res = await app.request("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "password123", name: "Test User" }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.role).toBe("VIEWER");
    expect(body.data.email).toBe(email);
    expect(body.data).not.toHaveProperty("password");
  });

  it("returns 409 for duplicate email", async () => {
    const email = testEmail("duplicate");
    // Register first time
    await app.request("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "password123", name: "First" }),
    });

    // Register again with same email
    const res = await app.request("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "password456", name: "Second" }),
    });

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("CONFLICT");
  });

  it("returns 400 for invalid input (missing name)", async () => {
    const res = await app.request("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "noname@example.com", password: "password123" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /auth/login", () => {
  const loginEmail = `${TEST_PREFIX}-login@example.com`;

  beforeAll(async () => {
    testEmails.push(loginEmail);
    await app.request("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: loginEmail, password: "password123", name: "Login User" }),
    });
  });

  it("returns 200 with token and user for valid credentials", async () => {
    const res = await app.request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: loginEmail, password: "password123" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(typeof body.data.token).toBe("string");
    expect(body.data.user).toBeDefined();
    expect(body.data.user.email).toBe(loginEmail);
  });

  it("returns 401 for wrong password", async () => {
    const res = await app.request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: loginEmail, password: "wrongpassword" }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 401 for non-existent email", async () => {
    const res = await app.request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nonexistent@example.com", password: "password123" }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
