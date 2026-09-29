/**
 * taskValidators.ts — Zod schemas for task-related requests.
 *
 * WHY: Keeps validation logic separate from route handlers.
 * The validate() middleware runs these before the handler so
 * the handler always receives clean, typed data.
 */

import { z } from "zod";

/**
 * PUT /api/tasks/selection request body.
 *
 * taskIds: array of UUIDs — each must be a valid UUID v4 format.
 * Can be empty (clears the selection).
 */
export const taskSelectionSchema = z.object({
  taskIds: z
    .array(
      z.string().uuid("Each task ID must be a valid UUID"),
    )
    .default([]),
});

export type TaskSelectionInput = z.infer<typeof taskSelectionSchema>;
