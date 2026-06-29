import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Safe to import in client components — no next/headers dependency
export function createBrowserSupabase() {
  return createBrowserClient(url, anon);
}
