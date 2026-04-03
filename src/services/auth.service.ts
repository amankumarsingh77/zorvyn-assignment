import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "@/config/env.js";
import { AppError } from "@/middleware/errorHandler.js";
import { findUserByEmail, findUserByEmailWithPassword, createUser } from "@/repositories/user.repository.js";
import { HTTP_UNAUTHORIZED, HTTP_FORBIDDEN, HTTP_CONFLICT } from "@/constants/http.js";
import type { RegisterInput, LoginInput } from "@/validations/auth.schema.js";
import type { JwtPayload } from "@/types/index.js";
import type { Role } from "@generated/prisma/client.js";

const SALT_ROUNDS = 10;

interface LoginUser {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: Role;
}

export async function register(input: RegisterInput): Promise<{
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: Role;
  readonly status: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}> {
  const existing = await findUserByEmail(input.email);

  if (existing) {
    throw new AppError(HTTP_CONFLICT, "CONFLICT", "Email already registered");
  }

  const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);

  return createUser({
    email: input.email,
    password: hashedPassword,
    name: input.name,
  });
}

export async function login(input: LoginInput): Promise<{ token: string; user: LoginUser }> {
  const user = await findUserByEmailWithPassword(input.email);

  if (!user) {
    throw new AppError(HTTP_UNAUTHORIZED, "UNAUTHORIZED", "Invalid email or password");
  }

  if (user.status === "INACTIVE") {
    throw new AppError(HTTP_FORBIDDEN, "FORBIDDEN", "Account is inactive");
  }

  const passwordMatch = await bcrypt.compare(input.password, user.password);

  if (!passwordMatch) {
    throw new AppError(HTTP_UNAUTHORIZED, "UNAUTHORIZED", "Invalid email or password");
  }

  const payload: JwtPayload = {
    userId: user.id,
    role: user.role,
  };

  const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRY as jwt.SignOptions["expiresIn"] });

  return {
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}
