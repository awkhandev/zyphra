import { NextResponse } from "next/server";
import { serviceSupabase } from "@/lib/supabase-server";
import { createLogger } from "@/lib/logger";

const log = createLogger("health");

export const dynamic = "force-dynamic";

// ── GET /api/health ──────────────────────────────────────────────────────────
// Health check endpoint for uptime monitoring (BetterStack, UptimeRobot, etc.)
// Skip rate limiting — this endpoint is polled every 60s by monitoring services.
export async function GET() {
  const timestamp = new Date().toISOString();
  const version = process.env.npm_package_version ?? "unknown";

  try {
    // Ping Supabase with a lightweight query
    const { error } = await serviceSupabase
      .from("workspaces")
      .select("id", { count: "exact", head: true })
      .limit(1);

    if (error) {
      log.warn({ err: error }, "Health check: Supabase query failed");
      return NextResponse.json(
        { status: "degraded", db: "error", timestamp, version },
        { status: 503 },
      );
    }

    return NextResponse.json({ status: "ok", db: "ok", timestamp, version });
  } catch (e) {
    log.error({ err: e }, "Health check: unexpected error");
    return NextResponse.json(
      { status: "error", db: "error", timestamp, version },
      { status: 500 },
    );
  }
}
