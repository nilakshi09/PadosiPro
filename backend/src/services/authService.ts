/**
 * authService.ts — Business logic for authentication.
 *
 * WHY: Keeps route handlers thin by encapsulating all auth logic here.
 * Each public function either returns a result or throws an AppError
 * that the global error handler converts into the standard envelope.
 */

import bcrypt from "bcryptjs";
import { generateToken } from "../utils/jwt";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";

/** Number of bcrypt salt rounds — 12 is a good balance of security and speed */
const SALT_ROUNDS = 12;

/* ── Register ────────────────────────────────────────────────────── */

/**
 * Checks for duplicate email, hashes the password, and creates
 * a new unverified user.
 *
 * NOTE: Validation is already handled by the validate() middleware
 * before this function is called, so `data` is guaranteed to be clean.
 *
 * @param data  Pre-validated register input (email, password)
 * @returns     { userId, email } on success
 * @throws      AppError(409) on duplicate email
 */
export async function registerUser(data: { email: string; password: string }) {
  const { email, password } = data;

  // 1. Check if the email is already taken (case-insensitive —
  //    email is lowercased by the Zod schema, and stored lowercase)
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    // Neutral message: don't reveal whether the account is verified
    // to avoid user-enumeration attacks beyond existence
    throw new AppError(
      409,
      "EMAIL_ALREADY_EXISTS",
      "An account with this email already exists.",
    );
  }

  // 2. Hash the password — NEVER store or log the plain password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // 3. Create the user with isVerified = false
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      isVerified: false,
    },
  });

  // 4. Return only safe, non-sensitive data (never the password hash)
  return {
    userId: user.id,
    email: user.email,
  };
}

/* ── Login ─────────────────────────────────────────────────────── */

/**
 * Authenticate an existing, verified user and issue a JWT.
 *
 * Steps:
 *  1. Look up by email
 *  2. Confirm the account is email-verified
 *  3. Compare passwords with bcrypt
 *  4. Issue a signed JWT
 *
 * @param data  Pre-validated login input (email, password)
 * @returns     { token, user: { id, email } }
 * @throws      AppError on not-found / not-verified / wrong-password
 */
export async function loginUser(data: { email: string; password: string }) {
  const { email, password } = data;

  // 1. Look up the user
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }

  // 2. Must be verified to log in
  if (!user.isVerified) {
    throw new AppError(403, "EMAIL_NOT_VERIFIED", "Please verify your email before logging in.");
  }

  // 3. Compare plaintext password with stored bcrypt hash
  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    // Same generic message as "user not found" to prevent user enumeration
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }

  // 4. Issue a JWT — contains only userId and email
  const token = generateToken({ userId: user.id, email: user.email });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
    },
  };
}
