import { Hono } from "hono";
import { authenticate } from "@/middleware/auth.js";
import { requireRole } from "@/middleware/roleGuard.js";
import { validate } from "@/middleware/validate.js";
import { createRecordSchema, updateRecordSchema, listRecordsQuerySchema } from "@/validations/record.schema.js";
import { idParamSchema } from "@/validations/user.schema.js";
import * as recordService from "@/services/record.service.js";
import { successResponse } from "@/helpers/response.js";
import { HTTP_CREATED } from "@/constants/http.js";
import type { AppEnv } from "@/types/index.js";
import type { CreateRecordInput, UpdateRecordInput, ListRecordsQuery } from "@/validations/record.schema.js";

const recordRoutes = new Hono<AppEnv>();

recordRoutes.use("*", authenticate);

recordRoutes.get("/", validate(listRecordsQuerySchema, "query"), async (c) => {
  const query = c.get("validated") as ListRecordsQuery;
  const result = await recordService.listRecords(query);
  return c.json(successResponse(result.records, { page: result.page, limit: result.limit, total: result.total }));
});

recordRoutes.get("/:id", validate(idParamSchema, "param"), async (c) => {
  const { id } = c.req.param();
  const record = await recordService.getRecordById(id);
  return c.json(successResponse(record));
});

recordRoutes.post("/", requireRole("ADMIN"), validate(createRecordSchema), async (c) => {
  const input = c.get("validated") as CreateRecordInput;
  const record = await recordService.createRecord(input, c.var.user.userId);
  return c.json(successResponse(record), HTTP_CREATED);
});

recordRoutes.patch("/:id", requireRole("ADMIN"), validate(idParamSchema, "param"), validate(updateRecordSchema), async (c) => {
  const { id } = c.req.param();
  const input = c.get("validated") as UpdateRecordInput;
  const record = await recordService.updateRecord(id, input, c.var.user.userId);
  return c.json(successResponse(record));
});

recordRoutes.delete("/:id", requireRole("ADMIN"), validate(idParamSchema, "param"), async (c) => {
  const { id } = c.req.param();
  await recordService.deleteRecord(id, c.var.user.userId);
  return c.json(successResponse(null));
});

export { recordRoutes };
