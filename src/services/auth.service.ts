import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../config/db.js";
import { env } from "../config/env.js";
import { AppError } from "../middleware/errorHandler.js";
import type { RegisterInput, LoginInput } from "../validations/auth.schema.js";
import type { JwtPayload } from "../types/index.js";

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = "24h";

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existing) {
    throw new AppError(409, "DUPLICATE_EMAIL", "A user with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      password: hashedPassword,
      name: input.name,
    },
  });

  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  if (user.status === "INACTIVE") {
    throw new AppError(403, "ACCOUNT_INACTIVE", "Account is inactive");
  }

  const passwordMatch = await bcrypt.compare(input.password, user.password);

  if (!passwordMatch) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  const payload: JwtPayload = {
    userId: user.id,
    role: user.role,
  };

  const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

  const { password: _, ...userWithoutPassword } = user;
  return { token, user: userWithoutPassword };
}
