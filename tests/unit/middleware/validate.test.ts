import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "@/types/index.js";
import { validate } from "@/middleware/validate.js";
import { errorHandler } from "@/middleware/errorHandler.js";

describe("validate", () => {
  describe("JSON body validation", () => {
    const schema = z.object({
      name: z.string().min(1),
      amount: z.number().positive(),
    });

    function createApp() {
      const app = new Hono<AppEnv>();
      app.onError(errorHandler);
      app.post("/test", validate(schema, "json"), (c) => {
        const data = c.get("validated");
        return c.json({ ok: true, data }, 200);
      });
      return app;
    }

    it("sets validated data in context for valid JSON body", async () => {
      const app = createApp();
      const body = { name: "Salary", amount: 5000 };
      const res = await app.request("/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data).toEqual(body);
    });

    it("throws VALIDATION_ERROR with field details for invalid body", async () => {
      const app = createApp();
      const body = { name: "", amount: -10 };
      const res = await app.request("/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("VALIDATION_ERROR");
      expect(json.error.message).toContain("name");
      expect(json.error.message).toContain("amount");
    });

    it("throws VALIDATION_ERROR for malformed JSON", async () => {
      const app = createApp();
      const res = await app.request("/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not valid json{{{",
      });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("VALIDATION_ERROR");
      expect(json.error.message).toBe("Invalid JSON body");
    });
  });

  describe("Query validation", () => {
    const schema = z.object({
      page: z.string().regex(/^\d+$/),
      limit: z.string().regex(/^\d+$/),
    });

    function createApp() {
      const app = new Hono<AppEnv>();
      app.onError(errorHandler);
      app.get("/test", validate(schema, "query"), (c) => {
        const data = c.get("validated");
        return c.json({ ok: true, data }, 200);
      });
      return app;
    }

    it("parses and sets query params when target is 'query'", async () => {
      const app = createApp();
      const res = await app.request("/test?page=1&limit=10");
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data).toEqual({ page: "1", limit: "10" });
    });
  });

  describe("Param validation", () => {
    const schema = z.object({
      id: z.string().uuid(),
    });

    function createApp() {
      const app = new Hono<AppEnv>();
      app.onError(errorHandler);
      app.get("/test/:id", validate(schema, "param"), (c) => {
        const data = c.get("validated");
        return c.json({ ok: true, data }, 200);
      });
      return app;
    }

    it("parses and sets route params when target is 'param'", async () => {
      const app = createApp();
      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      const res = await app.request(`/test/${uuid}`);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data).toEqual({ id: uuid });
    });
  });
});
