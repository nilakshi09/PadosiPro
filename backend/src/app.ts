/**
 * app.ts — Express application setup.
 *
 * WHY: We keep app creation separate from server.ts so that tests
 * can import the app without actually starting the HTTP server.
 */

import express from "express";
import cors from "cors";
import healthRoutes from "./routes/health.routes";
import authRoutes from "./routes/authRoutes";
import profileRoutes from "./routes/profileRoutes";
import taskRoutes from "./routes/taskRoutes";
import { notFoundHandler } from "./middleware/notFoundHandler";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

// ── Core middleware ──────────────────────────────────────────
app.use(express.json());                // Parse JSON request bodies
app.use(cors());                        // Allow cross-origin requests (mobile app)

// ── API routes ───────────────────────────────────────────────
app.use("/api", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/tasks", taskRoutes);

// ── Error handling (must be registered AFTER routes) ─────────
app.use(notFoundHandler);               // Catch undefined routes → 404
app.use(errorHandler);                  // Catch all thrown/next(err) errors

export default app;
