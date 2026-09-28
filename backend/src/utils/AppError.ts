/**
 * AppError — Custom error class for consistent API error responses.
 *
 * WHY: Every error in the app should carry a machine-readable code
 * (for the mobile client to switch on) and a human-readable message
 * (for the user to see). This keeps error handling uniform everywhere.
 */
export class AppError extends Error {
  /** HTTP status code (e.g. 400, 401, 404, 500) */
  public readonly statusCode: number;

  /**
   * Machine-readable error code the client can switch on.
   * Examples: VALIDATION_ERROR, INVALID_CREDENTIALS, OTP_EXPIRED
   */
  public readonly code: string;

  /**
   * Per-field validation errors, only present for VALIDATION_ERROR.
   * Example: { email: "Invalid email format" }
   */
  public readonly fields?: Record<string, string>;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    fields?: Record<string, string>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;

    // Ensure instanceof checks work correctly with TypeScript inheritance
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
