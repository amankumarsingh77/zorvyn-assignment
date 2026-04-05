import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import { AppError, errorHandler } from "@/middleware/errorHandler.js";

describe("errorHandler", () => {
  it("returns correct status code and error body for AppError", async () => {
    const app = new Hono();
    app.onError(errorHandler);
    app.get("/test", () => {
      throw new AppError(404, "NOT_FOUND", "Resource not found");
    });

    const res = await app.request("/test");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({
      success: false,
      error: { code: "NOT_FOUND", message: "Resource not found" },
    });
  });

  it("returns 500 INTERNAL_ERROR for non-AppError exceptions", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const app = new Hono();
    app.onError(errorHandler);
    app.get("/test", () => {
      throw new Error("something broke");
    });

    const res = await app.request("/test");
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });

    consoleSpy.mockRestore();
  });
});
