import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../middleware/errorHandler.js";
import { findUserByEmail, createUser } from "../repositories/user.repository.js";
import { HTTP_UNAUTHORIZED, HTTP_FORBIDDEN, HTTP_CONFLICT } from "../constants/http.js";
import type { RegisterInput, LoginInput } from "../validations/auth.schema.js";
import type { JwtPayload } from "../types/index.js";

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = "24h";

export async function register(input: RegisterInput): Promise<Omit<Awaited<ReturnType<typeof createUser>>, "password">> {
  const existing = await findUserByEmail(input.email);

  if (existing) {
    throw new AppError(HTTP_CONFLICT, "DUPLICATE_EMAIL", "A user with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await createUser({
    email: input.email,
    password: hashedPassword,
    name: input.name,
  });

  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export async function login(input: LoginInput): Promise<{ token: string; user: Omit<Awaited<ReturnType<typeof findUserByEmail & object>>, "password"> }> {
  const user = await findUserByEmail(input.email);

  if (!user) {
    throw new AppError(HTTP_UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  if (user.status === "INACTIVE") {
    throw new AppError(HTTP_FORBIDDEN, "ACCOUNT_INACTIVE", "Account is inactive");
  }

  const passwordMatch = await bcrypt.compare(input.password, user.password);

  if (!passwordMatch) {
    throw new AppError(HTTP_UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  const payload: JwtPayload = {
    userId: user.id,
    role: user.role,
  };

  const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

  const { password: _, ...userWithoutPassword } = user;
  return { token, user: userWithoutPassword };
}
