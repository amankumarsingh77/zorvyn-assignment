import { hash } from "bcrypt";
import { prisma, connectDatabase } from "@/config/db.js";
import { Prisma } from "@generated/prisma/client.js";

const SALT_ROUNDS = 10;

interface SeedUser {
  readonly email: string;
  readonly password: string;
  readonly name: string;
  readonly role: "ADMIN" | "ANALYST" | "VIEWER";
  readonly status: "ACTIVE";
}

const SEED_USERS: readonly SeedUser[] = [
  { email: "admin@example.com", password: "admin123", name: "Admin User", role: "ADMIN", status: "ACTIVE" },
  { email: "analyst@example.com", password: "analyst123", name: "Analyst User", role: "ANALYST", status: "ACTIVE" },
  { email: "viewer@example.com", password: "viewer123", name: "Viewer User", role: "VIEWER", status: "ACTIVE" },
] as const;

function randomAmount(min: number, max: number): Prisma.Decimal {
  const value = Math.random() * (max - min) + min;
  return new Prisma.Decimal(value.toFixed(2));
}

function monthsAgo(months: number): Date {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

async function seed(): Promise<void> {
  await connectDatabase();

  // Clean existing data (records first due to FK constraint)
  await prisma.record.deleteMany();
  await prisma.user.deleteMany();
  console.info("Cleaned existing data");

  // Create users with hashed passwords
  const createdUsers = await Promise.all(
    SEED_USERS.map(async (user) => {
      const hashedPassword = await hash(user.password, SALT_ROUNDS);
      return prisma.user.create({
        data: {
          email: user.email,
          password: hashedPassword,
          name: user.name,
          role: user.role,
          status: user.status,
        },
      });
    })
  );

  const admin = createdUsers[0];
  const analyst = createdUsers[1];
  console.info(`Created ${createdUsers.length} users`);

  // Build financial records
  const records: Prisma.RecordCreateManyInput[] = [];

  // Monthly salary: INCOME, $5000, "salary" (12 months x 2 users = 24)
  for (let m = 0; m < 12; m++) {
    for (const user of [admin, analyst]) {
      records.push({
        amount: new Prisma.Decimal("5000.00"),
        type: "INCOME",
        category: "salary",
        date: monthsAgo(m),
        notes: `Monthly salary - ${monthsAgo(m).toISOString().slice(0, 7)}`,
        createdBy: user.id,
      });
    }
  }

  // Quarterly freelance: INCOME, $1500, "freelance" (4 quarters x 2 users = 8)
  for (let q = 0; q < 4; q++) {
    for (const user of [admin, analyst]) {
      records.push({
        amount: new Prisma.Decimal("1500.00"),
        type: "INCOME",
        category: "freelance",
        date: monthsAgo(q * 3),
        notes: `Freelance payment - Q${q + 1}`,
        createdBy: user.id,
      });
    }
  }

  // Monthly rent: EXPENSE, $1200, "rent" (12 months x 1 user = 12)
  for (let m = 0; m < 12; m++) {
    records.push({
      amount: new Prisma.Decimal("1200.00"),
      type: "EXPENSE",
      category: "rent",
      date: monthsAgo(m),
      notes: `Rent - ${monthsAgo(m).toISOString().slice(0, 7)}`,
      createdBy: admin.id,
    });
  }

  // Monthly utilities: EXPENSE, $150-200 randomized, "utilities" (12 months x 1 user = 12)
  for (let m = 0; m < 12; m++) {
    records.push({
      amount: randomAmount(150, 200),
      type: "EXPENSE",
      category: "utilities",
      date: monthsAgo(m),
      notes: `Utilities - ${monthsAgo(m).toISOString().slice(0, 7)}`,
      createdBy: analyst.id,
    });
  }

  // Bi-monthly groceries: EXPENSE, $180-300 randomized, "groceries" (6 x 2 users = 12)
  for (let m = 0; m < 6; m++) {
    for (const user of [admin, analyst]) {
      records.push({
        amount: randomAmount(180, 300),
        type: "EXPENSE",
        category: "groceries",
        date: monthsAgo(m * 2),
        notes: `Groceries - ${monthsAgo(m * 2).toISOString().slice(0, 7)}`,
        createdBy: user.id,
      });
    }
  }

  const result = await prisma.record.createMany({ data: records });
  console.info(`Created ${result.count} financial records`);

  console.info("\n--- Seed Summary ---");
  console.info(`Users created: ${createdUsers.length}`);
  console.info(`Records created: ${result.count}`);
  console.info("\nCredentials:");
  for (const user of SEED_USERS) {
    console.info(`  ${user.role}: ${user.email} / ${user.password}`);
  }
}

seed()
  .catch((error: unknown) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
