/**
 * profile-and-tasks.test.ts — Tests for Profile, Task Catalogue, and Task Selection.
 *
 * WHY: Verify all new endpoints work end-to-end:
 *   - Profile update/retrieval (validation, mobile normalization)
 *   - Task catalogue listing (grouping, search)
 *   - Task selection (replace, get, invalid IDs)
 *   - Auth guards (unauthenticated and unverified rejection)
 *
 * APPROACH: Integration tests against the real dev Postgres database.
 * We register, OTP-verify, and log in a test user for the protected routes.
 * The mailService is mocked to capture OTP codes without needing Mailpit.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import app from "../app";
import { prisma } from "../config/prisma";

// ── Mock the mail service (same approach as otp.test.ts) ────────

let capturedOtpCode: string | null = null;

vi.mock("../services/mailService", () => ({
  sendOtpEmail: vi.fn(async (_to: string, code: string) => {
    capturedOtpCode = code;
  }),
}));

// ── Test state ──────────────────────────────────────────────────

const TEST_EMAIL = `test-profile-tasks-${Date.now()}@example.com`;
const TEST_PASSWORD = "SecurePass1";
let authToken: string;

// ── Setup: register → send OTP → verify → login → get JWT ──────

beforeAll(async () => {
  // 1. Register
  await request(app).post("/api/auth/register").send({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    confirmPassword: TEST_PASSWORD,
  });

  // 2. Send OTP
  await request(app).post("/api/auth/send-otp").send({ email: TEST_EMAIL });

  // 3. Verify OTP
  const code = capturedOtpCode!;
  await request(app).post("/api/auth/verify-otp").send({ email: TEST_EMAIL, code });

  // 4. Login to get JWT
  const loginRes = await request(app).post("/api/auth/login").send({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  authToken = loginRes.body.data.token;

  // 5. Make sure tasks are seeded (idempotent — safe to run again)
  //    We import and call the seed data inline to avoid depending on
  //    the seed script having been run externally.
  const taskCount = await prisma.task.count();
  if (taskCount === 0) {
    throw new Error(
      "No tasks found in the database. Run `npm run prisma:seed` before running tests.",
    );
  }
});

// ── Cleanup ─────────────────────────────────────────────────────

afterAll(async () => {
  // Delete test user (cascades to OTPs and UserTasks)
  await prisma.user.deleteMany({
    where: { email: { contains: "test-profile-tasks-" } },
  });
  await prisma.$disconnect();
});

// ── Helper: make authenticated request ──────────────────────────

function authGet(url: string) {
  return request(app).get(url).set("Authorization", `Bearer ${authToken}`);
}

function authPut(url: string) {
  return request(app).put(url).set("Authorization", `Bearer ${authToken}`);
}

// ═══════════════════════════════════════════════════════════════
// AUTH GUARDS
// ═══════════════════════════════════════════════════════════════

describe("Auth guards", () => {
  it("should reject unauthenticated requests to GET /api/profile", async () => {
    const res = await request(app).get("/api/profile");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("should reject unauthenticated requests to PUT /api/profile", async () => {
    const res = await request(app).put("/api/profile").send({ name: "Test" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("should reject unauthenticated requests to GET /api/tasks", async () => {
    const res = await request(app).get("/api/tasks");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("should reject unauthenticated requests to PUT /api/tasks/selection", async () => {
    const res = await request(app).put("/api/tasks/selection").send({ taskIds: [] });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("should reject unauthenticated requests to GET /api/tasks/selection", async () => {
    const res = await request(app).get("/api/tasks/selection");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("should reject unverified users", async () => {
    // Create an unverified user
    const unverifiedEmail = `unverified-${Date.now()}@example.com`;
    await request(app).post("/api/auth/register").send({
      email: unverifiedEmail,
      password: TEST_PASSWORD,
      confirmPassword: TEST_PASSWORD,
    });

    // Send OTP to get a valid OTP, then login without verifying
    // Actually, login will fail for unverified user (auth service rejects).
    // So we need to manually create a token for an unverified user.
    // Instead, let's use the JWT utility directly.
    const { generateToken } = await import("../utils/jwt");
    const user = await prisma.user.findUnique({ where: { email: unverifiedEmail } });
    const unverifiedToken = generateToken({ userId: user!.id, email: user!.email });

    const res = await request(app)
      .get("/api/profile")
      .set("Authorization", `Bearer ${unverifiedToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("EMAIL_NOT_VERIFIED");

    // Cleanup
    await prisma.user.delete({ where: { email: unverifiedEmail } });
  });
});

// ═══════════════════════════════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════════════════════════════

describe("PUT /api/profile", () => {
  it("should update profile with valid data", async () => {
    const res = await authPut("/api/profile").send({
      name: "Rahul Sharma",
      mobileNumber: "9876543210",
      address: "123 MG Road, Bangalore",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Rahul Sharma");
    expect(res.body.data.mobileNumber).toBe("9876543210");
    expect(res.body.data.address).toBe("123 MG Road, Bangalore");
    // Password hash must NEVER be returned
    expect(res.body.data.passwordHash).toBeUndefined();
    expect(res.body.data.password_hash).toBeUndefined();
    expect(res.body.data.password).toBeUndefined();
  });

  it("should accept businessName as optional", async () => {
    const res = await authPut("/api/profile").send({
      name: "Rahul Sharma",
      mobileNumber: "9876543210",
      address: "123 MG Road, Bangalore",
      businessName: "Sharma & Sons",
    });

    expect(res.status).toBe(200);
    expect(res.body.data.businessName).toBe("Sharma & Sons");
  });

  it("should reject name shorter than 2 characters", async () => {
    const res = await authPut("/api/profile").send({
      name: "R",
      mobileNumber: "9876543210",
      address: "123 MG Road, Bangalore",
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.fields?.name).toBeDefined();
  });

  it("should reject address shorter than 5 characters", async () => {
    const res = await authPut("/api/profile").send({
      name: "Rahul Sharma",
      mobileNumber: "9876543210",
      address: "123",
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.fields?.address).toBeDefined();
  });

  it("should reject invalid mobile number (starts with 0-5)", async () => {
    const res = await authPut("/api/profile").send({
      name: "Rahul Sharma",
      mobileNumber: "1234567890",
      address: "123 MG Road, Bangalore",
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should reject mobile number with wrong length", async () => {
    const res = await authPut("/api/profile").send({
      name: "Rahul Sharma",
      mobileNumber: "98765",
      address: "123 MG Road, Bangalore",
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should normalize +91 prefix (stores as 10 digits)", async () => {
    const res = await authPut("/api/profile").send({
      name: "Rahul Sharma",
      mobileNumber: "+919876543210",
      address: "123 MG Road, Bangalore",
    });

    expect(res.status).toBe(200);
    expect(res.body.data.mobileNumber).toBe("9876543210");
  });

  it("should normalize 91 prefix (stores as 10 digits)", async () => {
    const res = await authPut("/api/profile").send({
      name: "Rahul Sharma",
      mobileNumber: "919876543210",
      address: "123 MG Road, Bangalore",
    });

    expect(res.status).toBe(200);
    expect(res.body.data.mobileNumber).toBe("9876543210");
  });

  it("should store +919876543210 and 9876543210 the same way", async () => {
    // Update with +91 prefix
    const res1 = await authPut("/api/profile").send({
      name: "Rahul Sharma",
      mobileNumber: "+919876543210",
      address: "123 MG Road, Bangalore",
    });

    // Update with plain 10 digits
    const res2 = await authPut("/api/profile").send({
      name: "Rahul Sharma",
      mobileNumber: "9876543210",
      address: "123 MG Road, Bangalore",
    });

    expect(res1.body.data.mobileNumber).toBe(res2.body.data.mobileNumber);
    expect(res1.body.data.mobileNumber).toBe("9876543210");
  });
});

describe("GET /api/profile", () => {
  it("should return the current user's profile", async () => {
    // First update profile so we have data
    await authPut("/api/profile").send({
      name: "Rahul Sharma",
      mobileNumber: "9876543210",
      address: "123 MG Road, Bangalore",
      businessName: "Sharma Store",
    });

    const res = await authGet("/api/profile");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(TEST_EMAIL);
    expect(res.body.data.name).toBe("Rahul Sharma");
    expect(res.body.data.mobileNumber).toBe("9876543210");
    expect(res.body.data.address).toBe("123 MG Road, Bangalore");
    expect(res.body.data.businessName).toBe("Sharma Store");
    expect(res.body.data.isVerified).toBe(true);
    // Password hash must NEVER be returned
    expect(res.body.data.passwordHash).toBeUndefined();
    expect(res.body.data.password).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════
// TASK CATALOGUE
// ═══════════════════════════════════════════════════════════════

describe("GET /api/tasks", () => {
  it("should return tasks grouped by category with at least 20 tasks", async () => {
    const res = await authGet("/api/tasks");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.categories).toBeDefined();
    expect(Array.isArray(res.body.data.categories)).toBe(true);

    // Count total tasks across all categories
    const totalTasks = res.body.data.categories.reduce(
      (sum: number, cat: { tasks: unknown[] }) => sum + cat.tasks.length,
      0,
    );
    expect(totalTasks).toBeGreaterThanOrEqual(20);

    // Verify structure of each category group
    for (const cat of res.body.data.categories) {
      expect(cat.category).toBeDefined();
      expect(typeof cat.category).toBe("string");
      expect(Array.isArray(cat.tasks)).toBe(true);

      for (const task of cat.tasks) {
        expect(task.id).toBeDefined();
        expect(task.name).toBeDefined();
        expect(task.description).toBeDefined();
      }
    }
  });

  it("should filter tasks by search query (name match)", async () => {
    const res = await authGet("/api/tasks?search=plumbing");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Should find at least the "Plumbing Repair" task
    const totalTasks = res.body.data.categories.reduce(
      (sum: number, cat: { tasks: unknown[] }) => sum + cat.tasks.length,
      0,
    );
    expect(totalTasks).toBeGreaterThanOrEqual(1);

    // Verify the matching task is in the results
    const allTaskNames = res.body.data.categories.flatMap(
      (cat: { tasks: { name: string }[] }) => cat.tasks.map((t) => t.name),
    );
    expect(allTaskNames.some((n: string) => n.toLowerCase().includes("plumbing"))).toBe(true);
  });

  it("should filter tasks by search query (description match)", async () => {
    const res = await authGet("/api/tasks?search=cockroach");

    expect(res.status).toBe(200);
    // Should find the Pest Control task (description mentions cockroaches)
    const totalTasks = res.body.data.categories.reduce(
      (sum: number, cat: { tasks: unknown[] }) => sum + cat.tasks.length,
      0,
    );
    expect(totalTasks).toBeGreaterThanOrEqual(1);
  });

  it("should return empty categories array for non-matching search", async () => {
    const res = await authGet("/api/tasks?search=xyznonexistent123");

    expect(res.status).toBe(200);
    expect(res.body.data.categories).toEqual([]);
  });

  it("should preserve category grouping in search results", async () => {
    const res = await authGet("/api/tasks?search=repair");

    expect(res.status).toBe(200);
    // "repair" matches multiple tasks — verify they're still grouped
    for (const cat of res.body.data.categories) {
      expect(cat.category).toBeDefined();
      expect(cat.tasks.length).toBeGreaterThanOrEqual(1);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// TASK SELECTION
// ═══════════════════════════════════════════════════════════════

describe("PUT /api/tasks/selection", () => {
  it("should select valid tasks and return them", async () => {
    // Get task IDs from the catalogue
    const tasksRes = await authGet("/api/tasks");
    const firstCategory = tasksRes.body.data.categories[0];
    const taskIds = firstCategory.tasks.slice(0, 2).map((t: { id: string }) => t.id);

    const res = await authPut("/api/tasks/selection").send({ taskIds });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tasks).toHaveLength(2);

    // Verify the returned tasks have all expected fields
    for (const task of res.body.data.tasks) {
      expect(task.id).toBeDefined();
      expect(task.name).toBeDefined();
      expect(task.category).toBeDefined();
      expect(task.description).toBeDefined();
    }
  });

  it("should reject non-existent task IDs with a clear error", async () => {
    const fakeId = "00000000-0000-4000-a000-000000000000";

    const res = await authPut("/api/tasks/selection").send({
      taskIds: [fakeId],
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_TASK_IDS");
    expect(res.body.error.message).toContain(fakeId);
  });

  it("should reject a mix of valid and invalid task IDs", async () => {
    const tasksRes = await authGet("/api/tasks");
    const validId = tasksRes.body.data.categories[0].tasks[0].id;
    const fakeId = "00000000-0000-4000-a000-000000000001";

    const res = await authPut("/api/tasks/selection").send({
      taskIds: [validId, fakeId],
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_TASK_IDS");
    expect(res.body.error.message).toContain(fakeId);
    // The valid ID should NOT appear in the error message
    expect(res.body.error.message).not.toContain(validId);
  });

  it("should replace existing selection with new one", async () => {
    const tasksRes = await authGet("/api/tasks");
    const allTasks = tasksRes.body.data.categories.flatMap(
      (c: { tasks: { id: string }[] }) => c.tasks,
    );

    // Select first 2 tasks
    const firstSelection = [allTasks[0].id, allTasks[1].id];
    await authPut("/api/tasks/selection").send({ taskIds: firstSelection });

    // Replace with a different set
    const secondSelection = [allTasks[2].id, allTasks[3].id, allTasks[4].id];
    const res = await authPut("/api/tasks/selection").send({ taskIds: secondSelection });

    expect(res.status).toBe(200);
    expect(res.body.data.tasks).toHaveLength(3);

    // Verify the old tasks are gone and new ones are present
    const selectedIds = res.body.data.tasks.map((t: { id: string }) => t.id);
    expect(selectedIds).toContain(allTasks[2].id);
    expect(selectedIds).toContain(allTasks[3].id);
    expect(selectedIds).toContain(allTasks[4].id);
    expect(selectedIds).not.toContain(allTasks[0].id);
    expect(selectedIds).not.toContain(allTasks[1].id);
  });

  it("should allow clearing all selections with empty array", async () => {
    // First select something
    const tasksRes = await authGet("/api/tasks");
    const taskId = tasksRes.body.data.categories[0].tasks[0].id;
    await authPut("/api/tasks/selection").send({ taskIds: [taskId] });

    // Then clear
    const res = await authPut("/api/tasks/selection").send({ taskIds: [] });

    expect(res.status).toBe(200);
    expect(res.body.data.tasks).toHaveLength(0);
  });

  it("should reject invalid UUID format in taskIds", async () => {
    const res = await authPut("/api/tasks/selection").send({
      taskIds: ["not-a-uuid"],
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("GET /api/tasks/selection", () => {
  it("should return the user's currently selected tasks", async () => {
    // Select some tasks first
    const tasksRes = await authGet("/api/tasks");
    const taskIds = tasksRes.body.data.categories[0].tasks
      .slice(0, 3)
      .map((t: { id: string }) => t.id);

    await authPut("/api/tasks/selection").send({ taskIds });

    const res = await authGet("/api/tasks/selection");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tasks).toHaveLength(3);

    for (const task of res.body.data.tasks) {
      expect(task.id).toBeDefined();
      expect(task.name).toBeDefined();
      expect(task.category).toBeDefined();
      expect(task.description).toBeDefined();
    }
  });

  it("should return empty array when no tasks are selected", async () => {
    // Clear selection
    await authPut("/api/tasks/selection").send({ taskIds: [] });

    const res = await authGet("/api/tasks/selection");

    expect(res.status).toBe(200);
    expect(res.body.data.tasks).toHaveLength(0);
  });
});
