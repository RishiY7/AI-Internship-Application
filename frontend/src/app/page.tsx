"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Opportunity {
  title: string;
  company: string;
  location: string;
  duration: string;
  skills: string;
  description: string;
}

export default function Home() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [university, setUniversity] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch("http://localhost:8000/api/opportunities")
      .then((r) => r.json())
      .then((data) => setOpportunities(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const endpoint = isLogin ? "/api/login" : "/api/register";
    try {
      const body = isLogin
        ? { email, password }
        : { email, password, full_name: fullName, phone, university };
      const res = await fetch(`http://localhost:8000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Something went wrong");
        setLoading(false);
        return;
      }

      if (!isLogin) {
        // Registration successful — switch to login, do NOT auto-login
        if (fullName) localStorage.setItem("user_full_name", fullName);
        setIsLogin(true);
        setEmail("");
        setPassword("");
        setFullName("");
        setPhone("");
        setUniversity("");
        setSuccess("Account created! Please sign in.");
        setLoading(false);
        return;
      }

      // Login successful — store and navigate
      localStorage.setItem("user_id", data.user_id);
      router.push("/dashboard");
    } catch {
      setError("Could not connect to the server");
      setLoading(false);
    }
  };

  const locationStyle = (loc: string) => {
    if (loc.toLowerCase().includes("remote")) return { bg: "rgba(16,185,129,0.12)", color: "#6ee7b7", border: "rgba(16,185,129,0.25)" };
    if (loc.toLowerCase().includes("hybrid")) return { bg: "rgba(245,158,11,0.12)", color: "#fcd34d", border: "rgba(245,158,11,0.25)" };
    return { bg: "rgba(99,102,241,0.12)", color: "#a5b4fc", border: "rgba(99,102,241,0.25)" };
  };

  const features = [
    {
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
        </svg>
      ),
      label: "Semantic Matching",
      sub: "FAISS vector search aligns your skills to open roles.",
      color: "#818cf8",
    },
    {
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
        </svg>
      ),
      label: "AI Cover Letters",
      sub: "Tailored drafts generated in seconds with Gemini.",
      color: "#34d399",
    },
    {
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
      label: "Skill Gap Analysis",
      sub: "Know exactly what to learn to land the job.",
      color: "#f472b6",
    },
  ];

  return (
    <main className="auth-layout">
      {/* ── LEFT PANEL ──────────────────────────────────── */}
      <div
        className="auth-sidebar"
        style={{ position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}
      >
        {/* Decorative glows */}
        <div style={{ position: "absolute", top: "-15%", left: "-15%", width: "380px", height: "380px", background: "radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-20%", right: "-10%", width: "480px", height: "480px", background: "radial-gradient(circle, rgba(6,182,212,0.14) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "40%", left: "50%", width: "200px", height: "200px", background: "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />

        {/* Grid mesh */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.04,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />

        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", padding: "3rem" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", marginBottom: "2.5rem" }}>
            <div style={{
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
              width: "42px", height: "42px", borderRadius: "12px",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, boxShadow: "0 8px 24px rgba(99,102,241,0.4)",
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <span style={{
              fontSize: "1.3rem", fontWeight: 800, letterSpacing: "-0.3px",
              background: "linear-gradient(135deg, #e0e7ff 0%, #a5b4fc 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>
              InternMatch AI
            </span>
          </div>

          {/* Hero text */}
          <div style={{ marginBottom: "2rem" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "0.45rem",
              background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)",
              borderRadius: "50px", padding: "0.3rem 0.8rem", marginBottom: "1rem",
            }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#a5b4fc", display: "inline-block" }} />
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#a5b4fc", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                Powered by Groq + Gemini
              </span>
            </div>
            <h1 style={{ fontSize: "2.4rem", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-1px", color: "white", marginBottom: "0.85rem" }}>
              Your Dream Internship,{" "}
              <span style={{
                background: "linear-gradient(135deg, #a5b4fc 0%, #38bdf8 50%, #34d399 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>
                Just One Click Away.
              </span>
            </h1>
            <p style={{ fontSize: "0.95rem", color: "rgba(200,210,255,0.7)", lineHeight: 1.7, maxWidth: "380px" }}>
              Upload your resume. AI extracts your skills and instantly matches you to the best open opportunities.
            </p>
          </div>

          {/* Feature bullets */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "2.5rem" }}>
            {features.map((f, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: "0.85rem",
                padding: "0.75rem 0.9rem",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "10px",
                transition: "background 0.2s",
              }}>
                <div style={{
                  background: `${f.color}20`,
                  border: `1px solid ${f.color}35`,
                  color: f.color, width: "32px", height: "32px",
                  borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "white", marginBottom: "0.1rem" }}>{f.label}</div>
                  <div style={{ fontSize: "0.78rem", color: "rgba(200,210,255,0.6)" }}>{f.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Live opportunities */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
              <span style={{ position: "relative", display: "inline-flex", width: "10px", height: "10px" }}>
                <span className="opp-ping" />
                <span style={{ position: "relative", display: "inline-flex", borderRadius: "50%", width: "10px", height: "10px", background: "#22c55e" }} />
              </span>
              <span style={{ fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.8px", textTransform: "uppercase", color: "rgba(200,210,255,0.6)" }}>
                Live Listings — {opportunities.length} Open
              </span>
            </div>

            <div className="opp-scroll">
              {opportunities.length === 0 ? (
                <div style={{ color: "rgba(160,160,200,0.5)", fontSize: "0.85rem", textAlign: "center", paddingTop: "1.5rem" }}>
                  Loading opportunities…
                </div>
              ) : (
                opportunities.map((opp, i) => {
                  const lc = locationStyle(opp.location);
                  const skillList = opp.skills.split(",");
                  return (
                    <div key={i} className="opp-card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "#e0e7ff", lineHeight: 1.3 }}>{opp.title}</div>
                          <div style={{ fontSize: "0.76rem", color: "rgba(160,170,240,0.7)", marginTop: "0.1rem" }}>{opp.company}</div>
                        </div>
                        <span style={{
                          fontSize: "0.66rem", fontWeight: 700, padding: "0.18rem 0.55rem",
                          borderRadius: "50px", background: lc.bg, color: lc.color,
                          border: `1px solid ${lc.border}`, whiteSpace: "nowrap", flexShrink: 0,
                        }}>
                          {opp.location.split(" - ")[0]}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "0.35rem", marginTop: "0.45rem", flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontSize: "0.7rem", color: "rgba(130,140,200,0.6)" }}>⏱ {opp.duration}</span>
                        {skillList.slice(0, 3).map((s, si) => (
                          <span key={si} style={{
                            fontSize: "0.65rem", background: "rgba(99,102,241,0.12)", color: "#a5b4fc",
                            border: "1px solid rgba(99,102,241,0.2)", padding: "0.1rem 0.4rem", borderRadius: "4px", fontWeight: 600,
                          }}>
                            {s.trim()}
                          </span>
                        ))}
                        {skillList.length > 3 && (
                          <span style={{ fontSize: "0.65rem", color: "rgba(130,140,200,0.5)" }}>+{skillList.length - 3}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT AUTH PANEL ───────────────────────────── */}
      <div className="auth-content">
        <div className="auth-box">
          {/* Card wrapper */}
          <div style={{
            background: "rgba(22,22,31,0.85)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "24px",
            padding: "2.5rem",
            boxShadow: "0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.08)",
          }}>
            {/* Tab toggle */}
            <div style={{
              display: "flex", background: "rgba(255,255,255,0.04)", borderRadius: "10px",
              padding: "4px", marginBottom: "2rem", border: "1px solid rgba(255,255,255,0.06)",
            }}>
              {["Sign In", "Sign Up"].map((tab, i) => {
                const active = (i === 0) === isLogin;
                return (
                  <button
                    key={tab}
                    onClick={() => { setIsLogin(i === 0); setError(""); }}
                    style={{
                      flex: 1, padding: "0.55rem", borderRadius: "7px", fontSize: "0.85rem",
                      fontWeight: 600, border: "none", cursor: "pointer", transition: "all 0.2s",
                      background: active ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "transparent",
                      color: active ? "white" : "rgba(160,160,200,0.6)",
                      boxShadow: active ? "0 4px 12px rgba(99,102,241,0.3)" : "none",
                    }}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f0f0ff", marginBottom: "0.3rem", letterSpacing: "-0.4px" }}>
              {isLogin ? "Welcome back 👋" : "Create your account"}
            </h2>
            <p style={{ color: "rgba(160,160,200,0.65)", fontSize: "0.875rem", marginBottom: "1.75rem" }}>
              {isLogin ? "Sign in to access your personalized dashboard." : "Join thousands landing top internships with AI."}
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              {error && <div className="error-box">{error}</div>}
              {success && (
                <div style={{
                  background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)",
                  color: "#34d399", borderRadius: "8px", padding: "0.65rem 1rem",
                  fontSize: "0.85rem", fontWeight: 600, marginBottom: "1rem",
                }}>
                  ✓ {success}
                </div>
              )}

              {/* Register-only fields */}
              {!isLogin && (
                <>
                  <div className="form-group">
                    <label className="form-label" htmlFor="full-name">Full Name</label>
                    <input id="full-name" name="full_name" type="text" required className="form-input"
                      placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="phone">Phone</label>
                      <input id="phone" name="phone" type="tel" className="form-input"
                        placeholder="+1 555-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="university">University</label>
                      <input id="university" name="university" type="text" className="form-input"
                        placeholder="e.g. MIT, IIT" value={university} onChange={(e) => setUniversity(e.target.value)} />
                    </div>
                  </div>
                </>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="email-address">Email Address</label>
                <div style={{ position: "relative" }}>
                  <svg style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "rgba(160,160,200,0.4)", pointerEvents: "none" }}
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <input id="email-address" name="email" type="email" required className="form-input"
                    style={{ paddingLeft: "2.5rem" }}
                    placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                <label className="form-label" htmlFor="password">Password</label>
                <div style={{ position: "relative" }}>
                  <svg style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "rgba(160,160,200,0.4)", pointerEvents: "none" }}
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input id="password" name="password" type="password" required className="form-input"
                    style={{ paddingLeft: "2.5rem" }}
                    placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%", padding: "0.85rem", fontSize: "0.95rem", fontWeight: 700,
                  borderRadius: "10px", border: "none", cursor: loading ? "not-allowed" : "pointer",
                  backgroundImage: loading ? "none" : "linear-gradient(135deg, #6366f1 0%, #8b5cf6 60%, #06b6d4 100%)",
                  backgroundColor: loading ? "rgba(99,102,241,0.4)" : "transparent",
                  backgroundSize: "200% 200%",
                  color: "white", transition: "all 0.3s",
                  boxShadow: loading ? "none" : "0 8px 24px rgba(99,102,241,0.35)",
                  animation: loading ? "none" : "gradient-shift 4s ease infinite",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? (
                  <>
                    <span style={{ display: "inline-block", width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                    Processing…
                  </>
                ) : isLogin ? (
                  <>Sign In to Dashboard →</>
                ) : (
                  <>Create Account →</>
                )}
              </button>
            </form>

            <div style={{ marginTop: "1.5rem", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "1.25rem" }}>
              <span style={{ color: "rgba(160,160,200,0.5)", fontSize: "0.875rem" }}>
                {isLogin ? "New to InternMatch AI? " : "Already have an account? "}
              </span>
              <button
                style={{ background: "transparent", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "0.875rem", color: "#818cf8", fontFamily: "inherit" }}
                onClick={() => { setIsLogin(!isLogin); setError(""); }}
              >
                {isLogin ? "Sign up free" : "Sign in"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
