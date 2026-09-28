/**
 * notFoundHandler.ts — Catch-all for undefined routes.
 *
 * WHY: Instead of Express's default HTML 404, return our
 * standard JSON error shape so the mobile client can handle it.
 */

import { Request, Response } from "express";

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Route ${_req.method} ${_req.originalUrl} not found`,
    },
  });
}
