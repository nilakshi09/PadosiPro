/**
 * authMiddleware.ts — Protect routes by requiring a valid JWT.
 *
 * HOW IT WORKS:
 * 1. Reads the Authorization header ("Bearer <token>")
 * 2. Verifies the token signature + expiry
 * 3. Loads the user from the DB (tokens outlive deleted accounts otherwise)
 * 4. Attaches a safe user object (no password hash) to `req.user`
 *
 * Also exports `requireVerified` — a second middleware that checks
 * `req.user.isVerified` and rejects unverified users. Use it after
 * authMiddleware on routes that need a fully verified account.
 */

import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/AppError";

// ── Extend Express Request to carry the authenticated user ──────

/**
 * Shape of the user object we attach to req.user (everything except
 * the password hash — that must NEVER leave the service layer).
 */
export interface AuthUser {
  id: string;
  email: string;
  isVerified: boolean;
  name: string | null;
  mobileNumber: string | null;
  address: string | null;
  businessName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Augment Express's Request type so TypeScript knows about req.user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// ── Auth middleware — validates JWT and loads user ───────────────

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // 1. Extract the token from "Bearer <token>"
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new AppError(401, "UNAUTHORIZED", "Missing or invalid token");
    }
    const token = authHeader.split(" ")[1];

    // 2. Verify signature + expiry
    const payload = verifyToken(token);
    if (!payload) {
      throw new AppError(401, "UNAUTHORIZED", "Invalid or expired token");
    }

    // 3. Load user from DB — ensures the account still exists
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });
    if (!user) {
      throw new AppError(401, "UNAUTHORIZED", "User no longer exists");
    }

    // 4. Attach user (minus password hash) to the request
    const { passwordHash: _, ...safeUser } = user;
    req.user = safeUser;

    next();
  } catch (err) {
    // If it's already an AppError, forward it; otherwise wrap it
    if (err instanceof AppError) {
      next(err);
    } else {
      next(new AppError(401, "UNAUTHORIZED", "Authentication failed"));
    }
  }
}

// ── Verified-user middleware — rejects unverified accounts ──────

/**
 * Must be used AFTER authMiddleware (it reads req.user).
 * Returns 403 EMAIL_NOT_VERIFIED if the user hasn't completed
 * email verification yet.
 */
export function requireVerified(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.user?.isVerified) {
    next(
      new AppError(
        403,
        "EMAIL_NOT_VERIFIED",
        "Please verify your email before accessing this resource.",
      ),
    );
    return;
  }
  next();
}
