/**
 * response.ts — Helper to send consistent success responses.
 *
 * WHY: Every successful response should have the same shape
 * so the mobile client always knows what to expect.
 */

import { Response } from "express";

/**
 * Send a success response with the standard shape:
 * { "success": true, "data": ... }
 */
export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  res.status(statusCode).json({
    success: true,
    data,
  });
}
