import type { Role } from "../../generated/prisma/client.js";

export type JwtPayload = {
  userId: string;
  role: Role;
};

export type Variables = {
  user: JwtPayload;
};
