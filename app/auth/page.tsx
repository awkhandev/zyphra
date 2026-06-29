"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [alreadyLoggedIn, setAlreadyLoggedIn] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Check if user is already logged in — if so, show dashboard link
  useEffect(() => {
    let cancelled = false;
    async function checkSession() {
      try {
        const { createBrowserSupabase } =
          await import("@/lib/supabase-browser");
        const supabase = createBrowserSupabase();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!cancelled && user) setAlreadyLoggedIn(true);
      } catch {
        // Not logged in — that's fine
      } finally {
        if (!cancelled) setCheckingSession(false);
      }
    }
    checkSession();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSignOut() {
    const { createBrowserSupabase } = await import("@/lib/supabase-browser");
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    setAlreadyLoggedIn(false);
    setPassword("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const { createBrowserSupabase } = await import("@/lib/supabase-browser");
      const supabase = createBrowserSupabase();
      if (mode === "signup") {
        const redirectTo = `${window.location.origin}/auth`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo },
        });
        if (error) throw error;
        setInfo("Check your email to confirm your account, then log in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/dashboard");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const inp: React.CSSProperties = {
    width: "100%",
    background: "#18181C",
    border: "1px solid #1E1E24",
    borderRadius: 7,
    color: "#F0F0F4",
    fontSize: 14,
    padding: "10px 12px",
    outline: "none",
    boxSizing: "border-box" as const,
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0A0A0B",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        fontFamily: "Inter,system-ui,sans-serif",
      }}
    >
      <a
        href="/"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: "2rem",
          textDecoration: "none",
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            background: "#6366F1",
            borderRadius: 7,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ color: "white", fontWeight: 700, fontSize: 14 }}>
            T
          </span>
        </div>
        <span style={{ color: "#F0F0F4", fontWeight: 600, fontSize: 16 }}>
          Zyphra
        </span>
      </a>

      <div
        style={{
          background: "#111113",
          border: "1px solid #1E1E24",
          borderRadius: 12,
          padding: "2rem",
          width: "100%",
          maxWidth: 380,
        }}
      >
        {/* Already logged in state */}
        {alreadyLoggedIn && !checkingSession ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👋</div>
            <h1 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 600 }}>
              You&apos;re already signed in
            </h1>
            <p
              style={{
                margin: "0 0 1.5rem",
                fontSize: 13,
                color: "#9898A6",
                lineHeight: 1.6,
              }}
            >
              Go to your dashboard, or sign out to use a different account.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={() => router.push("/dashboard")}
                style={{
                  width: "100%",
                  background: "#6366F1",
                  color: "white",
                  fontWeight: 500,
                  fontSize: 14,
                  padding: "10px 0",
                  borderRadius: 7,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Go to dashboard →
              </button>
              <button
                onClick={handleSignOut}
                style={{
                  width: "100%",
                  background: "transparent",
                  color: "#9898A6",
                  fontWeight: 500,
                  fontSize: 14,
                  padding: "10px 0",
                  borderRadius: 7,
                  border: "1px solid #1E1E24",
                  cursor: "pointer",
                }}
              >
                Sign out and use a different account
              </button>
            </div>
          </div>
        ) : checkingSession ? (
          /* Loading state */
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <p style={{ color: "#56565F", fontSize: 13 }}>Loading…</p>
          </div>
        ) : (
          /* Login / Signup form */
          <>
            <div
              style={{
                display: "flex",
                gap: 4,
                marginBottom: "1.5rem",
                background: "#18181C",
                borderRadius: 8,
                padding: 4,
              }}
            >
              {(["signup", "login"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    setError("");
                    setInfo("");
                  }}
                  style={{
                    flex: 1,
                    padding: "7px 0",
                    fontSize: 14,
                    fontWeight: 500,
                    borderRadius: 6,
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    background: mode === m ? "#6366F1" : "transparent",
                    color: mode === m ? "white" : "#9898A6",
                  }}
                >
                  {m === "signup" ? "Sign up" : "Log in"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "0.75rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    color: "#9898A6",
                    marginBottom: 6,
                  }}
                >
                  Email
                </label>
                <input
                  type="email"
                  style={inp}
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    color: "#9898A6",
                    marginBottom: 6,
                  }}
                >
                  Password
                </label>
                <input
                  type="password"
                  style={inp}
                  placeholder="••••••••"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && (
                <p
                  style={{
                    fontSize: 12,
                    color: "#EF4444",
                    background: "rgba(239,68,68,0.1)",
                    padding: "8px 12px",
                    borderRadius: 6,
                    marginBottom: "0.75rem",
                  }}
                >
                  {error}
                </p>
              )}
              {info && (
                <p
                  style={{
                    fontSize: 12,
                    color: "#10B981",
                    background: "rgba(16,185,129,0.1)",
                    padding: "8px 12px",
                    borderRadius: 6,
                    marginBottom: "0.75rem",
                  }}
                >
                  {info}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  background: "#6366F1",
                  color: "white",
                  fontWeight: 500,
                  fontSize: 14,
                  padding: "10px 0",
                  borderRadius: 7,
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading
                  ? "Please wait…"
                  : mode === "signup"
                    ? "Create free account"
                    : "Log in"}
              </button>
            </form>
          </>
        )}
      </div>

      <p
        style={{
          marginTop: "1.5rem",
          fontSize: 12,
          color: "#56565F",
          textAlign: "center",
        }}
      >
        Your Anthropic key is encrypted with AES-256 before storage.
      </p>
    </main>
  );
}
