import type { Context, Next } from "hono";
import type { Role } from "../../generated/prisma/client.js";
import { AppError } from "./errorHandler.js";
import type { JwtPayload } from "../types/index.js";

export function requireRole(...allowedRoles: Role[]) {
  return async (c: Context, next: Next): Promise<void> => {
    const user = c.get("user") as JwtPayload | undefined;

    if (!user) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication required");
    }

    if (!allowedRoles.includes(user.role)) {
      throw new AppError(403, "FORBIDDEN", "Insufficient permissions");
    }

    await next();
  };
}
