import { z } from "zod";

export const listAuditLogsQuerySchema = z.object({
  entityId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  action: z.enum(["CREATE", "UPDATE", "DELETE"]).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
