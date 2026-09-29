/**
 * profileValidators.ts — Zod schemas for profile-related requests.
 *
 * WHY: Keeps validation logic separate from route handlers.
 * Mobile number normalization happens right here in the schema
 * (strip +91 prefix, store as plain 10 digits).
 */

import { z } from "zod";

/**
 * Indian mobile number validation.
 *
 * Accepts:
 *  - 10-digit number starting with 6-9      (e.g. "9876543210")
 *  - +91 prefix followed by 10 digits       (e.g. "+919876543210")
 *  - 91 prefix followed by 10 digits        (e.g. "919876543210")
 *
 * Always strips the prefix and stores as plain 10 digits.
 */
const indianMobileSchema = z
  .string()
  .trim()
  .transform((val) => {
    // Strip optional +91 or 91 prefix
    if (val.startsWith("+91")) return val.slice(3);
    if (val.startsWith("91") && val.length === 12) return val.slice(2);
    return val;
  })
  .pipe(
    z
      .string()
      .length(10, "Mobile number must be exactly 10 digits")
      .regex(/^[6-9]\d{9}$/, "Must be a valid Indian mobile number (starts with 6-9)")
  );

/**
 * PUT /api/profile request body.
 *
 * Required: name (min 2 chars), mobileNumber (valid Indian mobile), address (min 5 chars).
 * Optional: businessName (free text).
 */
export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters"),
  mobileNumber: indianMobileSchema,
  address: z
    .string()
    .trim()
    .min(5, "Address must be at least 5 characters"),
  businessName: z
    .string()
    .trim()
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
