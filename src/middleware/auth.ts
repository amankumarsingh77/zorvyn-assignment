import type { Next } from "hono";
import type { Context } from "hono";
import jwt from "jsonwebtoken";
import { env } from "@/config/env.js";
import { AppError } from "@/middleware/errorHandler.js";
import { HTTP_UNAUTHORIZED, HTTP_FORBIDDEN } from "@/constants/http.js";
import { isJwtPayload } from "@/types/index.js";
import type { AppEnv } from "@/types/index.js";
import { findUserById } from "@/repositories/user.repository.js";

const BEARER_PREFIX_LENGTH = 7;

export async function authenticate(c: Context<AppEnv>, next: Next): Promise<void> {
  const header = c.req.header("Authorization");

  if (!header || !header.startsWith("Bearer ")) {
    throw new AppError(HTTP_UNAUTHORIZED, "UNAUTHORIZED", "Missing or invalid authorization header");
  }

  const token = header.slice(BEARER_PREFIX_LENGTH);

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (!isJwtPayload(decoded)) {
      throw new AppError(HTTP_UNAUTHORIZED, "UNAUTHORIZED", "Invalid token payload");
    }

    const user = await findUserById(decoded.userId);
    if (!user) {
      throw new AppError(HTTP_UNAUTHORIZED, "UNAUTHORIZED", "User no longer exists");
    }
    if (user.status === "INACTIVE") {
      throw new AppError(HTTP_FORBIDDEN, "FORBIDDEN", "Account is inactive");
    }

    c.set("user", decoded);
    await next();
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(HTTP_UNAUTHORIZED, "UNAUTHORIZED", "Invalid or expired token");
  }
}
