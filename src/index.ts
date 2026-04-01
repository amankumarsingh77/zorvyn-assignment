import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { env } from "./config/env.js";
import { prisma } from "./config/db.js";
import { successResponse } from "./helpers/response.js";

const app = new Hono();

app.get("/health", async (c) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return c.json(successResponse({ status: "healthy", database: "connected" }));
  } catch {
    return c.json(successResponse({ status: "unhealthy", database: "disconnected" }), 503);
  }
});

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`);
});

export default app;
