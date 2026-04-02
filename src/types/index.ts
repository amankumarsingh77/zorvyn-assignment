import type { Role } from "../../generated/prisma/client.js";

export interface JwtPayload {
  readonly userId: string;
  readonly role: Role;
}

export interface Variables {
  readonly user: JwtPayload;
  readonly validated: unknown;
}
