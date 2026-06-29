import { describe, it, expect } from "vitest";
import { buildPromptHash } from "@/lib/cache";

describe("lib/cache", () => {
  // ── buildPromptHash ──────────────────────────────────────────────────────
  describe("buildPromptHash", () => {
    it("returns a 64-char hex string", async () => {
      const body = {
        model: "claude-sonnet-4-6",
        messages: [{ role: "user", content: "Hello" }],
      };
      const hash = await buildPromptHash(body);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("is deterministic for same input", async () => {
      const body = {
        model: "claude-sonnet-4-6",
        messages: [{ role: "user", content: "Test prompt" }],
      };
      const a = await buildPromptHash(body);
      const b = await buildPromptHash(body);
      expect(a).toBe(b);
    });

    it("produces different hashes for different prompts", async () => {
      const a = await buildPromptHash({
        model: "gpt-4o",
        messages: [{ role: "user", content: "Hello" }],
      });
      const b = await buildPromptHash({
        model: "gpt-4o",
        messages: [{ role: "user", content: "Goodbye" }],
      });
      expect(a).not.toBe(b);
    });

    it("produces different hashes for different models", async () => {
      const base = {
        messages: [{ role: "user", content: "Same prompt" }],
      };
      const a = await buildPromptHash({ ...base, model: "gpt-4o" });
      const b = await buildPromptHash({ ...base, model: "claude-sonnet-4-6" });
      expect(a).not.toBe(b);
    });

    it("handles empty messages array", async () => {
      const hash = await buildPromptHash({
        model: "gpt-4o",
        messages: [],
      });
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("handles missing messages field", async () => {
      const hash = await buildPromptHash({
        model: "gpt-4o",
      });
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("handles Anthropic-style content blocks", async () => {
      const body = {
        model: "claude-sonnet-4-6",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Part 1" },
              { type: "text", text: "Part 2" },
            ],
          },
        ],
      };
      const hash = await buildPromptHash(body);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("ignores non-content fields (temperature, max_tokens)", async () => {
      const a = await buildPromptHash({
        model: "gpt-4o",
        messages: [{ role: "user", content: "Test" }],
        temperature: 0.5,
      });
      const b = await buildPromptHash({
        model: "gpt-4o",
        messages: [{ role: "user", content: "Test" }],
        temperature: 0.9,
        max_tokens: 100,
      });
      expect(a).toBe(b);
    });
  });
});
