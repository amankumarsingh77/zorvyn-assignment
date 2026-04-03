import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "@/config/env.js";
import { checkDatabaseConnection } from "@/repositories/health.repository.js";
import { successResponse, errorResponse } from "@/helpers/response.js";
import { HTTP_SERVICE_UNAVAILABLE } from "@/constants/http.js";
import { errorHandler } from "@/middleware/errorHandler.js";
import type { AppEnv } from "@/types/index.js";
import { authRoutes } from "@/routes/auth.routes.js";
import { userRoutes } from "@/routes/user.routes.js";
import { recordRoutes } from "@/routes/record.routes.js";
import { dashboardRoutes } from "@/routes/dashboard.routes.js";

const CORS_MAX_AGE = 3600;

const app = new Hono<AppEnv>();

const isWildcardOrigin = env.CORS_ORIGINS === "*";

app.use("/*", cors({
  origin: isWildcardOrigin ? "*" : env.CORS_ORIGINS.split(","),
  allowMethods: ["GET", "POST", "PATCH", "DELETE"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: !isWildcardOrigin,
  maxAge: CORS_MAX_AGE,
}));

app.onError(errorHandler);

app.get("/health", async (c) => {
  const isConnected = await checkDatabaseConnection();
  if (isConnected) {
    return c.json(successResponse({ status: "healthy", database: "connected" }));
  }
  return c.json(errorResponse("SERVICE_UNAVAILABLE", "Database connection failed"), HTTP_SERVICE_UNAVAILABLE);
});

app.route("/auth", authRoutes);
app.route("/users", userRoutes);
app.route("/records", recordRoutes);
app.route("/dashboard", dashboardRoutes);

export { app };
