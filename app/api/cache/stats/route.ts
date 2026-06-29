import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, serviceSupabase } from "@/lib/supabase-server";
import { getCacheStats } from "@/lib/cache";
import { createLogger } from "@/lib/logger";

const log = createLogger("cache");

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceId = req.nextUrl.searchParams.get("workspaceId");
    if (!workspaceId)
      return NextResponse.json(
        { error: "workspaceId required" },
        { status: 400 },
      );

    // Verify user is member of this workspace
    const { data: member } = await serviceSupabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!member)
      return NextResponse.json({ error: "Not a member" }, { status: 403 });

    const stats = await getCacheStats(workspaceId);
    return NextResponse.json({ stats });
  } catch (e) {
    log.error({ err: e }, "Cache stats failed");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
