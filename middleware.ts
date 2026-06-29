import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  generateCsrfToken,
  setCsrfCookie,
  validateCsrfToken,
} from "@/lib/csrf";

// Methods that require CSRF validation
const STATE_MUTATING_METHODS = ["POST", "PUT", "DELETE", "PATCH"];

// API routes that require CSRF protection (state-changing)
// GET requests are safe (idempotent) — no CSRF needed
const CSRF_PROTECTED_ROUTES = [
  "/api/workspace",
  "/api/keys",
  "/api/invites",
  "/api/billing",
  "/api/workspace/openai",
  "/api/workspace/keypool",
  "/api/workspace/routing",
  "/api/workspace/cache",
];

function needsCsrfProtection(pathname: string, method: string): boolean {
  if (!STATE_MUTATING_METHODS.includes(method)) return false;
  return CSRF_PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // CSRF protection for state-changing API routes
  const { pathname } = request.nextUrl;
  if (needsCsrfProtection(pathname, request.method)) {
    if (!validateCsrfToken(request)) {
      return NextResponse.json(
        { error: "Invalid or missing CSRF token" },
        { status: 403 },
      );
    }
  }

  // Ensure CSRF cookie exists on every response (sets if missing)
  if (!request.cookies.get("csrf-token")) {
    const token = generateCsrfToken();
    setCsrfCookie(supabaseResponse, token);
  }

  // Must call getUser() to refresh the session token
  let user = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data?.user;
  } catch {
    // Auth check failed — treat as unauthenticated
    user = null;
  }

  const { pathname: path } = request.nextUrl;

  // Logged-in users on /auth → send to dashboard
  if (user && path === "/auth") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Unauthenticated users on /dashboard → send to /auth
  if (!user && path.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/auth", "/dashboard/:path*", "/api/:path*"],
};
