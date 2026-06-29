import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Supabase before importing routes
vi.mock("@/lib/supabase-server", () => ({
  createServerSupabase: vi.fn(),
  serviceSupabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          limit: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  },
}));

// Mock rate limiting to pass through
vi.mock("@/lib/rate-limit", () => ({
  rateLimitOrPass: vi.fn(() => Promise.resolve(null)),
  checkRateLimit: vi.fn(() =>
    Promise.resolve({ allowed: true, remaining: 119 }),
  ),
}));

describe("API Routes — Proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("proxy route exists and is callable", async () => {
    const { POST } = await import("@/app/api/v1/messages/route");
    expect(typeof POST).toBe("function");
  });

  it("rejects requests without authorization header", async () => {
    const { POST } = await import("@/app/api/v1/messages/route");
    const req = new NextRequest("http://localhost:3000/api/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 100,
        messages: [{ role: "user", content: "Hello" }],
      }),
    });

    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json.error).toBeDefined();
  });

  it("rejects requests with invalid sub-key format", async () => {
    const { POST } = await import("@/app/api/v1/messages/route");
    const req = new NextRequest("http://localhost:3000/api/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": "invalid-key-format",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 100,
        messages: [{ role: "user", content: "Hello" }],
      }),
    });

    const res = await POST(req);
    const json = await res.json();
    // Should return 401 or similar error for invalid key
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(json.error).toBeDefined();
  });
});

describe("API Routes — OpenAI Proxy", () => {
  it("OpenAI proxy route exists and is callable", async () => {
    const { POST } = await import("@/app/openai/v1/chat/completions/route");
    expect(typeof POST).toBe("function");
  });

  it("rejects requests without authorization header", async () => {
    const { POST } = await import("@/app/openai/v1/chat/completions/route");
    const req = new NextRequest(
      "http://localhost:3000/openai/v1/chat/completions",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [{ role: "user", content: "Hello" }],
        }),
      },
    );

    const res = await POST(req);
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json.error).toBeDefined();
  });
});
