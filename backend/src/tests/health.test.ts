/**
 * health.test.ts — Tests for the /api/health endpoint.
 *
 * WHY: Verify the health endpoint works and returns the correct shape.
 * This also validates that our error handling and response format work.
 */

import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app";

describe("GET /api/health", () => {
  it("should return success with healthy status", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("healthy");
    expect(res.body.data.database).toBe("connected");
    expect(res.body.data.timestamp).toBeDefined();
  });
});

describe("404 handler", () => {
  it("should return standard error shape for unknown routes", async () => {
    const res = await request(app).get("/api/nonexistent");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("NOT_FOUND");
    expect(res.body.error.message).toContain("/api/nonexistent");
  });
});
