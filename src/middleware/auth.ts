import type { Context, Next } from "hono";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "./errorHandler.js";
import { HTTP_UNAUTHORIZED } from "../constants/http.js";
import type { JwtPayload } from "../types/index.js";

const BEARER_PREFIX_LENGTH = 7;

export async function authenticate(c: Context, next: Next): Promise<void> {
  const header = c.req.header("Authorization");

  if (!header || !header.startsWith("Bearer ")) {
    throw new AppError(HTTP_UNAUTHORIZED, "UNAUTHORIZED", "Missing or invalid authorization header");
  }

  const token = header.slice(BEARER_PREFIX_LENGTH);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    c.set("user", payload);
    await next();
  } catch {
    throw new AppError(HTTP_UNAUTHORIZED, "UNAUTHORIZED", "Invalid or expired token");
  }
}
