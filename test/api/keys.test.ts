import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase before importing routes
vi.mock("@/lib/supabase-server", () => ({
  createServerSupabase: vi.fn(),
  serviceSupabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        order: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
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
  checkRateLimit: vi.fn(() => Promise.resolve({ allowed: true, remaining: 9 })),
}));

describe("API Routes — Keys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keys POST route exists and is callable", async () => {
    const { POST } = await import("@/app/api/keys/route");
    expect(typeof POST).toBe("function");
  });

  it("keys DELETE route exists and is callable", async () => {
    const { DELETE } = await import("@/app/api/keys/route");
    expect(typeof DELETE).toBe("function");
  });

  it("rejects POST requests without authentication", async () => {
    const { POST } = await import("@/app/api/keys/route");
    const { createServerSupabase } = await import("@/lib/supabase-server");
    vi.mocked(createServerSupabase).mockReturnValue({
      auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: null } })) },
    } as any);

    const req = new Request("http://localhost:3000/api/keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId: "test", label: "test-key" }),
    });

    const res = await POST(req as any);
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });
});

describe("API Routes — Workspace", () => {
  it("workspace POST route exists and is callable", async () => {
    const { POST } = await import("@/app/api/workspace/route");
    expect(typeof POST).toBe("function");
  });

  it("rejects workspace creation without authentication", async () => {
    const { POST } = await import("@/app/api/workspace/route");
    const { createServerSupabase } = await import("@/lib/supabase-server");
    vi.mocked(createServerSupabase).mockReturnValue({
      auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: null } })) },
    } as any);

    const req = new Request("http://localhost:3000/api/workspace", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "test-workspace", anthropicKey: "sk-test" }),
    });

    const res = await POST(req as any);
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });
});
