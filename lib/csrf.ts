import { NextRequest, NextResponse } from "next/server";

// ── CSRF Token Generation ────────────────────────────────────────────────────
// Double-submit cookie pattern:
// 1. Server sets a random token in an HttpOnly cookie
// 2. Client sends the same token in X-CSRF-Token header
// 3. Server compares the two — they must match
//
// Uses Web Crypto API (Edge-compatible) instead of Node.js crypto module.

const CSRF_COOKIE_NAME = "csrf-token";
const CSRF_HEADER_NAME = "x-csrf-token";
const TOKEN_LENGTH = 32;

/**
 * Generate a new CSRF token using Web Crypto API (Edge-compatible).
 * Returns a random hex string.
 */
export function generateCsrfToken(): string {
  const bytes = new Uint8Array(TOKEN_LENGTH);
  crypto.getRandomValues(bytes);
  // Convert to hex string
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Set a CSRF token cookie on the response.
 * Called by middleware on every state-changing request.
 */
export function setCsrfCookie(
  response: NextResponse,
  token: string,
): NextResponse {
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // JS needs to read it to put in header
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60, // 1 hour
  });
  return response;
}

/**
 * Constant-time string comparison to prevent timing attacks.
 * XORs every byte and accumulates differences — returns true only if all match.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Validate the CSRF token from the request header against the cookie.
 * Returns true if valid, false if missing or mismatched.
 */
export function validateCsrfToken(req: NextRequest): boolean {
  const headerToken = req.headers.get(CSRF_HEADER_NAME);
  const cookieToken = req.cookies.get(CSRF_COOKIE_NAME)?.value;

  if (!headerToken || !cookieToken) return false;

  return timingSafeEqual(headerToken, cookieToken);
}
