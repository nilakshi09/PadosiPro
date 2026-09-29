/**
 * profileRoutes.ts — Profile endpoints.
 *
 * WHY: Thin route layer for profile management.
 * All routes are PROTECTED (require valid JWT + verified email).
 *
 * Routes:
 *   GET  /api/profile  — Get the current user's profile
 *   PUT  /api/profile  — Update the current user's profile
 */

import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware, requireVerified } from "../middleware/authMiddleware";
import { validate } from "../middleware/validate";
import { updateProfileSchema } from "../validators/profileValidators";
import { getProfile, updateProfile } from "../services/profileService";
import { sendSuccess } from "../utils/response";

const router = Router();

// All profile routes require authentication + verified email
router.use(authMiddleware, requireVerified);

/**
 * GET /api/profile
 *
 * Returns the current user's profile fields.
 * Success: 200 { success: true, data: { id, email, name, ... } }
 */
router.get(
  "/",
  (req: Request, res: Response) => {
    const profile = getProfile(req.user!);
    sendSuccess(res, profile);
  },
);

/**
 * PUT /api/profile
 *
 * Updates the current user's profile.
 * Request body: { name, mobileNumber, address, businessName? }
 * Success: 200 { success: true, data: { id, email, name, ... } }
 */
router.put(
  "/",
  validate(updateProfileSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await updateProfile(req.user!.id, req.body);
      sendSuccess(res, profile);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
