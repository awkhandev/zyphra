import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, serviceSupabase } from "@/lib/supabase-server";
import { PLANS, createCheckoutUrl, type PlanName } from "@/lib/payments";
import { rateLimitOrPass } from "@/lib/rate-limit";
import { validateBody, CheckoutSchema } from "@/lib/validation";
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

    const parsed = await validateBody(req, CheckoutSchema);
    if ("error" in parsed) return parsed.error;

    const { plan } = parsed.data;
    const planConfig = PLANS[plan];
    if (!planConfig || !planConfig.variantId) {
      return NextResponse.json(
        { error: "Invalid plan or variant not configured in env vars" },
        { status: 400 },
      );
    }

    // Get workspace
    const { data: rows } = await serviceSupabase
      .from("workspaces")
      .select("id, name, plan")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    const workspace = rows?.[0];
    if (!workspace)
      return NextResponse.json(
        { error: "No workspace found" },
        { status: 404 },
      );
    if (workspace.plan === plan)
      return NextResponse.json(
        { error: "Already on this plan" },
        { status: 400 },
      );

    // Get owner email
    const { data: authData } = await serviceSupabase.auth.admin.getUserById(
      user.id,
    );
    const userEmail = authData?.user?.email ?? "";
    const userName = workspace.name;

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "https://zyphra.vercel.app";

    const checkoutUrl = await createCheckoutUrl({
      variantId: planConfig.variantId,
      workspaceId: workspace.id,
      plan,
      userEmail,
      userName,
      successUrl: `${appUrl}/dashboard?upgraded=true`,
      cancelUrl: `${appUrl}/dashboard?cancelled=true`,
    });

    return NextResponse.json({ url: checkoutUrl });
  } catch (e) {
    log.error({ err: e }, "Checkout failed");
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
