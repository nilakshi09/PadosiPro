/**
 * jwt.ts — JSON Web Token helpers for signing and verifying tokens.
 *
 * WHY: Centralises all JWT logic so the rest of the app never
 * touches the jsonwebtoken library directly. If we ever switch
 * to a different signing algorithm or library, only this file changes.
 */

import jwt from "jsonwebtoken";
import { env } from "../config/env";

// ── Payload shape embedded in every JWT ─────────────────────────

/** The data we store inside the token — just enough to identify the user */
export interface JwtPayload {
  userId: string;
  email: string;
}

// ── Sign ────────────────────────────────────────────────────────

/**
 * Create a signed JWT containing the user's id and email.
 * The token expires according to JWT_EXPIRES_IN (default "7d").
 */
export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as string | number,
  } as jwt.SignOptions);
}

// ── Verify ──────────────────────────────────────────────────────

/**
 * Verify a JWT and return the decoded payload.
 * Returns null if the token is expired, malformed, or has an invalid signature.
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}
