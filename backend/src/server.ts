/**
 * server.ts — Start the HTTP server.
 *
 * WHY: Separated from app.ts so that tests can import the app
 * without triggering a listen() call.
 */

// Load and validate env vars FIRST (before anything else uses them)
import { env } from "./config/env";
import app from "./app";

app.listen(env.PORT, () => {
  console.log(`🚀 Server running on http://localhost:${env.PORT}`);
  console.log(`📬 Mailpit UI at http://localhost:8025`);
});
