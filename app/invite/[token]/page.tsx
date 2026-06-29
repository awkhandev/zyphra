"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { serviceSupabase } from "@/lib/supabase-server";

type InviteInfo = {
  workspaceName: string;
  role: string;
  inviterEmail: string;
  expired: boolean;
  accepted: boolean;
};

const btn: React.CSSProperties = {
  background: "#6366F1",
  color: "white",
  border: "none",
  borderRadius: 8,
  padding: "11px 24px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  width: "100%",
};
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

export default function AcceptInvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // Fetch invite details
  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/invites/accept?token=${token}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Invalid invite link");
        setLoading(false);
        return;
      }
      setInvite(data);
      setLoading(false);

      // If user is already logged in, accept immediately
      const { createBrowserSupabase } = await import("@/lib/supabase-browser");
      const supabase = createBrowserSupabase();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await acceptInvite(user.id, supabase);
      }
    }
    load();
    /* eslint-disable react-hooks/exhaustive-deps */
  }, [token]);
  /* eslint-enable react-hooks/exhaustive-deps */

  async function acceptInvite(
    userId: string,
    supabase: ReturnType<
      (typeof import("@/lib/supabase-browser"))["createBrowserSupabase"]
    >,
  ) {
    setWorking(true);
    try {
      const res = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDone(true);
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to accept invite");
      setWorking(false);
    }
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setWorking(true);
    setError("");
    try {
      const { createBrowserSupabase } = await import("@/lib/supabase-browser");
      const supabase = createBrowserSupabase();

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/invite/${token}`,
          },
        });
        if (error) throw error;
        if (!data.session) {
          // Email confirmation required
          setError("");
          setWorking(false);
          setError("Check your email to confirm, then come back to this link.");
          return;
        }
        await acceptInvite(data.user!.id, supabase);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        await acceptInvite(data.user.id, supabase);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Authentication failed");
      setWorking(false);
    }
  }

  if (loading)
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#0A0A0B",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter,system-ui,sans-serif",
        }}
      >
        <p style={{ color: "#9898A6" }}>Loading invite…</p>
      </main>
    );

  if (done)
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#0A0A0B",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter,system-ui,sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <h1
            style={{
              color: "#F0F0F4",
              fontSize: 22,
              fontWeight: 700,
              margin: "0 0 8px",
            }}
          >
            You&apos;re in!
          </h1>
          <p style={{ color: "#9898A6", fontSize: 14 }}>
            Redirecting to your dashboard…
          </p>
        </div>
      </main>
    );

  const card: React.CSSProperties = {
    background: "#111113",
    border: "1px solid #1E1E24",
    borderRadius: 12,
    padding: "2rem",
    width: "100%",
    maxWidth: 400,
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
        color: "#F0F0F4",
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            background: "#6366F1",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ color: "white", fontWeight: 700 }}>T</span>
        </div>
        <span style={{ fontWeight: 700, fontSize: 17 }}>Zyphra</span>
      </div>

      <div style={card}>
        {invite?.expired || invite?.accepted || error ? (
          /* ── Invalid / expired / already accepted ── */
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>
              {invite?.expired ? "⏰" : invite?.accepted ? "✅" : "❌"}
            </div>
            <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 600 }}>
              {invite?.expired
                ? "Invite expired"
                : invite?.accepted
                  ? "Already accepted"
                  : "Invalid invite"}
            </h2>
            <p style={{ color: "#9898A6", fontSize: 13, margin: "0 0 20px" }}>
              {invite?.expired
                ? "This invite link has expired. Ask your workspace admin to resend it."
                : invite?.accepted
                  ? "This invite has already been used."
                  : error}
            </p>
            <button onClick={() => router.push("/")} style={btn}>
              Go to Zyphra →
            </button>
          </div>
        ) : invite ? (
          /* ── Valid invite — show workspace info + auth ── */
          <div>
            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>👋</div>
              <h1 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700 }}>
                You&apos;ve been invited
              </h1>
              <p
                style={{
                  color: "#9898A6",
                  fontSize: 14,
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                Join{" "}
                <strong style={{ color: "#F0F0F4" }}>
                  {invite.workspaceName}
                </strong>{" "}
                on Zyphra as a{" "}
                <span style={{ color: "#818CF8" }}>{invite.role}</span>
              </p>
            </div>

            {/* Auth tabs */}
            <div
              style={{
                display: "flex",
                gap: 4,
                marginBottom: "1.25rem",
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
                  }}
                  style={{
                    flex: 1,
                    padding: "7px 0",
                    fontSize: 14,
                    fontWeight: 500,
                    borderRadius: 6,
                    border: "none",
                    cursor: "pointer",
                    background: mode === m ? "#6366F1" : "transparent",
                    color: mode === m ? "white" : "#9898A6",
                  }}
                >
                  {m === "signup" ? "Create account" : "Log in"}
                </button>
              ))}
            </div>

            <form onSubmit={handleAuth}>
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
                    color: error.includes("Check your email")
                      ? "#10B981"
                      : "#EF4444",
                    background: error.includes("Check your email")
                      ? "rgba(16,185,129,0.1)"
                      : "rgba(239,68,68,0.1)",
                    padding: "8px 12px",
                    borderRadius: 6,
                    marginBottom: "0.75rem",
                  }}
                >
                  {error}
                </p>
              )}

              <button type="submit" style={btn} disabled={working}>
                {working
                  ? "Please wait…"
                  : mode === "signup"
                    ? "Create account & join →"
                    : "Log in & join →"}
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </main>
  );
}
