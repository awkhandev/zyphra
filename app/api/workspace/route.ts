import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, serviceSupabase } from "@/lib/supabase-server";
import { encrypt } from "@/lib/crypto";
import { rateLimitOrPass } from "@/lib/rate-limit";
import { validateBody, WorkspaceCreateSchema } from "@/lib/validation";
import { createLogger } from "@/lib/logger";

const log = createLogger("workspace");

export const dynamic = "force-dynamic";

function serverErr(msg: string, status = 500) {
  return NextResponse.json({ error: msg }, { status });
}

// ── POST /api/workspace ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const rl = await rateLimitOrPass(req, "workspace");
  if (rl) return rl;

  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return serverErr("Unauthorized", 401);

    const parsed = await validateBody(req, WorkspaceCreateSchema);
    if ("error" in parsed) return parsed.error;

    const { name, anthropicKey } = parsed.data;

    // Accept any key format — validation is done against the upstream server
    // Skip live validation in dev mode with test keys
    const isDev = process.env.NODE_ENV === "development";
    const skipValidation =
      isDev &&
      (anthropicKey === "sk-ant-test-key-dev" ||
        anthropicKey.endsWith("-test-key") ||
        anthropicKey.endsWith("_test_key"));

    if (!skipValidation) {
      try {
        const upstreamBase =
          process.env.ANTHROPIC_UPSTREAM_URL ?? "https://api.anthropic.com";
        // Try /v1/models first (Anthropic), fall back to /v1/health (kimchi/others)
        const testUrl = `${upstreamBase}/v1/models`;
        const test = await fetch(testUrl, {
          headers: {
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
          },
        });
        // 401 = bad key, anything else (200, 404, 405) = server reached = key format ok
        if (test.status === 401) {
          return serverErr("API key is invalid or expired", 400);
        }
      } catch {
        return serverErr(
          "Could not reach upstream API server — is it running?",
          502,
        );
      }
    }

    let encryptedKey: string;
    try {
      encryptedKey = encrypt(anthropicKey);
    } catch (e) {
      log.error({ err: e }, "Failed to encrypt API key");
      return serverErr("Failed to encrypt API key", 500);
    }

    const { data: workspace, error: wsError } = await serviceSupabase
      .from("workspaces")
      .insert({
        name: name.trim(),
        owner_id: user.id,
        anthropic_key_enc: encryptedKey,
      })
      .select()
      .single();

    if (wsError) {
      log.error({ err: wsError }, "Failed to create workspace");
      return serverErr("Failed to create workspace", 500);
    }

    const { error: memberErr } = await serviceSupabase
      .from("workspace_members")
      .insert({ workspace_id: workspace.id, user_id: user.id, role: "owner" });

    if (memberErr) {
      log.error({ err: memberErr }, "Failed to add workspace owner");
      return serverErr("Failed to add workspace owner", 500);
    }

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (e) {
    log.error({ err: e }, "Workspace creation failed");
    return serverErr("Internal server error", 500);
  }
}

// ── GET /api/workspace ─────────────────────────────────────────────────────────
export async function GET() {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Use limit(1) + order instead of .single() — avoids errors when
    // multiple workspace rows exist from previous test attempts
    const { data: rows } = await serviceSupabase
      .from("workspaces")
      .select(
        "id, name, plan, monthly_budget_usd, created_at, anthropic_key_enc, openai_key_enc",
      )
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    const workspace = rows?.[0] ?? null;

    if (!workspace) {
      // Check if member of another workspace
      const { data: members } = await serviceSupabase
        .from("workspace_members")
        .select(
          "role, workspaces(id, name, plan, anthropic_key_enc, openai_key_enc)",
        )
        .eq("user_id", user.id)
        .limit(1);

      const member = members?.[0] ?? null;
      if (member)
        return NextResponse.json({
          workspace: member.workspaces,
          role: member.role,
        });
      return NextResponse.json({ workspace: null });
    }

    return NextResponse.json({ workspace, role: "owner" });
  } catch (e) {
    log.error({ err: e }, "Failed to get workspace");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
