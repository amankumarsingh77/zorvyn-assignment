import type { Role } from "../../generated/prisma/client.js";
import type { Env } from "hono";

export interface JwtPayload {
  readonly userId: string;
  readonly role: Role;
}

export interface Variables {
  readonly user: JwtPayload;
  readonly validated: unknown;
}

export interface AppEnv extends Env {
  readonly Variables: Variables;
}

export function isJwtPayload(value: unknown): value is JwtPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "userId" in value &&
    "role" in value &&
    typeof (value as Record<string, unknown>).userId === "string" &&
    typeof (value as Record<string, unknown>).role === "string"
  );
}
