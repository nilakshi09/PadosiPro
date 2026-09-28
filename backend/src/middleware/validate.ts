/**
 * validate.ts — Reusable zod validation middleware for Express.
 *
 * WHY: We want to validate request bodies in routes with a one-liner,
 * and automatically convert zod's error format into our standard
 * AppError format with friendly per-field messages.
 *
 * Usage in a route:
 *   router.post("/register", validate(registerSchema), registerHandler);
 */

import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { AppError } from "../utils/AppError";

/**
 * Returns Express middleware that validates req.body against the given
 * zod schema. On failure, throws an AppError with per-field messages.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (result.success) {
      // Replace body with the parsed (and potentially transformed) data
      req.body = result.data;
      next();
      return;
    }

    // Convert zod errors into a flat { fieldName: "message" } object
    const fields = flattenZodErrors(result.error);

    // Pick the first field error as the top-level message for readability
    const firstMessage = Object.values(fields)[0] || "Validation failed";

    next(new AppError(400, "VALIDATION_ERROR", firstMessage, fields));
  };
}

/**
 * Flatten zod's nested error structure into a simple object.
 * Example: { email: "Invalid email format", password: "Too short" }
 */
function flattenZodErrors(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};

  for (const issue of error.issues) {
    // Use the deepest path segment as the field name
    // e.g. path ["body", "email"] → "email"
    const fieldName = issue.path[issue.path.length - 1] || "unknown";
    fields[String(fieldName)] = issue.message;
  }

  return fields;
}
