import { describe, it, expect } from "vitest";

// alerts.ts has checkAndFireAlerts which depends on supabase + mailer.
// We test the pure logic / behavior indirectly through the module's internal constants.
// Since checkAndFireAlerts requires DB access, we test what we can without mocking.

describe("lib/alerts", () => {
  // The alerts module defines THRESHOLDS internally as [80, 100].
  // We verify the module can be imported without errors (env vars set in setup.ts).
  it("can be imported without errors", async () => {
    const mod = await import("@/lib/alerts");
    expect(typeof mod.checkAndFireAlerts).toBe("function");
  });

  // checkAndFireAlerts is async and hits Supabase — test it gracefully handles missing env
  it("returns early when no email provider is configured", async () => {
    // Save and clear email provider env vars
    const savedResend = process.env.RESEND_API_KEY;
    const savedBrevo = process.env.BREVO_API_KEY;
    delete process.env.RESEND_API_KEY;
    delete process.env.BREVO_API_KEY;

    const { checkAndFireAlerts } = await import("@/lib/alerts");
    // Should return without throwing — early return when no email provider
    await expect(
      checkAndFireAlerts({
        subKeyId: "test-sub-key",
        workspaceId: "test-workspace",
        keyLabel: "Test Key",
        spentUsd: 50,
        budgetUsd: 100,
      }),
    ).resolves.toBeUndefined();

    // Restore env vars
    if (savedResend) process.env.RESEND_API_KEY = savedResend;
    if (savedBrevo) process.env.BREVO_API_KEY = savedBrevo;
  });
});
