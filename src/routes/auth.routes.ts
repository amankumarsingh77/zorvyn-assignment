import { Hono } from "hono";
import { validate } from "../middleware/validate.js";
import { registerSchema, loginSchema } from "../validations/auth.schema.js";
import type { RegisterInput, LoginInput } from "../validations/auth.schema.js";
import * as authService from "../services/auth.service.js";
import { successResponse } from "../helpers/response.js";
import type { Variables } from "../types/index.js";

const auth = new Hono<{ Variables: Variables }>();

auth.post("/register", validate(registerSchema), async (c) => {
  const input = c.get("validated") as RegisterInput;
  const user = await authService.register(input);
  return c.json(successResponse(user), 201);
});

auth.post("/login", validate(loginSchema), async (c) => {
  const input = c.get("validated") as LoginInput;
  const result = await authService.login(input);
  return c.json(successResponse(result));
});

export default auth;
