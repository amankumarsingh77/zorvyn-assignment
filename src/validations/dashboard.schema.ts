import { z } from "zod";

export const dashboardQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

export const trendsQuerySchema = z.object({
  granularity: z.enum(["monthly", "weekly"]).default("monthly"),
});

export type TrendsQuery = z.infer<typeof trendsQuerySchema>;
