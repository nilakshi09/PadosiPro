/**
 * profileService.ts — Business logic for user profile management.
 *
 * WHY: Keeps route handlers thin. Profile update and retrieval
 * logic lives here. Every function either returns data or throws
 * an AppError for the global error handler.
 */

import { prisma } from "../config/prisma";

// ── Types ───────────────────────────────────────────────────────

/** The profile fields we return to the client (never the password hash) */
export interface ProfileData {
  id: string;
  email: string;
  name: string | null;
  mobileNumber: string | null;
  address: string | null;
  businessName: string | null;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Get Profile ─────────────────────────────────────────────────

/**
 * Returns the profile of the currently authenticated user.
 * The user is already loaded by authMiddleware, but we read from
 * the request user object rather than making another DB call.
 */
export function getProfile(user: ProfileData): ProfileData {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    mobileNumber: user.mobileNumber,
    address: user.address,
    businessName: user.businessName,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// ── Update Profile ──────────────────────────────────────────────

/**
 * Update the user's profile fields.
 *
 * @param userId - The authenticated user's ID
 * @param data   - Pre-validated profile input (name, mobileNumber, address, businessName?)
 * @returns      The updated profile fields
 */
export async function updateProfile(
  userId: string,
  data: {
    name: string;
    mobileNumber: string;
    address: string;
    businessName?: string;
  },
): Promise<ProfileData> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      mobileNumber: data.mobileNumber,
      address: data.address,
      businessName: data.businessName ?? null,
    },
  });

  // Return safe fields only — never the password hash
  const { passwordHash: _, ...safeUser } = user;
  return safeUser;
}
