import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

// Only initialize if Upstash is configured
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// ── Rate limit configurations per endpoint type ──────────────────────────────
const LIMITS = {
  auth: { window: "60 s", max: 5 }, // login/signup attempts
  workspace: { window: "60 s", max: 5 }, // workspace creation
  keys: { window: "60 s", max: 10 }, // key CRUD
  invites: { window: "60 s", max: 5 }, // invite creation
  billing: { window: "60 s", max: 10 }, // checkout/portal
  proxy: { window: "60 s", max: 120 }, // API proxy (generous)
  general: { window: "60 s", max: 30 }, // everything else
} as const;

type LimitType = keyof typeof LIMITS;

// ── Create ratelimit instances (lazy, one per type) ──────────────────────────
const ratelimits: Record<LimitType, Ratelimit | null> = {} as Record<
  LimitType,
  Ratelimit | null
>;

function getRatelimit(type: LimitType): Ratelimit | null {
  if (!redis) return null;
  if (!ratelimits[type]) {
    const cfg = LIMITS[type];
    ratelimits[type] = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(cfg.max, cfg.window),
      analytics: false,
      prefix: `zyphra:${type}`,
    });
  }
  return ratelimits[type];
}

// ── Extract client IP from request ───────────────────────────────────────────
function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1"
  );
}

// ── Main rate limit check ────────────────────────────────────────────────────
export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
  reset: number; // unix timestamp (seconds)
};

export async function checkRateLimit(
  req: NextRequest,
  type: LimitType = "general",
): Promise<RateLimitResult> {
  const rl = getRatelimit(type);
  if (!rl) {
    // Upstash not configured — allow all requests (dev mode)
    return { allowed: true, remaining: 999, limit: 999, reset: 0 };
  }

  const ip = getClientIp(req);
  const key = `${ip}:${type}`;
  const { success, limit, remaining, reset } = await rl.limit(key);

  return { allowed: success, remaining, limit, reset };
}

// ── Apply rate limit to a request — returns NextResponse if blocked ───────────
export async function rateLimitOrPass(
  req: NextRequest,
  type: LimitType = "general",
): Promise<NextResponse | null> {
  const result = await checkRateLimit(req, type);

  if (!result.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded",
        retryAfter: Math.ceil(result.reset - Date.now() / 1000),
        limit: result.limit,
        remaining: result.remaining,
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": String(result.remaining),
          "X-RateLimit-Reset": String(result.reset),
          "Retry-After": String(Math.ceil(result.reset - Date.now() / 1000)),
        },
      },
    );
  }

  return null; // allowed — no response, continue to handler
}
