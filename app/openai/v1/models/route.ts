import { NextRequest, NextResponse } from "next/server";
import { resolveSubKey } from "@/lib/keys";
import { serviceSupabase } from "@/lib/supabase-server";
import { decrypt } from "@/lib/crypto";

// A static list of models we support — returned instantly without an upstream call
const SUPPORTED_MODELS = [
  { id: "gpt-4o", object: "model", owned_by: "openai" },
  { id: "gpt-4o-mini", object: "model", owned_by: "openai" },
  { id: "gpt-4-turbo", object: "model", owned_by: "openai" },
  { id: "gpt-4", object: "model", owned_by: "openai" },
  { id: "gpt-3.5-turbo", object: "model", owned_by: "openai" },
  { id: "o1", object: "model", owned_by: "openai" },
  { id: "o1-mini", object: "model", owned_by: "openai" },
  { id: "o3-mini", object: "model", owned_by: "openai" },
  { id: "o4-mini", object: "model", owned_by: "openai" },
];

export async function GET(req: NextRequest) {
  // Validate sub-key
  const authHeader = req.headers.get("authorization") ?? "";
  const rawKey = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!rawKey || !rawKey.startsWith("zph_live_")) {
    return NextResponse.json(
      { error: { message: "Invalid API key", type: "invalid_request_error" } },
      { status: 401 },
    );
  }

  const resolved = await resolveSubKey(rawKey).catch(() => null);
  if (!resolved) {
    return NextResponse.json(
      {
        error: { message: "API key not found", type: "invalid_request_error" },
      },
      { status: 401 },
    );
  }

  // Check if workspace has OpenAI key configured
  const { data } = await serviceSupabase
    .from("workspaces")
    .select("openai_key_enc")
    .eq("id", resolved.workspaceId)
    .single();

  if (!data?.openai_key_enc) {
    return NextResponse.json(
      {
        error: {
          message: "No OpenAI key configured for this workspace",
          type: "invalid_request_error",
        },
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    object: "list",
    data: SUPPORTED_MODELS,
  });
}
