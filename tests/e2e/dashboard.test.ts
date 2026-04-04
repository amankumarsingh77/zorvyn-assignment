import bcrypt from "bcrypt";
import { app } from "../../src/app.js";
import { connectDatabase, prisma } from "../../src/config/db.js";

const TEST_PREFIX = `test-dash-${Date.now()}`;
const adminEmail = `${TEST_PREFIX}-admin@example.com`;
const analystEmail = `${TEST_PREFIX}-analyst@example.com`;
const viewerEmail = `${TEST_PREFIX}-viewer@example.com`;

let adminToken: string;
let analystToken: string;
let viewerToken: string;
let adminUserId: string;
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

  // Create admin user via prisma
  const adminUser = await prisma.user.create({
    data: {
      email: adminEmail,
      password: hashedPassword,
      name: "Dashboard Admin",
      role: "ADMIN",
    },
  });
  adminUserId = adminUser.id;

  // Create analyst user via prisma
  await prisma.user.create({
    data: {
      email: analystEmail,
      password: hashedPassword,
      name: "Dashboard Analyst",
      role: "ANALYST",
    },
  });

  // Create viewer user via API
  await app.request("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: viewerEmail, password: "password123", name: "Dashboard Viewer" }),
  });

  adminToken = await getAuthToken(adminEmail, "password123");
  analystToken = await getAuthToken(analystEmail, "password123");
  viewerToken = await getAuthToken(viewerEmail, "password123");

  // Create test records via admin
  const records = [
    { amount: 5000, type: "INCOME", category: "salary", date: "2025-06-01T00:00:00.000Z" },
    { amount: 200, type: "EXPENSE", category: "food", date: "2025-06-05T00:00:00.000Z" },
    { amount: 1000, type: "EXPENSE", category: "rent", date: "2025-06-10T00:00:00.000Z" },
  ];

  for (const record of records) {
    const res = await app.request("/records", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(record),
    });
    const body = await res.json();
    createdRecordIds.push(body.data.id as string);
  }
});

afterAll(async () => {
  if (createdRecordIds.length > 0) {
    await prisma.record.deleteMany({
      where: { id: { in: createdRecordIds } },
    });
  }
  await prisma.user.deleteMany({
    where: { email: { in: [adminEmail, analystEmail, viewerEmail] } },
  });
  await prisma.$disconnect();
});

describe("GET /dashboard/summary", () => {
  it("ANALYST gets 200 with totalIncome, totalExpenses, netBalance", async () => {
    const res = await app.request("/dashboard/summary", {
      headers: { Authorization: `Bearer ${analystToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("totalIncome");
    expect(body.data).toHaveProperty("totalExpenses");
    expect(body.data).toHaveProperty("netBalance");
  });
});

describe("GET /dashboard/category-summary", () => {
  it("ANALYST gets 200 with data array", async () => {
    const res = await app.request("/dashboard/category-summary", {
      headers: { Authorization: `Bearer ${analystToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});

describe("GET /dashboard/recent-activity", () => {
  it("ANALYST gets 200 with data array", async () => {
    const res = await app.request("/dashboard/recent-activity", {
      headers: { Authorization: `Bearer ${analystToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});

describe("GET /dashboard/trends", () => {
  it("ANALYST gets 200 with monthly data by default", async () => {
    const res = await app.request("/dashboard/trends", {
      headers: { Authorization: `Bearer ${analystToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    if (body.data.length > 0) {
      expect(body.data[0]).toHaveProperty("month");
    }
  });

  it("ANALYST gets 200 with weekly data when granularity=weekly", async () => {
    const res = await app.request("/dashboard/trends?granularity=weekly", {
      headers: { Authorization: `Bearer ${analystToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    if (body.data.length > 0) {
      expect(body.data[0]).toHaveProperty("week");
    }
  });

  it("ANALYST gets 200 with monthly data when granularity=monthly", async () => {
    const res = await app.request("/dashboard/trends?granularity=monthly", {
      headers: { Authorization: `Bearer ${analystToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    if (body.data.length > 0) {
      expect(body.data[0]).toHaveProperty("month");
    }
  });
});

describe("Dashboard access control", () => {
  it("VIEWER gets 403 on /dashboard/summary", async () => {
    const res = await app.request("/dashboard/summary", {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("unauthenticated request returns 401 on /dashboard/summary", async () => {
    const res = await app.request("/dashboard/summary");

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
