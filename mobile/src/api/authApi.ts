/**
 * Auth API — typed functions for all authentication endpoints.
 *
 * Each function:
 *  1. Calls the backend via our configured axios `apiClient`
 *  2. Returns the typed success response
 *  3. Throws an `ApiError` with code/message/fields on failure
 *
 * This means screens can do:
 *   try { const res = await register(...); }
 *   catch (err) { if (err instanceof ApiError) { // use err.code } }
 */

import apiClient from './client';
import {
  ApiError,
  type RegisterResponse,
  type SendOtpResponse,
  type VerifyOtpResponse,
  type LoginResponse,
  type ApiErrorResponse,
} from '../types/api';
import type { AxiosError } from 'axios';

// ─── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Extracts the typed error from an axios error response and throws an ApiError.
 * If the response doesn't match our error shape (network failure, timeout, etc.),
 * throws a generic ApiError with code 'NETWORK_ERROR'.
 */
function handleApiError(error: unknown): never {
  // Axios errors have a `.response` property with the backend's JSON body
  const axiosError = error as AxiosError<ApiErrorResponse>;

  // Log every failure so it's visible in the Metro/Expo terminal.
  console.warn('[authApi] Request failed:', axiosError.message, axiosError.code);

  if (axiosError.response?.data?.error) {
    // Backend returned a structured error — use it directly
    throw new ApiError(axiosError.response.data.error);
  }

  // Timeout / abort (from our AbortController hard timeout or axios timeout)
  if (axiosError.code === 'ERR_CANCELED' || axiosError.code === 'ECONNABORTED') {
    throw new ApiError({
      code: 'TIMEOUT',
      message:
        'The request timed out — the server took too long to respond. ' +
        'Make sure your backend is running and your device is on the same Wi-Fi network.',
    });
  }

  // Network failure or unexpected shape
  throw new ApiError({
    code: 'NETWORK_ERROR',
    message: axiosError.message || 'Unable to reach the server. Check your connection and try again.',
  });
}

// ─── Auth Functions ─────────────────────────────────────────────────────────────

/**
 * Register a new account.
 *
 * POST /api/auth/register
 * Body: { email, password, confirmPassword }
 * Returns: { userId, email, message }
 * Error codes: VALIDATION_ERROR (with fields), EMAIL_ALREADY_EXISTS
 */
export async function register(
  email: string,
  password: string,
  confirmPassword: string,
): Promise<RegisterResponse> {
  try {
    const { data } = await apiClient.post<RegisterResponse>('/auth/register', {
      email,
      password,
      confirmPassword,
    });
    return data;
  } catch (error) {
    handleApiError(error);
  }
}

/**
 * Request an OTP email for verification.
 *
 * POST /api/auth/send-otp
 * Body: { email }
 * Returns: { message, expiresInMinutes }
 * Error codes: USER_NOT_FOUND, ALREADY_VERIFIED, OTP_COOLDOWN_ACTIVE (with secondsRemaining)
 */
export async function sendOtp(email: string): Promise<SendOtpResponse> {
  try {
    const { data } = await apiClient.post<SendOtpResponse>('/auth/send-otp', {
      email,
    });
    return data;
  } catch (error) {
    handleApiError(error);
  }
}

/**
 * Verify the 6-digit OTP code.
 *
 * POST /api/auth/verify-otp
 * Body: { email, code }
 * Returns: { message }
 * Error codes: OTP_EXPIRED, OTP_INVALID (with attemptsRemaining), OTP_MAX_ATTEMPTS_EXCEEDED
 */
export async function verifyOtp(
  email: string,
  code: string,
): Promise<VerifyOtpResponse> {
  try {
    const { data } = await apiClient.post<VerifyOtpResponse>('/auth/verify-otp', {
      email,
      code,
    });
    return data;
  } catch (error) {
    handleApiError(error);
  }
}

/**
 * Log in with email and password.
 *
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: { token, user }
 * Error codes: INVALID_CREDENTIALS, EMAIL_NOT_VERIFIED
 */
export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  try {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', {
      email,
      password,
    });
    return data;
  } catch (error) {
    handleApiError(error);
  }
}
