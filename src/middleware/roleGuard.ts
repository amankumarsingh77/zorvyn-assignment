import type { Context, Next } from "hono";
import type { Role } from "@generated/prisma/client.js";
import { AppError } from "@/middleware/errorHandler.js";
import { HTTP_UNAUTHORIZED, HTTP_FORBIDDEN } from "@/constants/http.js";
import type { AppEnv } from "@/types/index.js";

export function requireRole(...allowedRoles: Role[]): (c: Context<AppEnv>, next: Next) => Promise<void> {
  return async (c: Context<AppEnv>, next: Next): Promise<void> => {
    const user = c.var.user;

    if (!user) {
      throw new AppError(HTTP_UNAUTHORIZED, "UNAUTHORIZED", "Authentication required");
    }

    if (!allowedRoles.includes(user.role)) {
      throw new AppError(HTTP_FORBIDDEN, "FORBIDDEN", "Insufficient permissions");
    }

    await next();
  };
}
