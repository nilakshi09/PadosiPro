/**
 * API Type Definitions — matches the backend contract exactly.
 *
 * Every API response and error shape is defined here so the rest of
 * the app has a single source of truth for backend contracts.
 */

// ─── User ───────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  isVerified: boolean;
  hasCompletedProfile: boolean;
}

// ─── Success Responses ──────────────────────────────────────────────────────────

/** POST /api/auth/register → 201 */
export interface RegisterResponse {
  success: true;
  data: {
    userId: string;
    email: string;
    message: string;
  };
}

/** POST /api/auth/send-otp */
export interface SendOtpResponse {
  success: true;
  data: {
    message: string;
    expiresInMinutes: number;
  };
}

/** POST /api/auth/verify-otp */
export interface VerifyOtpResponse {
  success: true;
  data: {
    message: string;
  };
}

/** POST /api/auth/login */
export interface LoginResponse {
  success: true;
  data: {
    token: string;
    user: User;
  };
}

// ─── Error Response ─────────────────────────────────────────────────────────────

/**
 * Every backend error has this exact shape.
 * `fields` is only present for VALIDATION_ERROR.
 * Some error codes attach extra data (e.g. secondsRemaining, attemptsRemaining).
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    /** Field-level validation errors: { fieldName: "error message" } */
    fields?: Record<string, string>;
    /** Seconds until OTP cooldown expires (OTP_COOLDOWN_ACTIVE) */
    secondsRemaining?: number;
    /** Attempts left before lockout (OTP_INVALID) */
    attemptsRemaining?: number;
  };
}

// ─── Known Error Codes ──────────────────────────────────────────────────────────

export type AuthErrorCode =
  | 'VALIDATION_ERROR'
  | 'EMAIL_ALREADY_EXISTS'
  | 'USER_NOT_FOUND'
  | 'ALREADY_VERIFIED'
  | 'OTP_COOLDOWN_ACTIVE'
  | 'OTP_EXPIRED'
  | 'OTP_INVALID'
  | 'OTP_MAX_ATTEMPTS_EXCEEDED'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_VERIFIED';

// ─── Typed Error Class ──────────────────────────────────────────────────────────

/**
 * Custom error class thrown by authApi functions.
 * Screens can catch this and read `.code`, `.fields`, etc.
 * to show the right UI feedback.
 */
export class ApiError extends Error {
  code: string;
  fields?: Record<string, string>;
  secondsRemaining?: number;
  attemptsRemaining?: number;

  constructor(response: ApiErrorResponse['error']) {
    super(response.message);
    this.name = 'ApiError';
    this.code = response.code;
    this.fields = response.fields;
    this.secondsRemaining = response.secondsRemaining;
    this.attemptsRemaining = response.attemptsRemaining;
  }
}
