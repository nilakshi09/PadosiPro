/**
 * env.ts — Load and validate ALL environment variables at startup.
 *
 * WHY: Fail fast with a clear message if any required env var is missing,
 * rather than crashing later with a cryptic error deep in the code.
 */

import dotenv from "dotenv";
import { z } from "zod";

// Load .env file before validating
dotenv.config();

/**
 * Schema for environment variables.
 * Every env var the app needs is defined here with its type and defaults.
 */
const envSchema = z.object({
  // Server
  PORT: z
    .string()
    .default("3000")
    .transform(Number)
    .pipe(z.number().int().positive()),

  // Database
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid connection URL"),

  // JWT
  JWT_SECRET: z.string().min(8, "JWT_SECRET must be at least 8 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),

  // Email / SMTP
  SMTP_HOST: z.string().min(1, "SMTP_HOST is required"),
  SMTP_PORT: z
    .string()
    .default("1025")
    .transform(Number)
    .pipe(z.number().int().positive()),
  MAIL_FROM: z.string().email("MAIL_FROM must be a valid email"),

  // OTP settings
  OTP_TTL_MINUTES: z
    .string()
    .default("10")
    .transform(Number)
    .pipe(z.number().int().positive()),
  OTP_MAX_ATTEMPTS: z
    .string()
    .default("5")
    .transform(Number)
    .pipe(z.number().int().positive()),
  OTP_RESEND_COOLDOWN_SECONDS: z
    .string()
    .default("30")
    .transform(Number)
    .pipe(z.number().int().positive()),
});

// Validate process.env against the schema
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Print every problem so the developer can fix them all at once
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

/** Typed, validated environment config — import this everywhere. */
export const env = parsed.data;
