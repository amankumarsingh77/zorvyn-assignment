import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { env } from "./config/env.js";
import { checkDatabaseConnection } from "./repositories/health.repository.js";
import { successResponse } from "./helpers/response.js";
import { HTTP_SERVICE_UNAVAILABLE } from "./constants/http.js";

const app = new Hono();

app.get("/health", async (c) => {
  const isConnected = await checkDatabaseConnection();
  if (isConnected) {
    return c.json(successResponse({ status: "healthy", database: "connected" }));
  }
  return c.json(successResponse({ status: "unhealthy", database: "disconnected" }), HTTP_SERVICE_UNAVAILABLE);
});

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`);
});

export { app };
