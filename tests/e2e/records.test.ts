import bcrypt from "bcrypt";
import { app } from "../../src/app.js";
import { connectDatabase, prisma } from "../../src/config/db.js";

const TEST_PREFIX = `test-rec-${Date.now()}`;
const adminEmail = `${TEST_PREFIX}-admin@example.com`;
const viewerEmail = `${TEST_PREFIX}-viewer@example.com`;

let adminToken: string;
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

  // Create admin user directly via prisma
  const hashedPassword = await bcrypt.hash("password123", 10);
  const adminUser = await prisma.user.create({
    data: {
      email: adminEmail,
      password: hashedPassword,
      name: "Test Admin",
      role: "ADMIN",
    },
  });
  adminUserId = adminUser.id;

  // Create viewer user via API
  await app.request("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: viewerEmail, password: "password123", name: "Test Viewer" }),
  });

  adminToken = await getAuthToken(adminEmail, "password123");
  viewerToken = await getAuthToken(viewerEmail, "password123");
});

afterAll(async () => {
  if (createdRecordIds.length > 0) {
    await prisma.record.deleteMany({
      where: { id: { in: createdRecordIds } },
    });
  }
  await prisma.user.deleteMany({
    where: { email: { in: [adminEmail, viewerEmail] } },
  });
  await prisma.$disconnect();
});

function trackRecord(id: string): void {
  createdRecordIds.push(id);
}

const sampleRecord = {
  amount: 1500,
  type: "INCOME" as const,
  category: "salary",
  date: "2025-06-15T00:00:00.000Z",
};

describe("GET /records", () => {
  it("authenticated viewer gets 200 with data array and meta", async () => {
    const res = await app.request("/records", {
      headers: { Authorization: `Bearer ${viewerToken}` },
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

describe("GET /records/:id", () => {
  let recordId: string;

  beforeAll(async () => {
    const res = await app.request("/records", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(sampleRecord),
    });
    const body = await res.json();
    recordId = body.data.id as string;
    trackRecord(recordId);
  });

  it("returns 200 with record details", async () => {
    const res = await app.request(`/records/${recordId}`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(recordId);
  });

  it("returns 404 for non-existent record", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await app.request(`/records/${fakeId}`, {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});

describe("POST /records", () => {
  it("ADMIN gets 201 with created record", async () => {
    const res = await app.request("/records", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(sampleRecord),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("id");
    expect(Number(body.data.amount)).toBe(sampleRecord.amount);
    expect(body.data.type).toBe(sampleRecord.type);
    expect(body.data.category).toBe(sampleRecord.category);
    trackRecord(body.data.id as string);
  });

  it("VIEWER gets 403", async () => {
    const res = await app.request("/records", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${viewerToken}`,
      },
      body: JSON.stringify(sampleRecord),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("returns 400 for invalid input (missing amount)", async () => {
    const res = await app.request("/records", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ type: "INCOME", category: "salary", date: "2025-06-15T00:00:00.000Z" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("PATCH /records/:id", () => {
  let recordId: string;

  beforeAll(async () => {
    const res = await app.request("/records", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(sampleRecord),
    });
    const body = await res.json();
    recordId = body.data.id as string;
    trackRecord(recordId);
  });

  it("ADMIN gets 200 with updated fields", async () => {
    const res = await app.request(`/records/${recordId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ amount: 2000 }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Number(body.data.amount)).toBe(2000);
  });
});

describe("DELETE /records/:id", () => {
  let recordId: string;

  beforeAll(async () => {
    const res = await app.request("/records", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(sampleRecord),
    });
    const body = await res.json();
    recordId = body.data.id as string;
    // Don't track — we're deleting it ourselves
  });

  it("ADMIN gets 200, then GET returns 404", async () => {
    const delRes = await app.request(`/records/${recordId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(delRes.status).toBe(200);
    const delBody = await delRes.json();
    expect(delBody.success).toBe(true);

    const getRes = await app.request(`/records/${recordId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(getRes.status).toBe(404);
  });
});

describe("Unauthenticated request", () => {
  it("returns 401 without Authorization header", async () => {
    const res = await app.request("/records");

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
