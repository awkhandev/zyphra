import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, serviceSupabase } from "@/lib/supabase-server";
import { getPortalUrl } from "@/lib/payments";
import { rateLimitOrPass } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";

const log = createLogger("billing");

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rl = await rateLimitOrPass(req, "billing");
  if (rl) return rl;

  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: rows } = await serviceSupabase
      .from("workspaces")
      .select("billing_subscription_id")
      .eq("owner_id", user.id)
      .limit(1);

    const subscriptionId = rows?.[0]?.billing_subscription_id;
    if (!subscriptionId) {
      return NextResponse.json(
        { error: "No active subscription found — upgrade first" },
        { status: 400 },
      );
    }

    const portalUrl = await getPortalUrl(subscriptionId);
    return NextResponse.json({ url: portalUrl });
  } catch (e) {
    log.error({ err: e }, "Billing portal failed");
    return NextResponse.json(
      { error: "Failed to load billing portal" },
      { status: 500 },
    );
  }
}
