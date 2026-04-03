import { z } from "zod";

export const createUserSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
  name: z.string().min(1).max(100),
  role: z.enum(["VIEWER", "ANALYST", "ADMIN"]),
});

export const updateUserSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    role: z.enum(["VIEWER", "ANALYST", "ADMIN"]).optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const idParamSchema = z.object({
  id: z.string().uuid("Invalid ID format"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
