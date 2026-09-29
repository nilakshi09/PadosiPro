/**
 * otpService.ts — Business logic for OTP generation and verification.
 *
 * WHY: All OTP logic is centralised here so routes stay thin.
 * This service handles code generation, hashing, rate-limiting,
 * expiry, and verification — always through the database.
 *
 * ── Why SHA-256 instead of bcrypt for the OTP hash? ──────────────
 * A 6-digit OTP has only 1 000 000 possible values. Bcrypt's slow
 * hashing does NOT help here — an attacker who steals the DB can
 * brute-force all 1 000 000 values in minutes even with bcrypt.
 * Real security comes from server-side attempt limits + short TTL.
 * SHA-256 is fast (good for server performance), deterministic
 * (easy to compare), and perfectly fine when combined with our
 * max-attempt and expiry guards.
 */

import crypto from "crypto";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";
import { sendOtpEmail } from "./mailService";

// ── Helpers ──────────────────────────────────────────────────────

/**
 * Generate a cryptographically secure 6-digit numeric code.
 * Uses crypto.randomInt which is CSPRNG-backed — never Math.random().
 */
function generateOtpCode(): string {
  // randomInt(min, max) is exclusive on max, so (100000, 1000000) → 6 digits
  return crypto.randomInt(100_000, 1_000_000).toString();
}

/**
 * Hash a plaintext code with SHA-256.
 * Deterministic so we can look it up / compare later.
 */
function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

// ── Send OTP ─────────────────────────────────────────────────────

/**
 * Generate and send a new OTP to the given email address.
 *
 * Rules:
 * - Only for existing, unverified users
 * - Enforces a cooldown between resends
 * - Invalidates (soft) any previous unconsumed OTP by creating a new one
 *   (we always fetch "latest unconsumed", so old ones are naturally ignored)
 *
 * @param email - The user's email address (already lowercased by validator)
 * @returns     { message, expiresInMinutes }
 * @throws      AppError on user-not-found, already-verified, or cooldown
 */
export async function sendOtp(email: string) {
  // 1. Look up the user
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    // ── Security note ──────────────────────────────────────────
    // We return a generic error here. In a public-facing signup flow
    // you'd want to say "If this email is registered, you'll receive
    // a code" to avoid user-enumeration. However, our send-otp is
    // only called right after registration (the mobile app knows
    // the user exists), so a clear USER_NOT_FOUND is more helpful
    // for debugging and doesn't leak extra info the attacker doesn't
    // already have (they just registered the account themselves).
    throw new AppError(404, "USER_NOT_FOUND", "No account found for this email.");
  }

  // 2. Already verified? No need for another OTP
  if (user.isVerified) {
    throw new AppError(400, "ALREADY_VERIFIED", "This email is already verified.");
  }

  // 3. Cooldown check — find the most recent OTP for this user
  const latestOtp = await prisma.otp.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  if (latestOtp) {
    const secondsSinceLastOtp =
      (Date.now() - latestOtp.createdAt.getTime()) / 1000;

    if (secondsSinceLastOtp < env.OTP_RESEND_COOLDOWN_SECONDS) {
      const remaining = Math.ceil(
        env.OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLastOtp
      );
      throw new AppError(
        429,
        "OTP_COOLDOWN_ACTIVE",
        `Please wait ${remaining} seconds before requesting a new code.`,
        // Stash remaining seconds so the mobile app can show a countdown
        { remainingSeconds: String(remaining) }
      );
    }
  }

  // 4. Generate & hash the code
  const plainCode = generateOtpCode();
  const codeHash = hashCode(plainCode);

  // 5. Store the new OTP (old unconsumed ones are ignored — we always
  //    query "latest unconsumed" in verifyOtp, so they naturally expire)
  await prisma.otp.create({
    data: {
      userId: user.id,
      codeHash,
      expiresAt: new Date(Date.now() + env.OTP_TTL_MINUTES * 60 * 1000),
    },
  });

  // 6. Send the email — the ONLY place the plain code ever appears
  await sendOtpEmail(user.email, plainCode);

  return {
    message: "OTP sent",
    expiresInMinutes: env.OTP_TTL_MINUTES,
  };
}

// ── Verify OTP ───────────────────────────────────────────────────

/**
 * Verify a submitted OTP code against the latest unconsumed OTP.
 *
 * Rules:
 * - Must be an existing, unverified user
 * - Must have a valid (non-expired, non-consumed) OTP
 * - Must not have exceeded max attempts
 * - Attempt incrementing is done inside a transaction to prevent races
 * - On success: mark OTP consumed + set user.isVerified = true
 *
 * @param email - The user's email address
 * @param code  - The 6-digit code they submitted
 * @returns     { message: "Email verified" }
 * @throws      AppError on every failure scenario
 */
export async function verifyOtp(email: string, code: string) {
  // 1. Look up the user
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "No account found for this email.");
  }

  if (user.isVerified) {
    throw new AppError(400, "ALREADY_VERIFIED", "This email is already verified.");
  }

  // 2. Find the latest unconsumed OTP for this user
  const otp = await prisma.otp.findFirst({
    where: {
      userId: user.id,
      consumedAt: null, // not yet used
    },
    orderBy: { createdAt: "desc" },
  });

  // 3. No OTP exists or it's expired
  if (!otp || otp.expiresAt < new Date()) {
    throw new AppError(
      400,
      "OTP_EXPIRED",
      "Your verification code has expired. Please request a new one."
    );
  }

  // 4. Check max attempts BEFORE comparing the code
  if (otp.attemptsUsed >= env.OTP_MAX_ATTEMPTS) {
    throw new AppError(
      400,
      "OTP_MAX_ATTEMPTS_EXCEEDED",
      "Too many failed attempts. Please request a new verification code."
    );
  }

  // 5. Compare hashes
  const submittedHash = hashCode(code);

  if (submittedHash !== otp.codeHash) {
    // Wrong code → increment attempts inside a transaction to prevent races.
    // Two rapid requests could both read attemptsUsed=4, both pass the check,
    // and both increment to 5 — that's fine (they still get blocked next time).
    // But we use a transaction to make the read-then-write atomic.
    const updatedOtp = await prisma.$transaction(async (tx) => {
      // Re-read inside the transaction for safety
      const freshOtp = await tx.otp.findUniqueOrThrow({
        where: { id: otp.id },
      });

      return tx.otp.update({
        where: { id: freshOtp.id },
        data: { attemptsUsed: freshOtp.attemptsUsed + 1 },
      });
    });

    const attemptsRemaining = env.OTP_MAX_ATTEMPTS - updatedOtp.attemptsUsed;

    throw new AppError(
      400,
      "OTP_INVALID",
      `Incorrect code. ${attemptsRemaining} attempt(s) remaining.`,
      { attemptsRemaining: String(attemptsRemaining) }
    );
  }

  // 6. Correct code! Mark OTP as consumed AND verify the user — atomically
  await prisma.$transaction([
    prisma.otp.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true },
    }),
  ]);

  return { message: "Email verified" };
}
