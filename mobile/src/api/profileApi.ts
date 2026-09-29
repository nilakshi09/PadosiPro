/**
 * profileApi.ts – Typed wrappers around the profile endpoints.
 *
 * Follows the same pattern as authApi.ts:
 *  1. Calls the backend via our shared Axios client
 *  2. Returns only the typed success response data
 *  3. Throws an ApiError on failure (screens catch and inspect err.code)
 */

import apiClient from './client';
import {
  ApiError,
  type ProfileResponse,
  type UpdateProfileRequest,
  type ApiErrorResponse,
} from '../types/api';
import type { AxiosError } from 'axios';

/**
 * Reuses the same error extraction pattern from authApi.
 * Converts axios errors into our typed ApiError class.
 */
function handleApiError(error: unknown): never {
  const axiosError = error as AxiosError<ApiErrorResponse>;

  // Log every failure so it's visible in the Metro/Expo terminal.
  // This prevents the "no error shows up anywhere" debugging trap.
  console.warn('[profileApi] Request failed:', axiosError.message, axiosError.code);

  // ── Structured backend error (validation, auth, etc.) ──
  if (axiosError.response?.data?.error) {
    throw new ApiError(axiosError.response.data.error);
  }

  // ── Timeout / abort (from our AbortController hard timeout) ──
  // Axios wraps AbortController aborts as code ERR_CANCELED.
  // The built-in `timeout` option uses code ECONNABORTED.
  if (axiosError.code === 'ERR_CANCELED' || axiosError.code === 'ECONNABORTED') {
    throw new ApiError({
      code: 'TIMEOUT',
      message:
        'The request timed out — the server took too long to respond. ' +
        'Make sure your backend is running and your device is on the same Wi-Fi network.',
    });
  }

  throw new ApiError({
    code: 'NETWORK_ERROR',
    message:
      axiosError.message ||
      'Unable to reach the server. Check your connection and try again.',
  });
}

/**
 * PUT /api/profile
 *
 * Creates or updates the user's profile.
 * The Bearer token is attached automatically by the client interceptor.
 *
 * Error codes: VALIDATION_ERROR (with fields), UNAUTHORIZED
 */
export async function updateProfile(
  data: UpdateProfileRequest,
): Promise<ProfileResponse> {
  try {
    const res = await apiClient.put<ProfileResponse>('/profile', data);
    return res.data;
  } catch (error) {
    handleApiError(error);
  }
}

/**
 * GET /api/profile
 *
 * Fetches the current user's profile.
 * Returns null if the user has no profile yet (404).
 * This way callers can distinguish "no profile" from real errors
 * without try/catch.
 */
export async function getProfile(): Promise<ProfileResponse | null> {
  try {
    const res = await apiClient.get<ProfileResponse>('/profile');
    return res.data;
  } catch (error) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    // 404 means no profile exists yet — that's expected for new users
    if (axiosError.response?.status === 404) {
      return null;
    }
    handleApiError(error);
  }
}
