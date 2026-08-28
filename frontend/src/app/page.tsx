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

      localStorage.setItem("user_id", data.user_id);
      router.push("/dashboard");
    } catch (err) {
      setError("Could not connect to the server");
      setLoading(false);
    }
  };

  const locationStyle = (loc: string) => {
    if (loc.toLowerCase().includes("remote")) return { bg: "#dcfce7", color: "#166534" };
    if (loc.toLowerCase().includes("hybrid")) return { bg: "#fef9c3", color: "#854d0e" };
    return { bg: "#e0e7ff", color: "#3730a3" };
  };

  return (
    <main className="auth-layout">
      {/* LEFT SIDEBAR */}
      <div className="auth-sidebar" style={{ position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ position: "absolute", top: "-10%", left: "-10%", width: "300px", height: "300px", background: "radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "-10%", width: "400px", height: "400px", background: "radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", padding: "3.5rem" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
            <div style={{ background: "white", color: "var(--primary)", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <span style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "1px" }}>InternMatch AI</span>
          </div>

          {/* Hero */}
          <h1 style={{ fontSize: "2.5rem", fontWeight: 800, lineHeight: 1.15, marginBottom: "1rem", textShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
            Your Dream Internship,<br />Just One Click Away.
          </h1>
          <p style={{ fontSize: "1.05rem", color: "#e0e7ff", maxWidth: "420px", marginBottom: "1.5rem", lineHeight: 1.6 }}>
            Upload your resume, let AI extract your skills, and instantly get matched with open opportunities.
          </p>

          {/* Feature bullets */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginBottom: "2rem" }}>
            {[
              { label: "Save Time", sub: "Automated matching via semantic vector search." },
              { label: "AI Cover Letters", sub: "Generate tailored cover letters in seconds." },
              { label: "Skill Gap Analysis", sub: "Know exactly what to learn to land the job." },
            ].map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                <div style={{ background: "rgba(255,255,255,0.1)", padding: "0.6rem", borderRadius: "50%", flexShrink: 0, width: "34px", height: "34px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700 }}>{f.label}</h3>
                  <p style={{ color: "#c7d2fe", fontSize: "0.82rem" }}>{f.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* LIVE OPPORTUNITIES PANEL */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
              <span style={{ position: "relative", display: "inline-flex", width: "10px", height: "10px" }}>
                <span className="opp-ping" />
                <span style={{ position: "relative", display: "inline-flex", borderRadius: "50%", width: "10px", height: "10px", background: "#22c55e" }} />
              </span>
              <span style={{ fontWeight: 700, fontSize: "0.85rem", letterSpacing: "0.6px", textTransform: "uppercase", color: "#e0e7ff" }}>
                Currently Open ({opportunities.length})
              </span>
            </div>

            <div className="opp-scroll">
              {opportunities.length === 0 ? (
                <p style={{ color: "#c7d2fe", fontSize: "0.9rem" }}>Loading opportunities…</p>
              ) : (
                opportunities.map((opp, i) => {
                  const lc = locationStyle(opp.location);
                  const skillList = opp.skills.split(",");
                  return (
                    <div key={i} className="opp-card">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#f1f5f9", lineHeight: 1.3 }}>{opp.title}</div>
                          <div style={{ fontSize: "0.78rem", color: "#a5b4fc", marginTop: "0.1rem" }}>{opp.company}</div>
                        </div>
                        <span style={{ fontSize: "0.7rem", fontWeight: 600, padding: "0.2rem 0.5rem", borderRadius: "50px", background: lc.bg, color: lc.color, whiteSpace: "nowrap", flexShrink: 0 }}>
                          {opp.location.split(" - ")[0]}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.45rem", flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>⏱ {opp.duration}</span>
                        {skillList.slice(0, 3).map((s, si) => (
                          <span key={si} style={{ fontSize: "0.68rem", background: "rgba(255,255,255,0.1)", color: "#e0e7ff", padding: "0.12rem 0.45rem", borderRadius: "4px" }}>
                            {s.trim()}
                          </span>
                        ))}
                        {skillList.length > 3 && (
                          <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>+{skillList.length - 3} more</span>
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

      {/* RIGHT AUTH FORM */}
      <div className="auth-content">
        <div className="auth-box">
          <h2 className="auth-title">
            {isLogin ? "Welcome Back!" : "Get Started Now"}
          </h2>
          <p className="auth-subtitle">
            {isLogin ? "Enter your credentials to access your portal." : "Join thousands of students landing top internships."}
          </p>

          <form onSubmit={handleSubmit}>
            {error && <div className="error-box">{error}</div>}

            {/* Extra fields shown only on Sign Up */}
            {!isLogin && (
              <>
                <div className="form-group">
                  <label className="form-label" htmlFor="full-name">Full Name</label>
                  <input
                    id="full-name"
                    name="full_name"
                    type="text"
                    required
                    className="form-input"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="phone">Phone Number</label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    className="form-input"
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="university">University / College</label>
                  <input
                    id="university"
                    name="university"
                    type="text"
                    className="form-input"
                    placeholder="e.g. MIT, Stanford, IIT"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="email-address">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                required
                className="form-input"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", padding: "0.85rem", fontSize: "1rem", marginTop: "0.5rem" }}
              disabled={loading}
            >
              {loading ? "Processing..." : isLogin ? "Sign In to Dashboard" : "Create Account"}
            </button>
          </form>

          <div style={{ marginTop: "2rem", textAlign: "center", borderTop: "1px solid var(--border)", paddingTop: "1.5rem" }}>
            <span style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
              {isLogin ? "New to InternMatch AI? " : "Already part of the network? "}
            </span>
            <button
              className="btn-text"
              style={{ fontWeight: 600, fontSize: "0.95rem" }}
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Sign up here" : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
