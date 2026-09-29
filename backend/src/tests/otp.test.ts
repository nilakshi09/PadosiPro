/**
 * otp.test.ts — Tests for the OTP verification system.
 *
 * WHY: The assignment explicitly requires thorough tests for:
 *   1. OTP generation creates a hashed code (never plaintext) with correct expiry
 *   2. Correct OTP verifies and sets isVerified = true
 *   3. Wrong OTP increments attempts and returns remaining count
 *   4. Exceeding max attempts blocks even correct code
 *   5. Expired OTP is rejected even if code is correct
 *   6. Resend before cooldown is rejected, after cooldown succeeds
 *
 * APPROACH: Integration tests against the real dev Postgres database.
 * We manipulate timestamps directly in the DB to test expiry/cooldown
 * without actually waiting.
 *
 * NOTE: We mock the mailService so tests don't need Mailpit running,
 * and so we can capture the plain OTP code for verification tests.
 */

import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "../config/prisma";

// ── Mock the mail service ────────────────────────────────────────
// We mock sendOtpEmail to:
// (a) avoid needing Mailpit running during tests
// (b) capture the plaintext code so we can verify it in tests
//
// The mock is hoisted above all imports by vitest.

let capturedOtpCode: string | null = null;

vi.mock("../services/mailService", () => ({
  sendOtpEmail: vi.fn(async (_to: string, code: string) => {
    // Capture the code — this is the ONLY place we'd ever see it
    capturedOtpCode = code;
  }),
}));

// ── Helpers ──────────────────────────────────────────────────────

const TEST_EMAIL_PREFIX = "test-otp-";

/** Generate a unique test email to avoid collisions between test files */
function testEmail(): string {
  return `${TEST_EMAIL_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

/** Register a test user and return their email */
async function registerTestUser(email: string): Promise<string> {
  await request(app).post("/api/auth/register").send({
    email,
    password: "SecurePass1",
    confirmPassword: "SecurePass1",
  });
  return email;
}

// ── Cleanup ──────────────────────────────────────────────────────

beforeEach(async () => {
  capturedOtpCode = null;
});

afterAll(async () => {
  // Clean up all test users (and their OTPs via cascade delete)
  await prisma.user.deleteMany({
    where: { email: { contains: TEST_EMAIL_PREFIX } },
  });
  await prisma.$disconnect();
});

// ── Test Suite ───────────────────────────────────────────────────

describe("POST /api/auth/send-otp", () => {
  it("should send an OTP for an unverified user", async () => {
    const email = await registerTestUser(testEmail());

    const res = await request(app)
      .post("/api/auth/send-otp")
      .send({ email });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toBe("OTP sent");
    expect(res.body.data.expiresInMinutes).toBe(10);

    // The plain code should have been captured by our mock
    expect(capturedOtpCode).toBeDefined();
    expect(capturedOtpCode).toMatch(/^\d{6}$/);
  });

  it("should store a HASHED code, never plaintext (Scenario 1)", async () => {
    const email = await registerTestUser(testEmail());

    await request(app)
      .post("/api/auth/send-otp")
      .send({ email });

    // Look up the OTP in the database
    const user = await prisma.user.findUnique({ where: { email } });
    const otp = await prisma.otp.findFirst({
      where: { userId: user!.id },
      orderBy: { createdAt: "desc" },
    });

    expect(otp).toBeDefined();
    // The stored hash must NOT equal the plain code
    expect(otp!.codeHash).not.toBe(capturedOtpCode);
    // It should be a 64-char hex string (SHA-256)
    expect(otp!.codeHash).toMatch(/^[a-f0-9]{64}$/);
    // Expiry should be ~10 minutes from now
    const expectedExpiry = Date.now() + 10 * 60 * 1000;
    expect(otp!.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(otp!.expiresAt.getTime()).toBeLessThanOrEqual(expectedExpiry + 5000);
  });

  it("should reject if user does not exist", async () => {
    const res = await request(app)
      .post("/api/auth/send-otp")
      .send({ email: "nonexistent@example.com" });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("USER_NOT_FOUND");
  });

  it("should reject if user is already verified", async () => {
    const email = await registerTestUser(testEmail());

    // Manually mark as verified
    await prisma.user.update({
      where: { email },
      data: { isVerified: true },
    });

    const res = await request(app)
      .post("/api/auth/send-otp")
      .send({ email });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("ALREADY_VERIFIED");
  });

  it("should reject resend before cooldown expires (Scenario 6a)", async () => {
    const email = await registerTestUser(testEmail());

    // First request — should succeed
    await request(app)
      .post("/api/auth/send-otp")
      .send({ email });

    // Immediate second request — should be blocked by cooldown
    const res = await request(app)
      .post("/api/auth/send-otp")
      .send({ email });

    expect(res.status).toBe(429);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("OTP_COOLDOWN_ACTIVE");
    // Should include remaining seconds info
    expect(res.body.error.message).toMatch(/wait \d+ seconds/);
  });

  it("should allow resend after cooldown expires (Scenario 6b)", async () => {
    const email = await registerTestUser(testEmail());

    // First request
    await request(app)
      .post("/api/auth/send-otp")
      .send({ email });

    // Manipulate the OTP's createdAt to be in the past (beyond cooldown)
    const user = await prisma.user.findUnique({ where: { email } });
    await prisma.otp.updateMany({
      where: { userId: user!.id },
      data: {
        createdAt: new Date(Date.now() - 60 * 1000), // 60 seconds ago (cooldown is 30s)
      },
    });

    // Second request — should now succeed
    const res = await request(app)
      .post("/api/auth/send-otp")
      .send({ email });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toBe("OTP sent");
  });
});

describe("POST /api/auth/verify-otp", () => {
  it("should verify correct OTP and set isVerified = true (Scenario 2)", async () => {
    const email = await registerTestUser(testEmail());

    // Send OTP
    await request(app)
      .post("/api/auth/send-otp")
      .send({ email });

    const code = capturedOtpCode!;

    // Verify with the correct code
    const res = await request(app)
      .post("/api/auth/verify-otp")
      .send({ email, code });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toBe("Email verified");

    // Confirm user is now verified in the database
    const user = await prisma.user.findUnique({ where: { email } });
    expect(user!.isVerified).toBe(true);

    // Confirm OTP is marked as consumed
    const otp = await prisma.otp.findFirst({
      where: { userId: user!.id },
      orderBy: { createdAt: "desc" },
    });
    expect(otp!.consumedAt).not.toBeNull();
  });

  it("should reject wrong OTP and return remaining attempts (Scenario 3)", async () => {
    const email = await registerTestUser(testEmail());

    await request(app)
      .post("/api/auth/send-otp")
      .send({ email });

    // Submit a wrong code
    const res = await request(app)
      .post("/api/auth/verify-otp")
      .send({ email, code: "000000" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("OTP_INVALID");
    expect(res.body.error.message).toContain("attempt(s) remaining");

    // Confirm attempts were incremented
    const user = await prisma.user.findUnique({ where: { email } });
    const otp = await prisma.otp.findFirst({
      where: { userId: user!.id },
      orderBy: { createdAt: "desc" },
    });
    expect(otp!.attemptsUsed).toBe(1);
  });

  it("should block after max attempts even with correct code (Scenario 4)", async () => {
    const email = await registerTestUser(testEmail());

    await request(app)
      .post("/api/auth/send-otp")
      .send({ email });

    const correctCode = capturedOtpCode!;

    // Exhaust all attempts by setting attemptsUsed directly
    const user = await prisma.user.findUnique({ where: { email } });
    await prisma.otp.updateMany({
      where: { userId: user!.id },
      data: { attemptsUsed: 5 }, // OTP_MAX_ATTEMPTS = 5
    });

    // Now try with the CORRECT code — should still be rejected
    const res = await request(app)
      .post("/api/auth/verify-otp")
      .send({ email, code: correctCode });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("OTP_MAX_ATTEMPTS_EXCEEDED");

    // User should still NOT be verified
    const freshUser = await prisma.user.findUnique({ where: { email } });
    expect(freshUser!.isVerified).toBe(false);
  });

  it("should reject expired OTP even with correct code (Scenario 5)", async () => {
    const email = await registerTestUser(testEmail());

    await request(app)
      .post("/api/auth/send-otp")
      .send({ email });

    const correctCode = capturedOtpCode!;

    // Set the OTP's expiresAt to the past
    const user = await prisma.user.findUnique({ where: { email } });
    await prisma.otp.updateMany({
      where: { userId: user!.id },
      data: {
        expiresAt: new Date(Date.now() - 1000), // expired 1 second ago
        // Also push createdAt back so cooldown doesn't interfere
        createdAt: new Date(Date.now() - 15 * 60 * 1000),
      },
    });

    // Try to verify with the correct code — should fail
    const res = await request(app)
      .post("/api/auth/verify-otp")
      .send({ email, code: correctCode });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("OTP_EXPIRED");
  });

  it("should reject if no OTP exists", async () => {
    const email = await registerTestUser(testEmail());

    // Try to verify without ever sending an OTP
    const res = await request(app)
      .post("/api/auth/verify-otp")
      .send({ email, code: "123456" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("OTP_EXPIRED");
  });

  it("should reject if user does not exist", async () => {
    const res = await request(app)
      .post("/api/auth/verify-otp")
      .send({ email: "ghost@example.com", code: "123456" });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("USER_NOT_FOUND");
  });

  it("should reject if user is already verified", async () => {
    const email = await registerTestUser(testEmail());

    await prisma.user.update({
      where: { email },
      data: { isVerified: true },
    });

    const res = await request(app)
      .post("/api/auth/verify-otp")
      .send({ email, code: "123456" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("ALREADY_VERIFIED");
  });
});
