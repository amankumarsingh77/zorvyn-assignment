import type { Context, Next } from "hono";
import type { ZodType } from "zod";
import { AppError } from "./errorHandler.js";
import { HTTP_BAD_REQUEST } from "../constants/http.js";
import type { AppEnv } from "../types/index.js";

type ValidationTarget = "json" | "query" | "param";

export function validate(schema: ZodType, target: ValidationTarget = "json"): (c: Context<AppEnv>, next: Next) => Promise<void> {
  return async (c: Context<AppEnv>, next: Next): Promise<void> => {
    let data: unknown;

    if (target === "json") {
      data = await c.req.json();
    } else if (target === "query") {
      data = c.req.query();
    } else {
      data = c.req.param();
    }

    const result = schema.safeParse(data);

    if (!result.success) {
      const formatted = result.error.issues
        .map((issue) => {
          const path = issue.path.join(".");
          return path ? `${path}: ${issue.message}` : issue.message;
        })
        .join("; ");

      throw new AppError(HTTP_BAD_REQUEST, "VALIDATION_ERROR", formatted);
    }

    c.set("validated", result.data);
    await next();
  };
}
