/**
 * authValidators.ts – Zod schemas for auth-related requests.
 *
 * WHY: Centralising validation schemas here keeps them reusable
 * and testable. The validate() middleware in middleware/validate.ts
 * runs these before the route handler, so the handler always
 * receives clean, typed data.
 */

import { z } from "zod";

/**
 * Password must be at least 8 characters and contain at least
 * one letter and one number.
 */
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-zA-Z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number");

/**
 * POST /api/auth/register request body
 *
 * - email:           valid email format, trimmed and lowercased
 * - password:        ≥ 8 chars, ≥ 1 letter, ≥ 1 number
 * - confirmPassword: must match password
 */
export const registerSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Invalid email format"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"], // attach error to the confirmPassword field
  });

/** Inferred TypeScript type from the register schema */
export type RegisterInput = z.infer<typeof registerSchema>;

/* ── OTP Schemas ──────────────────────────────────────────────── */

/**
 * POST /api/auth/send-otp request body
 * Only needs the email — we look up the user server-side.
 */
export const sendOtpSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email format"),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;

/**
 * POST /api/auth/verify-otp request body
 * Email + the 6-digit code the user received.
 */
export const verifyOtpSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email format"),
  code: z
    .string()
    .length(6, "Code must be exactly 6 digits")
    .regex(/^\d{6}$/, "Code must be exactly 6 digits"),
});

export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

/* ── Login Schema ────────────────────────────────────────────── */

/**
 * POST /api/auth/login request body
 * Email + password — no confirmPassword needed for login.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;
