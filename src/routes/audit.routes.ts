import { Hono } from "hono";
import { authenticate } from "@/middleware/auth.js";
import { requireRole } from "@/middleware/roleGuard.js";
import { validate } from "@/middleware/validate.js";
import { listAuditLogsQuerySchema } from "@/validations/audit.schema.js";
import * as auditService from "@/services/audit.service.js";
import { successResponse } from "@/helpers/response.js";
import type { AppEnv } from "@/types/index.js";
import type { ListAuditLogsQuery } from "@/validations/audit.schema.js";

const auditRoutes = new Hono<AppEnv>();

auditRoutes.use("*", authenticate);

auditRoutes.get("/", requireRole("ADMIN"), validate(listAuditLogsQuerySchema, "query"), async (c) => {
  const query = c.get("validated") as ListAuditLogsQuery;
  const result = await auditService.listAuditLogs(query);
  return c.json(successResponse(result.auditLogs, {
    page: result.page,
    limit: result.limit,
    total: result.total,
  }));
});

export { auditRoutes };
