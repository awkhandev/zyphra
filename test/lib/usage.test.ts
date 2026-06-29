import { describe, it, expect } from "vitest";
import { calculateCost } from "@/lib/usage";

describe("lib/usage — calculateCost", () => {
  it("calculates cost for claude-sonnet-4-6", () => {
    // input: $3/1M, output: $15/1M
    const cost = calculateCost("claude-sonnet-4-6", 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(18.0, 4); // $3 + $15
  });

  it("calculates cost for claude-haiku-4-5", () => {
    // input: $0.80/1M, output: $4/1M
    const cost = calculateCost(
      "claude-haiku-4-5-20251001",
      1_000_000,
      1_000_000,
    );
    expect(cost).toBeCloseTo(4.8, 4);
  });

  it("calculates cost for claude-opus-4-8", () => {
    // input: $15/1M, output: $75/1M
    const cost = calculateCost("claude-opus-4-8", 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(90.0, 4);
  });

  it("calculates cost for gpt-4o", () => {
    // input: $5/1M, output: $15/1M
    const cost = calculateCost("gpt-4o", 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(20.0, 4);
  });

  it("calculates cost for gpt-4o-mini", () => {
    // input: $0.15/1M, output: $0.60/1M
    const cost = calculateCost("gpt-4o-mini", 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(0.75, 4);
  });

  it("returns zero for zero tokens", () => {
    const cost = calculateCost("claude-sonnet-4-6", 0, 0);
    expect(cost).toBe(0);
  });

  it("scales proportionally", () => {
    const half = calculateCost("claude-sonnet-4-6", 500_000, 0);
    const full = calculateCost("claude-sonnet-4-6", 1_000_000, 0);
    expect(half).toBeCloseTo(full / 2, 6);
  });

  it("uses default pricing for unknown models", () => {
    // default: input $3/1M, output $15/1M
    const cost = calculateCost("unknown-model-v1", 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(18.0, 4);
  });

  it("handles small token counts", () => {
    const cost = calculateCost("gpt-4o-mini", 100, 200);
    // 100/1M * 0.15 + 200/1M * 0.60 = 0.000015 + 0.00012 = 0.000135
    expect(cost).toBeCloseTo(0.000135, 8);
  });

  it("handles o1 model pricing", () => {
    // input: $15/1M, output: $60/1M
    const cost = calculateCost("o1", 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(75.0, 4);
  });
});
