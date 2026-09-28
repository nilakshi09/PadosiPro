/**
 * health.routes.ts — Health-check endpoint.
 *
 * WHY: The /api/health endpoint lets us (and Docker / load balancers)
 * verify that both the Express server and the database are working.
 */

import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma";
import { sendSuccess } from "../utils/response";

const router = Router();

/**
 * GET /api/health
 * Returns server status and checks the database connection.
 */
router.get("/health", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Run a simple query to prove the database is reachable
    await prisma.$queryRaw`SELECT 1`;

    sendSuccess(res, {
      status: "healthy",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // If the DB is down, still respond (don't crash) but report it
    next(error);
  }
});

export default router;
