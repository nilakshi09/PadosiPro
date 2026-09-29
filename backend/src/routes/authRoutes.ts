/**
 * authRoutes.ts — Auth endpoint wiring.
 *
 * WHY: Thin route layer — receives the request, delegates to the
 * service, and sends the response. All business logic lives in
 * authService.ts / otpService.ts. Validation is handled by the
 * validate() middleware.
 */

import { Router, Request, Response, NextFunction } from "express";
import { validate } from "../middleware/validate";
import { registerSchema, sendOtpSchema, verifyOtpSchema, loginSchema } from "../validators/authValidators";
import { registerUser, loginUser } from "../services/authService";
import { sendOtp, verifyOtp } from "../services/otpService";
import { sendSuccess } from "../utils/response";

const router = Router();

/**
 * POST /api/auth/register
 *
 * Creates a new unverified user account.
 * Request body: { email, password, confirmPassword }
 * Success: 201 { success: true, data: { userId, email, message } }
 */
router.post(
  "/register",
  validate(registerSchema),  // validates body → attaches parsed data
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await registerUser(req.body);

      sendSuccess(res, {
        userId: result.userId,
        email: result.email,
        message: "Registered. Please verify your email.",
      }, 201);
    } catch (err) {
      // Forward to the global error handler
      next(err);
    }
  },
);

/**
 * POST /api/auth/send-otp
 *
 * Sends a 6-digit OTP to the user's email for verification.
 * Request body: { email }
 * Success: 200 { success: true, data: { message, expiresInMinutes } }
 */
router.post(
  "/send-otp",
  validate(sendOtpSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await sendOtp(req.body.email);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/auth/verify-otp
 *
 * Verifies the OTP code and marks the user's email as verified.
 * Request body: { email, code }
 * Success: 200 { success: true, data: { message: "Email verified" } }
 */
router.post(
  "/verify-otp",
  validate(verifyOtpSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await verifyOtp(req.body.email, req.body.code);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/auth/login
 *
 * Authenticates a verified user and returns a JWT.
 * Request body: { email, password }
 * Success: 200 { success: true, data: { token, user: { id, email } } }
 */
router.post(
  "/login",
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await loginUser(req.body);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  },
);

export default router;

