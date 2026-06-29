import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

// ── Schema: POST /api/workspace ──────────────────────────────────────────────
export const WorkspaceCreateSchema = z.object({
  name: z.string().min(1).max(100),
  anthropicKey: z.string().min(10),
});

// ── Schema: POST /api/keys ───────────────────────────────────────────────────
export const KeyCreateSchema = z.object({
  workspaceId: z.string().uuid(),
  label: z.string().min(1).max(100),
  monthlyBudgetUsd: z.number().min(0).max(100000).optional(),
  dailyRequestLimit: z.number().min(0).max(100000).int().optional(),
});

// ── Schema: POST /api/invites ────────────────────────────────────────────────
export const InviteCreateSchema = z.object({
  workspaceId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["member", "admin"]).optional(),
});

// ── Schema: POST /api/invites/accept ─────────────────────────────────────────
export const InviteAcceptSchema = z.object({
  token: z.string().min(10).max(200),
});

// ── Schema: POST /api/billing/checkout ───────────────────────────────────────
export const CheckoutSchema = z.object({
  plan: z.enum(["free", "starter", "team", "business"]),
});

// ── Schema: POST /api/workspace/openai ───────────────────────────────────────
export const OpenAISaveSchema = z.object({
  openaiKey: z.string().min(10).max(200),
});

// ── Schema: POST /api/workspace/keypool ──────────────────────────────────────
export const KeyPoolAddSchema = z.object({
  workspaceId: z.string().uuid(),
  provider: z.enum(["anthropic", "openai"]),
  apiKey: z.string().min(10),
  label: z.string().min(1).max(100),
  priority: z.number().min(0).max(100).int().optional(),
  dailyLimit: z.number().min(0).max(100000).int().nullable().optional(),
});

// ── Schema: PUT /api/workspace/routing ───────────────────────────────────────
export const RoutingUpdateSchema = z.object({
  workspaceId: z.string().uuid(),
  routingEnabled: z.boolean().optional(),
  routingConfig: z
    .object({
      simple: z.string().min(1),
      medium: z.string().min(1),
      complex: z.string().min(1),
    })
    .optional(),
  routingConfigOpenai: z
    .object({
      simple: z.string().min(1),
      medium: z.string().min(1),
      complex: z.string().min(1),
    })
    .optional(),
});

// ── Schema: PUT /api/workspace/cache ─────────────────────────────────────────
export const CacheUpdateSchema = z.object({
  workspaceId: z.string().uuid(),
  cacheEnabled: z.boolean().optional(),
  cacheTtlHours: z.number().min(1).max(720).optional(),
});

// ── Validation helper ────────────────────────────────────────────────────────
// Validates request body against a Zod schema. Returns NextResponse on failure, null on success.
export async function validateBody<T>(
  req: NextRequest,
  schema: z.ZodSchema<T>,
): Promise<{ data: T } | { error: NextResponse }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return {
      error: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    const firstError = result.error.issues[0];
    const field = firstError.path.join(".");
    const msg = field ? `${field}: ${firstError.message}` : firstError.message;
    return {
      error: NextResponse.json(
        { error: `Invalid request: ${msg}` },
        { status: 400 },
      ),
    };
  }

  return { data: result.data };
}
