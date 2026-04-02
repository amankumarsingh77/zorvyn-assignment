import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { env } from "./config/env.js";
import { checkDatabaseConnection } from "./repositories/health.repository.js";
import { successResponse } from "./helpers/response.js";
import { HTTP_SERVICE_UNAVAILABLE } from "./constants/http.js";
import { errorHandler } from "./middleware/errorHandler.js";
import type { Variables } from "./types/index.js";
import { authRoutes } from "./routes/auth.routes.js";

const app = new Hono<{ Variables: Variables }>();

app.onError(errorHandler);

app.get("/health", async (c) => {
  const isConnected = await checkDatabaseConnection();
  if (isConnected) {
    return c.json(successResponse({ status: "healthy", database: "connected" }));
  }
  return c.json(successResponse({ status: "unhealthy", database: "disconnected" }), HTTP_SERVICE_UNAVAILABLE);
});

app.route("/auth", authRoutes);

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.info(`Server running on http://localhost:${info.port}`);
});

export { app };
