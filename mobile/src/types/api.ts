/**
 * api.ts – Shared TypeScript types for every API request and response.
 *
 * Keeping all types in one file means screens and API helpers always
 * agree on the shape of data flowing between client and server.
 */

// ── User ────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  isVerified: boolean;
  hasCompletedProfile: boolean;
}

// ── Auth – Success Responses ────────────────────────────────────

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

// ── Error Response ──────────────────────────────────────────────

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

// ── Typed Error Class ───────────────────────────────────────────

/**
 * Custom error class thrown by API functions.
 * Screens can catch this and read `.code`, `.fields`, etc.
 * to show the right UI feedback.
 *
 * Usage:
 *   try { await someApiCall(); }
 *   catch (err) { if (err instanceof ApiError) { use err.code } }
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

// ── Profile ─────────────────────────────────────────────────────

/** PUT /api/profile – request body */
export interface UpdateProfileRequest {
  name: string;
  mobileNumber: string;
  address: string;
  businessName?: string;
}

/** The profile object returned by the backend */
export interface Profile {
  name: string;
  mobileNumber: string;
  address: string;
  businessName?: string;
}

/** GET /api/profile and PUT /api/profile – response wrapper */
export interface ProfileResponse {
  success: boolean;
  data: Profile;
}

// ── Tasks ───────────────────────────────────────────────────────

/** A single task within a category */
export interface Task {
  id: string;
  name: string;
  description: string;
}

/** A group of tasks under one category heading */
export interface TaskCategory {
  category: string;
  tasks: Task[];
}

/** GET /api/tasks – response wrapper */
export interface TasksResponse {
  success: boolean;
  data: {
    categories: TaskCategory[];
  };
}

/** PUT /api/tasks/selection – request body */
export interface UpdateSelectionRequest {
  taskIds: string[];
}

/** GET /api/tasks/selection and PUT /api/tasks/selection – response */
export interface SelectionResponse {
  success: boolean;
  data: {
    tasks: Task[];
  };
}
