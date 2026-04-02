import { Hono } from "hono";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/roleGuard.js";
import { validate } from "../middleware/validate.js";
import { createRecordSchema, updateRecordSchema, listRecordsQuerySchema } from "../validations/record.schema.js";
import * as recordService from "../services/record.service.js";
import { successResponse } from "../helpers/response.js";
import { HTTP_CREATED } from "../constants/http.js";
import type { AppEnv } from "../types/index.js";

const recordRoutes = new Hono<AppEnv>();

recordRoutes.use("*", authenticate);

recordRoutes.get("/", validate(listRecordsQuerySchema, "query"), async (c) => {
  const query = listRecordsQuerySchema.parse(c.get("validated"));
  const result = await recordService.listRecords(query);
  return c.json(successResponse(result.records, { page: result.page, limit: result.limit, total: result.total }));
});

recordRoutes.get("/:id", async (c) => {
  const record = await recordService.getRecordById(c.req.param("id"));
  return c.json(successResponse(record));
});

recordRoutes.post("/", requireRole("ADMIN"), validate(createRecordSchema), async (c) => {
  const input = createRecordSchema.parse(c.get("validated"));
  const record = await recordService.createRecord(input, c.var.user.userId);
  return c.json(successResponse(record), HTTP_CREATED);
});

recordRoutes.patch("/:id", requireRole("ADMIN"), validate(updateRecordSchema), async (c) => {
  const { id } = c.req.param();
  const input = updateRecordSchema.parse(c.get("validated"));
  const record = await recordService.updateRecord(id, input);
  return c.json(successResponse(record));
});

recordRoutes.delete("/:id", requireRole("ADMIN"), async (c) => {
  const { id } = c.req.param();
  await recordService.deleteRecord(id);
  return c.json(successResponse(null));
});

export { recordRoutes };
