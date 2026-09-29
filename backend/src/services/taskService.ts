/**
 * taskService.ts — Business logic for the task catalogue and user task selection.
 *
 * WHY: Keeps route handlers thin. Task listing, searching, and
 * selection replacement all live here. Each function either returns
 * data or throws an AppError for the global error handler.
 */

import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";

// ── Types ───────────────────────────────────────────────────────

/** Shape of a single task returned to the client */
interface TaskItem {
  id: string;
  name: string;
  description: string;
}

/** Tasks grouped by category — the shape GET /api/tasks returns */
interface CategoryGroup {
  category: string;
  tasks: TaskItem[];
}

/** A selected task includes the category as well */
interface SelectedTask {
  id: string;
  name: string;
  category: string;
  description: string;
}

// ── Get All Tasks (grouped by category) ─────────────────────────

/**
 * Fetch all tasks from the catalogue, optionally filtered by a
 * search query (case-insensitive match on name or description).
 * Results are grouped by category.
 *
 * @param search - Optional search string to filter tasks
 * @returns      Categories array with their tasks
 */
export async function getAllTasksGrouped(search?: string): Promise<{ categories: CategoryGroup[] }> {
  // Build the where clause — only add filters if search is provided
  const whereClause = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  // Fetch tasks ordered by category then name for predictable grouping
  const tasks = await prisma.task.findMany({
    where: whereClause,
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  // Group tasks by category using a Map (preserves insertion order)
  const categoryMap = new Map<string, TaskItem[]>();

  for (const task of tasks) {
    const group = categoryMap.get(task.category) || [];
    group.push({
      id: task.id,
      name: task.name,
      description: task.description,
    });
    categoryMap.set(task.category, group);
  }

  // Convert Map to array of CategoryGroup objects
  const categories: CategoryGroup[] = [];
  for (const [category, categoryTasks] of categoryMap) {
    categories.push({ category, tasks: categoryTasks });
  }

  return { categories };
}

// ── Replace Task Selection ──────────────────────────────────────

/**
 * Replace the user's entire task selection with the given task IDs.
 * Uses a transaction: delete all old UserTask rows, insert new ones.
 *
 * @param userId  - The authenticated user's ID
 * @param taskIds - Array of task UUIDs the user wants to select
 * @returns       The full list of currently selected tasks
 * @throws        AppError if any task IDs don't exist
 */
export async function replaceTaskSelection(
  userId: string,
  taskIds: string[],
): Promise<SelectedTask[]> {
  // 1. Validate that all task IDs exist in the catalogue
  const existingTasks = await prisma.task.findMany({
    where: { id: { in: taskIds } },
    select: { id: true },
  });

  const existingIds = new Set(existingTasks.map((t) => t.id));
  const invalidIds = taskIds.filter((id) => !existingIds.has(id));

  if (invalidIds.length > 0) {
    throw new AppError(
      400,
      "INVALID_TASK_IDS",
      `The following task IDs do not exist: ${invalidIds.join(", ")}`,
    );
  }

  // 2. Replace selection in a transaction (delete old → insert new)
  await prisma.$transaction(async (tx) => {
    // Delete all existing selections for this user
    await tx.userTask.deleteMany({
      where: { userId },
    });

    // Insert new selections (skip if taskIds is empty — that's a valid "clear all")
    if (taskIds.length > 0) {
      await tx.userTask.createMany({
        data: taskIds.map((taskId) => ({
          userId,
          taskId,
        })),
      });
    }
  });

  // 3. Return the full list of selected tasks (with details)
  return getSelectedTasks(userId);
}

// ── Get Selected Tasks ──────────────────────────────────────────

/**
 * Fetch the user's currently selected tasks with full details.
 *
 * @param userId - The authenticated user's ID
 * @returns      Array of selected tasks with name, category, description
 */
export async function getSelectedTasks(userId: string): Promise<SelectedTask[]> {
  const userTasks = await prisma.userTask.findMany({
    where: { userId },
    include: {
      task: {
        select: {
          id: true,
          name: true,
          category: true,
          description: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Flatten: extract the nested task object
  return userTasks.map((ut) => ({
    id: ut.task.id,
    name: ut.task.name,
    category: ut.task.category,
    description: ut.task.description,
  }));
}
