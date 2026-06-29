import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, serviceSupabase } from "@/lib/supabase-server";
import { encrypt } from "@/lib/crypto";
import { rateLimitOrPass } from "@/lib/rate-limit";
import { validateBody, OpenAISaveSchema } from "@/lib/validation";
import { createLogger } from "@/lib/logger";

const log = createLogger("workspace-openai");

export const dynamic = "force-dynamic";

// ── POST /api/workspace/openai — save OpenAI key ──────────────────────────────
export async function POST(req: NextRequest) {
  const rl = await rateLimitOrPass(req, "keys");
  if (rl) return rl;

  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = await validateBody(req, OpenAISaveSchema);
  if ("error" in parsed) return parsed.error;

  const { openaiKey } = parsed.data;

  if (!openaiKey.startsWith("sk-"))
    return NextResponse.json(
      { error: "Invalid OpenAI key — must start with sk-" },
      { status: 400 },
    );

  // Validate key against OpenAI
  const isDev = process.env.NODE_ENV === "development";
  const isTestKey = openaiKey === "sk-test-key-dev";

  if (!(isDev && isTestKey)) {
    try {
      const test = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${openaiKey}` },
      });
      if (test.status === 401)
        return NextResponse.json(
          { error: "OpenAI key is invalid or expired" },
          { status: 400 },
        );
    } catch {
      return NextResponse.json(
        { error: "Could not reach OpenAI API" },
        { status: 502 },
      );
    }
  }

  // Encrypt and save
  const encrypted = encrypt(openaiKey);
  const { error } = await serviceSupabase
    .from("workspaces")
    .update({ openai_key_enc: encrypted })
    .eq("owner_id", user.id);

  if (error) {
    log.error({ err: error }, "Failed to save OpenAI key");
    return NextResponse.json(
      { error: "Failed to save OpenAI key" },
      { status: 500 },
    );
  }
  return NextResponse.json({ success: true });
}

// ── DELETE /api/workspace/openai — remove OpenAI key ─────────────────────────
export async function DELETE(req: NextRequest) {
  const rl = await rateLimitOrPass(req, "keys");
  if (rl) return rl;

  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await serviceSupabase
    .from("workspaces")
    .update({ openai_key_enc: null })
    .eq("owner_id", user.id);

  if (error) {
    log.error({ err: error }, "Failed to remove OpenAI key");
    return NextResponse.json(
      { error: "Failed to remove OpenAI key" },
      { status: 500 },
    );
  }
  return NextResponse.json({ success: true });
}

// ── GET /api/workspace/openai — check if OpenAI key is configured ─────────────
export async function GET(req: NextRequest) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await serviceSupabase
    .from("workspaces")
    .select("openai_key_enc")
    .eq("owner_id", user.id)
    .single();

  return NextResponse.json({ configured: !!data?.openai_key_enc });
}
