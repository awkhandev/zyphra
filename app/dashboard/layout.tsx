import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";

/**
 * Dashboard layout — server-side auth guard.
 * Unauthenticated users are redirected to /auth before any dashboard page renders.
 * This is defense-in-depth alongside the middleware auth check.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  return <>{children}</>;
}
