import { serve } from "@hono/node-server";
import { env } from "@/config/env.js";
import { connectDatabase } from "@/config/db.js";
import { app } from "./app.js";

connectDatabase().then(() => {
  serve({ fetch: app.fetch, port: env.PORT }, (info) => {
    console.info(`Server running on http://localhost:${info.port}`);
  });
}).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
