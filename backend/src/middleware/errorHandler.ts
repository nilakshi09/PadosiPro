/**
 * errorHandler.ts — Global Express error-handling middleware.
 *
 * WHY: A single place to catch all errors and format them into
 * the standard JSON shape the client expects. This prevents
 * raw stack traces from leaking to the client.
 *
 * Response shape (always):
 * {
 *   "success": false,
 *   "error": {
 *     "code": "MACHINE_READABLE_CODE",
 *     "message": "Human-readable message",
 *     "fields": { ... }   // only for validation errors
 *   }
 * }
 */

import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";

// Express identifies error middleware by its 4-parameter signature
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // If it's our custom error, use its details
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        // Only include fields if they exist (validation errors)
        ...(err.fields && { fields: err.fields }),
      },
    });
    return;
  }

  // For unexpected errors, log the full details but hide them from the client
  console.error("Unhandled error:", err);

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong. Please try again later.",
    },
  });
}
