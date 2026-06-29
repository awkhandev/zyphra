/**
 * Payment provider: Lemon Squeezy
 * Available in Pakistan ✅ — acts as merchant of record (handles all VAT/taxes)
 * Sign up at: https://lemonsqueezy.com
 */
import { createLogger } from "./logger";

const log = createLogger("payments");

// ── Plan definitions ──────────────────────────────────────────────────────────
export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    maxKeys: 3,
    variantId: null as string | null,
    features: ["3 sub-keys", "Basic dashboard", "Usage tracking"],
  },
  starter: {
    name: "Starter",
    price: 19,
    maxKeys: 10,
    variantId: process.env.LS_VARIANT_STARTER ?? null,
    features: [
      "10 sub-keys",
      "Email alerts",
      "Budget enforcement",
      "30-day history",
    ],
  },
  team: {
    name: "Team",
    price: 49,
    maxKeys: 25,
    variantId: process.env.LS_VARIANT_TEAM ?? null,
    features: [
      "25 sub-keys",
      "Slack alerts",
      "Project-level keys",
      "Priority support",
    ],
  },
  business: {
    name: "Business",
    price: 99,
    maxKeys: 999999,
    variantId: process.env.LS_VARIANT_BUSINESS ?? null,
    features: [
      "Unlimited keys",
      "SSO / Google login",
      "Audit logs",
      "Dedicated support",
    ],
  },
} as const;

export type PlanName = keyof typeof PLANS;

export function getPlanFromVariantId(variantId: string): PlanName {
  for (const [plan, cfg] of Object.entries(PLANS)) {
    if (cfg.variantId === variantId) return plan as PlanName;
  }
  return "free";
}

export function getMaxKeys(plan: string): number {
  return PLANS[plan as PlanName]?.maxKeys ?? PLANS.free.maxKeys;
}

export function isPaidPlan(plan: string): boolean {
  return plan !== "free";
}

// ── Lemon Squeezy API helpers ─────────────────────────────────────────────────
const LS_BASE = "https://api.lemonsqueezy.com/v1";

function lsHeaders() {
  return {
    Accept: "application/vnd.api+json",
    "Content-Type": "application/vnd.api+json",
    Authorization: `Bearer ${process.env.LS_API_KEY}`,
  };
}

/**
 * Create a Lemon Squeezy checkout URL for a given variant (plan).
 */
export async function createCheckoutUrl(opts: {
  variantId: string;
  workspaceId: string;
  plan: PlanName;
  userEmail: string;
  userName: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const { variantId, workspaceId, plan, userEmail, userName, successUrl } =
    opts;

  const res = await fetch(`${LS_BASE}/checkouts`, {
    method: "POST",
    headers: lsHeaders(),
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_options: { dark: true },
          checkout_data: {
            email: userEmail,
            name: userName,
            custom: { workspace_id: workspaceId, plan },
          },
          product_options: {
            redirect_url: successUrl,
            receipt_link_url: successUrl,
            receipt_thank_you_note: "Thank you for subscribing to Zyphra!",
          },
        },
        relationships: {
          store: {
            data: { type: "stores", id: process.env.LS_STORE_ID },
          },
          variant: {
            data: { type: "variants", id: variantId },
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Lemon Squeezy checkout failed: ${err}`);
  }

  const data = await res.json();
  return data.data.attributes.url as string;
}

/**
 * Get the customer portal URL for a subscription.
 */
export async function getPortalUrl(subscriptionId: string): Promise<string> {
  const res = await fetch(`${LS_BASE}/subscriptions/${subscriptionId}`, {
    headers: lsHeaders(),
  });

  if (!res.ok) throw new Error("Failed to fetch subscription");

  const data = await res.json();
  return (
    data.data.attributes.urls?.customer_portal ??
    data.data.attributes.urls?.update_payment_method ??
    "https://app.lemonsqueezy.com/my-orders"
  );
}

/**
 * Verify a Lemon Squeezy webhook signature using constant-time comparison
 * to prevent timing attacks.
 */
export function verifyWebhookSignature(
  body: string,
  signature: string,
): boolean {
  const secret = process.env.LS_WEBHOOK_SECRET;
  if (!secret) {
    log.error("LS_WEBHOOK_SECRET not set — rejecting webhook");
    return false;
  }

  const { createHmac, timingSafeEqual } = require("crypto");
  const hmac = createHmac("sha256", secret);
  hmac.update(body);
  const digest = hmac.digest("hex");

  // Constant-time comparison to prevent timing attacks
  try {
    const digestBuf = Buffer.from(digest, "hex");
    const sigBuf = Buffer.from(signature, "hex");
    if (digestBuf.length !== sigBuf.length) return false;
    return timingSafeEqual(digestBuf, sigBuf);
  } catch {
    return false;
  }
}
