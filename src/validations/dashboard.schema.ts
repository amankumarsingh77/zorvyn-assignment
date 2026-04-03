import { z } from "zod";

export const dashboardQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
