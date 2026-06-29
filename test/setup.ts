// ── Test Environment Setup ────────────────────────────────────────────────────
// Sets required env vars before any imports that validate at module load time.
// NOTE: Vitest runs with NODE_ENV=test by default — do not try to set it here.

// 64-char hex key for AES-256-GCM encryption (lib/crypto.ts validates at import)
process.env.ENCRYPTION_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

// Supabase — not used in unit tests (mocked), but required to avoid import crashes
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";

// Upstash — not used in unit tests (mocked)
process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

// App
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
