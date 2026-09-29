/**
 * auth.test.ts — Tests for POST /api/auth/register.
 *
 * WHY: Verify registration works end-to-end including validation,
 * duplicate detection, and correct response shapes.
 *
 * SETUP: Uses the same dev Postgres database. Each test cleans up
 * after itself so tests are repeatable and independent.
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "../config/prisma";

// ── Helpers ──────────────────────────────────────────────────────

/** Unique email for each test run to avoid collisions */
const TEST_EMAIL = `test-register-${Date.now()}@example.com`;

/** Valid registration payload */
function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    email: TEST_EMAIL,
    password: "SecurePass1",
    confirmPassword: "SecurePass1",
    ...overrides,
  };
}

// ── Cleanup ──────────────────────────────────────────────────────

// Remove any test users before each test so results are independent
beforeEach(async () => {
  await prisma.user.deleteMany({
    where: { email: { contains: "test-register-" } },
  });
});

// Close Prisma connection after all tests complete
afterAll(async () => {
  await prisma.user.deleteMany({
    where: { email: { contains: "test-register-" } },
  });
  await prisma.$disconnect();
});

// ── Tests ────────────────────────────────────────────────────────

describe("POST /api/auth/register", () => {
  it("should register a new user successfully", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send(validPayload());

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.userId).toBeDefined();
    expect(res.body.data.email).toBe(TEST_EMAIL);
    expect(res.body.data.message).toBe("Registered. Please verify your email.");

    // Ensure no password hash is ever returned
    expect(res.body.data.passwordHash).toBeUndefined();
    expect(res.body.data.password_hash).toBeUndefined();
    expect(res.body.data.password).toBeUndefined();
  });

  it("should reject duplicate email with EMAIL_ALREADY_EXISTS", async () => {
    // Register once
    await request(app)
      .post("/api/auth/register")
      .send(validPayload());

    // Try to register again with the same email
    const res = await request(app)
      .post("/api/auth/register")
      .send(validPayload());

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("EMAIL_ALREADY_EXISTS");
    expect(res.body.error.message).toBe("An account with this email already exists.");
  });

  it("should reject a password shorter than 8 characters", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send(validPayload({ password: "Ab1", confirmPassword: "Ab1" }));

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.fields?.password).toBeDefined();
    expect(res.body.error.fields.password).toContain("at least 8 characters");
  });

  it("should reject when passwords do not match", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send(validPayload({
        password: "SecurePass1",
        confirmPassword: "DifferentPass1",
      }));

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.fields?.confirmPassword).toBeDefined();
    expect(res.body.error.fields.confirmPassword).toContain("do not match");
  });

  it("should reject an invalid email format", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send(validPayload({ email: "not-an-email" }));

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.fields?.email).toBeDefined();
    expect(res.body.error.fields.email).toContain("Invalid email");
  });
});
