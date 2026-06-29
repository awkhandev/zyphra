import { describe, it, expect } from "vitest";

// The crypto module validates ENCRYPTION_KEY at import time via setup.ts
import { encrypt, decrypt, hashKey } from "@/lib/crypto";

describe("lib/crypto", () => {
  // ── encrypt / decrypt roundtrip ──────────────────────────────────────────
  describe("encrypt/decrypt roundtrip", () => {
    it("decrypts what encrypt produces", () => {
      const plaintext = "sk-ant-api03-test-secret-key";
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("produces different ciphertext each time (random IV)", () => {
      const plaintext = "same-input";
      const a = encrypt(plaintext);
      const b = encrypt(plaintext);
      // Different ciphertext due to random IV
      expect(a).not.toBe(b);
      // But both decrypt to the same value
      expect(decrypt(a)).toBe(plaintext);
      expect(decrypt(b)).toBe(plaintext);
    });

    it("handles empty strings", () => {
      const encrypted = encrypt("");
      expect(decrypt(encrypted)).toBe("");
    });

    it("handles long payloads", () => {
      const plaintext = "x".repeat(10_000);
      expect(decrypt(encrypt(plaintext))).toBe(plaintext);
    });

    it("returns base64-encoded output", () => {
      const encrypted = encrypt("test");
      // Should be valid base64
      expect(() => Buffer.from(encrypted, "base64")).not.toThrow();
    });
  });

  // ── Error cases ──────────────────────────────────────────────────────────
  describe("decryption errors", () => {
    it("throws on tampered ciphertext", () => {
      const encrypted = encrypt("secret");
      // Flip a bit in the middle
      const buf = Buffer.from(encrypted, "base64");
      const mid = Math.floor(buf.length / 2);
      buf[mid] = buf[mid] ^ 0xff;
      const tampered = buf.toString("base64");
      expect(() => decrypt(tampered)).toThrow();
    });

    it("throws on empty input", () => {
      expect(() => decrypt("")).toThrow();
    });

    it("throws on invalid base64", () => {
      expect(() => decrypt("not-valid-base64!!!")).toThrow();
    });
  });

  // ── hashKey ──────────────────────────────────────────────────────────────
  describe("hashKey", () => {
    it("returns a 64-char hex string", async () => {
      const hash = await hashKey("zph_live_abc123");
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("is deterministic", async () => {
      const a = await hashKey("zph_live_test");
      const b = await hashKey("zph_live_test");
      expect(a).toBe(b);
    });

    it("produces different hashes for different inputs", async () => {
      const a = await hashKey("key-a");
      const b = await hashKey("key-b");
      expect(a).not.toBe(b);
    });
  });
});
