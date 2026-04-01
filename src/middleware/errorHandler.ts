import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { Context } from "hono";
import { errorResponse } from "../helpers/response.js";

export class AppError extends Error {
  constructor(
    public statusCode: ContentfulStatusCode,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorHandler(err: Error, c: Context): Response {
  if (err instanceof AppError) {
    return c.json(errorResponse(err.code, err.message), err.statusCode);
  }

  console.error("Unhandled error:", err);
  return c.json(errorResponse("INTERNAL_ERROR", "Internal server error"), 500);
}
