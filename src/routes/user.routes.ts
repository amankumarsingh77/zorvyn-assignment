import { Hono } from "hono";
import { authenticate } from "@/middleware/auth.js";
import { requireRole } from "@/middleware/roleGuard.js";
import { validate } from "@/middleware/validate.js";
import { createUserSchema, updateUserSchema, listUsersQuerySchema } from "@/validations/user.schema.js";
import * as userService from "@/services/user.service.js";
import { successResponse } from "@/helpers/response.js";
import { HTTP_CREATED } from "@/constants/http.js";
import type { AppEnv } from "@/types/index.js";

const userRoutes = new Hono<AppEnv>();

userRoutes.use("*", authenticate, requireRole("ADMIN"));

userRoutes.get("/", validate(listUsersQuerySchema, "query"), async (c) => {
  const query = listUsersQuerySchema.parse(c.get("validated"));
  const result = await userService.listUsers(query);
  return c.json(successResponse(result.users, { page: result.page, limit: result.limit, total: result.total }));
});

userRoutes.post("/", validate(createUserSchema), async (c) => {
  const input = createUserSchema.parse(c.get("validated"));
  const user = await userService.createUser(input);
  return c.json(successResponse(user), HTTP_CREATED);
});

userRoutes.get("/:id", async (c) => {
  const user = await userService.getUserById(c.req.param("id"));
  return c.json(successResponse(user));
});

userRoutes.patch("/:id", validate(updateUserSchema), async (c) => {
  const { id } = c.req.param();
  const input = updateUserSchema.parse(c.get("validated"));
  const user = await userService.updateUser(id, input);
  return c.json(successResponse(user));
});

userRoutes.delete("/:id", async (c) => {
  await userService.deleteUser(c.req.param("id"));
  return c.json(successResponse(null));
});

export { userRoutes };
