/**
 * tasksApi.ts – Typed wrappers around the task endpoints.
 *
 * Follows the same pattern as authApi.ts:
 *  1. Calls the backend via our shared Axios client
 *  2. Returns only the typed success response data
 *  3. Throws an ApiError on failure (screens catch and inspect err.code)
 */

import apiClient from './client';
import {
  ApiError,
  type TasksResponse,
  type SelectionResponse,
  type ApiErrorResponse,
} from '../types/api';
import type { AxiosError } from 'axios';

/**
 * Reuses the same error extraction pattern from authApi.
 */
function handleApiError(error: unknown): never {
  const axiosError = error as AxiosError<ApiErrorResponse>;

  if (axiosError.response?.data?.error) {
    throw new ApiError(axiosError.response.data.error);
  }

  throw new ApiError({
    code: 'NETWORK_ERROR',
    message:
      axiosError.message ||
      'Unable to reach the server. Check your connection and try again.',
  });
}

/**
 * GET /api/tasks
 *
 * Fetches all available tasks, grouped by category.
 * Optionally pass a search string to filter results server-side.
 *
 * We use server-side search (via ?search= query param) rather than
 * client-side filtering because:
 *  • The backend may have many tasks — filtering on the server avoids
 *    downloading the entire catalog on every keystroke.
 *  • The backend can search across category names, task names, AND
 *    descriptions in ways we'd have to duplicate client-side.
 *  • Tradeoff: one API call per search query, but we debounce at 300ms
 *    in the UI so the load is minimal.
 */
export async function getTasks(search?: string): Promise<TasksResponse> {
  try {
    const params = search ? { search } : undefined;
    const res = await apiClient.get<TasksResponse>('/tasks', { params });
    return res.data;
  } catch (error) {
    handleApiError(error);
  }
}

/**
 * GET /api/tasks/selection
 *
 * Fetches the current user's saved task selection.
 */
export async function getSelection(): Promise<SelectionResponse> {
  try {
    const res = await apiClient.get<SelectionResponse>('/tasks/selection');
    return res.data;
  } catch (error) {
    handleApiError(error);
  }
}

/**
 * PUT /api/tasks/selection
 *
 * Saves the user's chosen task IDs.
 * Replaces the entire selection (not a partial update).
 */
export async function updateSelection(
  taskIds: string[],
): Promise<SelectionResponse> {
  try {
    const res = await apiClient.put<SelectionResponse>('/tasks/selection', {
      taskIds,
    });
    return res.data;
  } catch (error) {
    handleApiError(error);
  }
}
