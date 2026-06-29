import { describe, it, expect } from "vitest";
import { parseRetryAfter, isRateLimited, MAX_RETRIES } from "@/lib/keypool";

describe("lib/keypool", () => {
  // ── parseRetryAfter ──────────────────────────────────────────────────────
  describe("parseRetryAfter", () => {
    it("returns default (60s) when header is missing", () => {
      const response = new Response(null, { status: 429 });
      expect(parseRetryAfter(response)).toBe(60);
    });

    it("parses numeric retry-after header", () => {
      const response = new Response(null, {
        status: 429,
        headers: { "retry-after": "30" },
      });
      expect(parseRetryAfter(response)).toBe(30);
    });

    it("caps at 300 seconds (5 minutes)", () => {
      const response = new Response(null, {
        status: 429,
        headers: { "retry-after": "600" },
      });
      expect(parseRetryAfter(response)).toBe(300);
    });

    it("returns default for non-numeric header", () => {
      const response = new Response(null, {
        status: 429,
        headers: { "retry-after": "abc" },
      });
      expect(parseRetryAfter(response)).toBe(60);
    });

    it("handles zero retry-after", () => {
      const response = new Response(null, {
        status: 429,
        headers: { "retry-after": "0" },
      });
      expect(parseRetryAfter(response)).toBe(0);
    });
  });

  // ── isRateLimited ────────────────────────────────────────────────────────
  describe("isRateLimited", () => {
    it("returns true for 429 status", () => {
      const response = new Response(null, { status: 429 });
      expect(isRateLimited(response)).toBe(true);
    });

    it("returns false for 200 status", () => {
      const response = new Response(null, { status: 200 });
      expect(isRateLimited(response)).toBe(false);
    });

    it("returns false for 500 status", () => {
      const response = new Response(null, { status: 500 });
      expect(isRateLimited(response)).toBe(false);
    });

    it("returns false for 503 status", () => {
      const response = new Response(null, { status: 503 });
      expect(isRateLimited(response)).toBe(false);
    });
  });

  // ── MAX_RETRIES ──────────────────────────────────────────────────────────
  describe("MAX_RETRIES", () => {
    it("is set to 3", () => {
      expect(MAX_RETRIES).toBe(3);
    });

    it("is a positive integer", () => {
      expect(Number.isInteger(MAX_RETRIES)).toBe(true);
      expect(MAX_RETRIES).toBeGreaterThan(0);
    });
  });
});
