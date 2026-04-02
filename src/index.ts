import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { env } from "./config/env.js";
import { checkDatabaseConnection } from "./repositories/health.repository.js";
import { successResponse } from "./helpers/response.js";
import { HTTP_SERVICE_UNAVAILABLE } from "./constants/http.js";
import { errorHandler } from "./middleware/errorHandler.js";
import type { AppEnv } from "./types/index.js";
import { authRoutes } from "./routes/auth.routes.js";
import { userRoutes } from "./routes/user.routes.js";
import { recordRoutes } from "./routes/record.routes.js";

const CORS_MAX_AGE = 3600;

const app = new Hono<AppEnv>();

app.use("/*", cors({
  origin: env.CORS_ORIGINS.split(","),
  allowMethods: ["GET", "POST", "PATCH", "DELETE"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: CORS_MAX_AGE,
}));

app.onError(errorHandler);

app.get("/health", async (c) => {
  const isConnected = await checkDatabaseConnection();
  if (isConnected) {
    return c.json(successResponse({ status: "healthy", database: "connected" }));
  }
  return c.json(successResponse({ status: "unhealthy", database: "disconnected" }), HTTP_SERVICE_UNAVAILABLE);
});

app.route("/auth", authRoutes);
app.route("/users", userRoutes);
app.route("/records", recordRoutes);

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.info(`Server running on http://localhost:${info.port}`);
});

export { app };
