import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { Context } from "hono";
import { errorResponse } from "@/helpers/response.js";
import { HTTP_INTERNAL_SERVER_ERROR } from "@/constants/http.js";

export class AppError extends Error {
  constructor(
    public readonly statusCode: ContentfulStatusCode,
    public readonly code: string,
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
  return c.json(errorResponse("INTERNAL_ERROR", "Internal server error"), HTTP_INTERNAL_SERVER_ERROR);
}
