import { NextRequest, NextResponse } from "next/server";
import { serviceSupabase } from "@/lib/supabase-server";
import { getPlanFromVariantId, verifyWebhookSignature } from "@/lib/payments";
import { rateLimitOrPass } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";

const log = createLogger("webhook");

export const dynamic = "force-dynamic";

async function upgradePlan(
  workspaceId: string,
  plan: string,
  subscriptionId: string,
) {
  await serviceSupabase
    .from("workspaces")
    .update({ plan, billing_subscription_id: subscriptionId })
    .eq("id", workspaceId);
  log.info({ workspaceId, plan }, "Plan activated");
}

async function downgradePlan(subscriptionId: string) {
  await serviceSupabase
    .from("workspaces")
    .update({ plan: "free", billing_subscription_id: null })
    .eq("billing_subscription_id", subscriptionId);
  log.info({ subscriptionId }, "Subscription cancelled");
}

export async function POST(req: NextRequest) {
  const rl = await rateLimitOrPass(req, "billing");
  if (rl) return rl;

  const body = await req.text();
  const signature = req.headers.get("x-signature") ?? "";

  // Verify webhook authenticity
  if (!verifyWebhookSignature(body, signature)) {
    log.warn("Invalid webhook signature — rejecting");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventName = payload.meta
    ? ((payload.meta as Record<string, unknown>).event_name as string)
    : "";

  const data = payload.data as Record<string, unknown> | undefined;
  const attrs = data?.attributes as Record<string, unknown> | undefined;
  const custom = (payload.meta as Record<string, unknown>)?.custom_data as
    | Record<string, unknown>
    | undefined;

  try {
    switch (eventName) {
      // ── New subscription created ──────────────────────────────────────────
      case "subscription_created": {
        const workspaceId = custom?.workspace_id as string;
        const plan = custom?.plan as string;
        const subscriptionId = data?.id as string;

        if (workspaceId && plan && subscriptionId) {
          await upgradePlan(workspaceId, plan, subscriptionId);
        }
        break;
      }

      // ── Subscription plan changed ─────────────────────────────────────────
      case "subscription_updated": {
        const subscriptionId = data?.id as string;
        const variantId = (attrs?.variant_id ?? "") as string;
        const workspaceId = custom?.workspace_id as string;

        if (!subscriptionId) break;
        const plan = getPlanFromVariantId(String(variantId));

        if (workspaceId) {
          await upgradePlan(workspaceId, plan, subscriptionId);
        } else {
          // Fallback: look up by subscription ID
          await serviceSupabase
            .from("workspaces")
            .update({ plan })
            .eq("billing_subscription_id", subscriptionId);
        }
        break;
      }

      // ── Subscription cancelled/expired ────────────────────────────────────
      case "subscription_cancelled":
      case "subscription_expired": {
        const subscriptionId = data?.id as string;
        if (subscriptionId) await downgradePlan(subscriptionId);
        break;
      }

      // ── Order completed (covers one-time and first payment) ───────────────
      case "order_created": {
        // LS fires subscription_created separately for subscriptions
        // This is mainly for one-time purchases — not needed for our model
        break;
      }

      // ── Payment failed ────────────────────────────────────────────────────
      case "subscription_payment_failed": {
        const subscriptionId = data?.id as string;
        log.warn({ subscriptionId }, "Payment failed");
        // TODO: send payment failure alert email to workspace owner
        break;
      }

      default:
        // Unknown event — log and acknowledge
        log.info({ eventName }, "Unhandled webhook event");
    }
  } catch (e) {
    log.error({ err: e }, "Webhook handler error");
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
