import type { Context, Next } from "hono";
import type { ZodType } from "zod";
import { z } from "zod";
import { AppError } from "./errorHandler.js";

type ValidationTarget = "json" | "query" | "param";

export function validate(schema: ZodType, target: ValidationTarget = "json") {
  return async (c: Context, next: Next): Promise<void> => {
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

      throw new AppError(400, "VALIDATION_ERROR", formatted);
    }

    c.set("validated", result.data);
    await next();
  };
}
