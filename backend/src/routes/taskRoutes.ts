/**
 * taskRoutes.ts — Task catalogue and selection endpoints.
 *
 * WHY: Thin route layer for task browsing and selection.
 * All routes are PROTECTED (require valid JWT + verified email).
 *
 * Routes:
 *   GET  /api/tasks            — Browse all tasks grouped by category
 *   PUT  /api/tasks/selection   — Replace the user's task selection
 *   GET  /api/tasks/selection   — Get the user's current selection
 */

import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware, requireVerified } from "../middleware/authMiddleware";
import { validate } from "../middleware/validate";
import { taskSelectionSchema } from "../validators/taskValidators";
import { getAllTasksGrouped, replaceTaskSelection, getSelectedTasks } from "../services/taskService";
import { sendSuccess } from "../utils/response";

const router = Router();

// All task routes require authentication + verified email
router.use(authMiddleware, requireVerified);

/**
 * GET /api/tasks
 *
 * Returns all tasks grouped by category.
 * Supports optional ?search=query to filter by name/description.
 *
 * Success: 200 {
 *   success: true,
 *   data: {
 *     categories: [
 *       { category: "Home Maintenance", tasks: [ { id, name, description } ] }
 *     ]
 *   }
 * }
 */
router.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract optional search query parameter
      const search = typeof req.query.search === "string"
        ? req.query.search.trim()
        : undefined;

      const result = await getAllTasksGrouped(search || undefined);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * PUT /api/tasks/selection
 *
 * Replaces the user's entire task selection with the given task IDs.
 * Request body: { taskIds: [uuid, uuid, ...] }
 * Success: 200 { success: true, data: { tasks: [ { id, name, category, description } ] } }
 */
router.put(
  "/selection",
  validate(taskSelectionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tasks = await replaceTaskSelection(req.user!.id, req.body.taskIds);
      sendSuccess(res, { tasks });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/tasks/selection
 *
 * Returns the user's currently selected tasks.
 * Success: 200 { success: true, data: { tasks: [ { id, name, category, description } ] } }
 */
router.get(
  "/selection",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tasks = await getSelectedTasks(req.user!.id);
      sendSuccess(res, { tasks });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
