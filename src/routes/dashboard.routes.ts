import { Hono } from "hono";
import { authenticate } from "@/middleware/auth.js";
import { requireRole } from "@/middleware/roleGuard.js";
import { validate } from "@/middleware/validate.js";
import { dashboardQuerySchema } from "@/validations/dashboard.schema.js";
import * as dashboardService from "@/services/dashboard.service.js";
import { successResponse } from "@/helpers/response.js";
import type { AppEnv } from "@/types/index.js";
import type { DashboardQuery } from "@/validations/dashboard.schema.js";

const dashboardRoutes = new Hono<AppEnv>();

dashboardRoutes.use("*", authenticate);
dashboardRoutes.use("*", requireRole("ANALYST", "ADMIN"));

dashboardRoutes.get("/summary", validate(dashboardQuerySchema, "query"), async (c) => {
  const query = c.get("validated") as DashboardQuery;
  const result = await dashboardService.getSummary(query);
  return c.json(successResponse(result));
});

dashboardRoutes.get("/category-summary", validate(dashboardQuerySchema, "query"), async (c) => {
  const query = c.get("validated") as DashboardQuery;
  const result = await dashboardService.getCategorySummary(query);
  return c.json(successResponse(result));
});

dashboardRoutes.get("/recent-activity", async (c) => {
  const result = await dashboardService.getRecentActivity();
  return c.json(successResponse(result));
});

dashboardRoutes.get("/trends", async (c) => {
  const result = await dashboardService.getMonthlyTrends();
  return c.json(successResponse(result));
});

export { dashboardRoutes };
