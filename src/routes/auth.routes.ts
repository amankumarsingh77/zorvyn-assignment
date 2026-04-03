import { Hono } from "hono";
import { validate } from "@/middleware/validate.js";
import { registerSchema, loginSchema } from "@/validations/auth.schema.js";
import * as authService from "@/services/auth.service.js";
import { successResponse } from "@/helpers/response.js";
import { HTTP_CREATED } from "@/constants/http.js";
import type { AppEnv } from "@/types/index.js";
import type { RegisterInput, LoginInput } from "@/validations/auth.schema.js";

const authRoutes = new Hono<AppEnv>();

authRoutes.post("/register", validate(registerSchema), async (c) => {
  const input = c.get("validated") as RegisterInput;
  const user = await authService.register(input);
  return c.json(successResponse(user), HTTP_CREATED);
});

authRoutes.post("/login", validate(loginSchema), async (c) => {
  const input = c.get("validated") as LoginInput;
  const result = await authService.login(input);
  return c.json(successResponse(result));
});

export { authRoutes };
