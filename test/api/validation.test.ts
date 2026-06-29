import { describe, it, expect } from "vitest";
import {
  WorkspaceCreateSchema,
  KeyCreateSchema,
  InviteCreateSchema,
  InviteAcceptSchema,
  CheckoutSchema,
  OpenAISaveSchema,
  KeyPoolAddSchema,
  RoutingUpdateSchema,
  CacheUpdateSchema,
} from "@/lib/validation";

describe("Validation Schemas", () => {
  // ── WorkspaceCreateSchema ──────────────────────────────────────────────
  describe("WorkspaceCreateSchema", () => {
    it("accepts valid workspace creation", () => {
      const result = WorkspaceCreateSchema.safeParse({
        name: "My Workspace",
        anthropicKey: "sk-ant-api03-test-key",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty name", () => {
      const result = WorkspaceCreateSchema.safeParse({
        name: "",
        anthropicKey: "sk-ant-api03-test-key",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing anthropicKey", () => {
      const result = WorkspaceCreateSchema.safeParse({
        name: "My Workspace",
      });
      expect(result.success).toBe(false);
    });
  });

  // ── KeyCreateSchema ────────────────────────────────────────────────────
  describe("KeyCreateSchema", () => {
    it("accepts valid key creation", () => {
      const result = KeyCreateSchema.safeParse({
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
        label: "Dev Key",
        monthlyBudgetUsd: 50,
        dailyRequestLimit: 1000,
      });
      expect(result.success).toBe(true);
    });

    it("accepts key creation without optional fields", () => {
      const result = KeyCreateSchema.safeParse({
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
        label: "Dev Key",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid workspaceId format", () => {
      const result = KeyCreateSchema.safeParse({
        workspaceId: "not-a-uuid",
        label: "Dev Key",
      });
      expect(result.success).toBe(false);
    });

    it("rejects budget exceeding max", () => {
      const result = KeyCreateSchema.safeParse({
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
        label: "Dev Key",
        monthlyBudgetUsd: 200000,
      });
      expect(result.success).toBe(false);
    });
  });

  // ── InviteCreateSchema ─────────────────────────────────────────────────
  describe("InviteCreateSchema", () => {
    it("accepts valid invite", () => {
      const result = InviteCreateSchema.safeParse({
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
        email: "user@example.com",
      });
      expect(result.success).toBe(true);
    });

    it("accepts invite with role", () => {
      const result = InviteCreateSchema.safeParse({
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
        email: "user@example.com",
        role: "admin",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid email", () => {
      const result = InviteCreateSchema.safeParse({
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
        email: "not-an-email",
      });
      expect(result.success).toBe(false);
    });
  });

  // ── CheckoutSchema ─────────────────────────────────────────────────────
  describe("CheckoutSchema", () => {
    it("accepts valid plan names", () => {
      for (const plan of ["free", "starter", "team", "business"]) {
        const result = CheckoutSchema.safeParse({ plan });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid plan name", () => {
      const result = CheckoutSchema.safeParse({ plan: "enterprise" });
      expect(result.success).toBe(false);
    });
  });

  // ── RoutingUpdateSchema ────────────────────────────────────────────────
  describe("RoutingUpdateSchema", () => {
    it("accepts valid routing update", () => {
      const result = RoutingUpdateSchema.safeParse({
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
        routingEnabled: true,
        routingConfig: {
          simple: "claude-haiku-4-5-20251001",
          medium: "claude-sonnet-4-6",
          complex: "passthrough",
        },
      });
      expect(result.success).toBe(true);
    });

    it("accepts partial update (just enabled flag)", () => {
      const result = RoutingUpdateSchema.safeParse({
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
        routingEnabled: false,
      });
      expect(result.success).toBe(true);
    });
  });

  // ── CacheUpdateSchema ──────────────────────────────────────────────────
  describe("CacheUpdateSchema", () => {
    it("accepts valid cache update", () => {
      const result = CacheUpdateSchema.safeParse({
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
        cacheEnabled: true,
        cacheTtlHours: 24,
      });
      expect(result.success).toBe(true);
    });

    it("rejects TTL over 720 hours", () => {
      const result = CacheUpdateSchema.safeParse({
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
        cacheTtlHours: 721,
      });
      expect(result.success).toBe(false);
    });
  });
});
