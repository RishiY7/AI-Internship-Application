"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analysisStep, setAnalysisStep] = useState("");
  const [matches, setMatches] = useState<any>(null);
  const [resumes, setResumes] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [oppSearch, setOppSearch] = useState("");
  const [oppFilter, setOppFilter] = useState("All");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loadingInsights, setLoadingInsights] = useState<string | null>(null);
  const [loadingCoverLetter, setLoadingCoverLetter] = useState<string | null>(null);
  const [loadingSkillGap, setLoadingSkillGap] = useState<string | null>(null);
  const [insightsData, setInsightsData] = useState<Record<string, any>>({});
  const [profileSaved, setProfileSaved] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  // --- Chat state ---
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [profile, setProfile] = useState({
    fullName: "", phone: "", location: "", dateOfBirth: "", gender: "", bio: "",
    linkedin: "", github: "", portfolio: "", twitter: "",
    degree: "", major: "", university: "", graduationYear: "", gpa: "",
    preferredRoles: "", preferredLocations: "", workType: "",
    availableFrom: "", openToRelocate: "", internshipDuration: "",
    certifications: "", languages: "", hobbies: "", achievements: "",
  });

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();
  const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;

  useEffect(() => {
    if (!userId) { router.push("/"); return; }
    fetchMatches();
    fetchResumes();
    fetchOpportunities();
    fetchChatSessions();
    // Load saved profile, merging in the stored full_name from signup
    const saved = localStorage.getItem("profile_" + userId);
    const storedName = localStorage.getItem("user_full_name");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!parsed.fullName && storedName) parsed.fullName = storedName;
      setProfile(parsed);
    } else if (storedName) {
      setProfile(prev => ({ ...prev, fullName: storedName }));
    }
  }, [userId, router]);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Theme: init from localStorage, apply to <html>
  useEffect(() => {
    const saved = (localStorage.getItem("theme") as "dark" | "light") || "dark";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  const fetchOpportunities = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/opportunities");
      if (res.ok) {
        const data = await res.json();
        setOpportunities(Array.isArray(data) ? data : []);
      }
    } catch { console.log("Failed to fetch opportunities"); }
  };

  const fetchMatches = async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/matches/${userId}?requesting_user_id=${userId}`);
      if (res.ok) setMatches(await res.json());
    } catch { console.log("Failed to fetch matches"); }
  };

  const fetchResumes = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/resumes/" + userId);
      if (res.ok) setResumes(await res.json());
    } catch { console.log("Failed to fetch resumes"); }
  };

  // --- Chat helpers ---
  const fetchChatSessions = async () => {
    if (!userId) return;
    try {
      const res = await fetch(`http://localhost:8000/api/chat/sessions/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setChatSessions(data.sessions || []);
      }
    } catch { console.log("Failed to fetch chat sessions"); }
  };

  const createNewSession = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/chat/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: Number(userId) }),
      });
      if (res.ok) {
        const data = await res.json();
        setChatSessionId(data.session_id);
        setChatMessages([]);
        await fetchChatSessions();
      }
    } catch { console.log("Failed to create session"); }
  };

  const loadSessionHistory = async (sessionId: string) => {
    setChatSessionId(sessionId);
    try {
      const res = await fetch(`http://localhost:8000/api/chat/history/${userId}/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data.messages || []);
      }
    } catch { console.log("Failed to load history"); }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading || !chatSessionId) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: userMsg, id: Date.now() }]);
    setChatLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: Number(userId), session_id: chatSessionId, message: userMsg }),
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(prev => [...prev, { role: "assistant", content: data.response, source_chunks: data.source_chunks, id: Date.now() + 1 }]);
      } else {
        setChatMessages(prev => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again.", id: Date.now() + 1 }]);
      }
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Could not reach the server. Please check the backend.", id: Date.now() + 1 }]);
    } finally {
      setChatLoading(false);
    }
  };

  /** Poll /api/analysis_status/{userId} until done, then load matches */
  const pollUntilDone = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch("http://localhost:8000/api/analysis_status/" + userId);
        const { status, step } = await res.json();
        setAnalysisStep(step || "");
        if (status === "done") {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setUploading(false);
          setAnalysisStep("");
          await fetchMatches();
          await fetchResumes();
        } else if (status === "error") {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setUploading(false);
          setError("Analysis failed: " + step);
          setAnalysisStep("");
        }
      } catch {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        setUploading(false);
      }
    }, 1500);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !userId) return;
    setUploading(true); setError(""); setAnalysisStep("Uploading resume…");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("http://localhost:8000/api/upload_resume?user_id=" + userId, { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        setError(err.detail || "Upload failed");
        setUploading(false); setAnalysisStep("");
      } else {
        // Upload returned — now poll for background matching progress
        pollUntilDone();
      }
    } catch {
      setError("Network error during upload");
      setUploading(false); setAnalysisStep("");
    }
  };


  const activateResume = async (resumeId: number) => {
    try {
      const res = await fetch("http://localhost:8000/api/resumes/" + resumeId + "/activate?user_id=" + userId, { method: "POST" });
      if (res.ok) { fetchResumes(); fetchMatches(); }
    } catch { console.log("Error activating resume"); }
  };

  const handleGenerateCoverLetter = async (company: string, title: string) => {
    const key = company + "-" + title;
    setLoadingCoverLetter(key);
    try {
      const res = await fetch("http://localhost:8000/api/generate_insights", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: parseInt(userId as string), company, title }),
      });
      if (res.ok) {
        const json = await res.json();
        setInsightsData(prev => ({ ...prev, [key]: { ...prev[key], cover_letter: json.cover_letter, skill_gap: prev[key]?.skill_gap } }));
      }
    } catch { console.log("Error generating cover letter"); }
    finally { setLoadingCoverLetter(null); }
  };

  const handleGenerateSkillGap = async (company: string, title: string) => {
    const key = company + "-" + title;
    setLoadingSkillGap(key);
    try {
      const res = await fetch("http://localhost:8000/api/generate_insights", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: parseInt(userId as string), company, title }),
      });
      if (res.ok) {
        const json = await res.json();
        setInsightsData(prev => ({ ...prev, [key]: { ...prev[key], skill_gap: json.skill_gap, cover_letter: prev[key]?.cover_letter } }));
      }
    } catch { console.log("Error generating skill gap"); }
    finally { setLoadingSkillGap(null); }
  };

  const handleProfileChange = (field: string, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    setProfileSaved(false);
  };

  const handleProfileSave = () => {
    localStorage.setItem("profile_" + userId, JSON.stringify(profile));
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  };

  // Split helpers
  const splitLines = (s: string) => s.split(/\n|;/).map(l => l.trim()).filter(Boolean);
  const splitComma = (s: string) => s.split(",").map(l => l.trim()).filter(Boolean);

  const profileField = (label: string, field: string, type = "text", placeholder = "") => (
    <div className="form-group" style={{ marginBottom: "1rem" }}>
      <label className="form-label">{label}</label>
      <input type={type} className="form-input" placeholder={placeholder || label}
        value={(profile as any)[field]} onChange={e => handleProfileChange(field, e.target.value)} />
    </div>
  );

  const profileTextarea = (label: string, field: string, placeholder = "", rows = 3) => (
    <div className="form-group" style={{ marginBottom: "1rem" }}>
      <label className="form-label">{label}</label>
      <textarea className="form-input" placeholder={placeholder} rows={rows}
        value={(profile as any)[field]} onChange={e => handleProfileChange(field, e.target.value)}
        style={{ resize: "vertical" }} />
    </div>
  );

  const profileSelect = (label: string, field: string, options: string[]) => (
    <div className="form-group" style={{ marginBottom: "1rem" }}>
      <label className="form-label">{label}</label>
      <select className="form-input" value={(profile as any)[field]}
        onChange={e => handleProfileChange(field, e.target.value)}>
        <option value="">Select…</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  const sectionTitle = (title: string, icon: React.ReactNode) => (
    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem", paddingBottom: "0.65rem", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ color: "#818cf8" }}>{icon}</div>
      <h3 style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-main)", letterSpacing: "-0.1px" }}>{title}</h3>
    </div>
  );

  const scoreColor = (score: number) => {
    if (score >= 75) return { fg: "#34d399", bg: "rgba(52,211,153,0.12)", bar: "#10b981", border: "rgba(52,211,153,0.25)" };
    if (score >= 50) return { fg: "#fbbf24", bg: "rgba(251,191,36,0.12)", bar: "#f59e0b", border: "rgba(251,191,36,0.25)" };
    return { fg: "#f87171", bg: "rgba(248,113,113,0.12)", bar: "#ef4444", border: "rgba(248,113,113,0.25)" };
  };

  const candidate = matches?.candidate;
  const displayName = candidate?.name || profile.fullName || "User";

  return (
    <div className="portal-layout">
      <aside className="portal-sidebar">
        <div className="sidebar-header">
          <div style={{
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            width: "30px", height: "30px", borderRadius: "8px",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            boxShadow: "0 4px 12px rgba(99,102,241,0.4)",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          InternMatch
        </div>
        <nav className="sidebar-nav">
          <button className={"nav-item " + (activeTab === "dashboard" ? "active" : "")} onClick={() => setActiveTab("dashboard")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
            </svg>
            Dashboard
          </button>
          <button className={"nav-item " + (activeTab === "opportunities" ? "active" : "")} onClick={() => setActiveTab("opportunities")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
            </svg>
            Opportunities
          </button>
          <button className={"nav-item " + (activeTab === "profile" ? "active" : "")} onClick={() => setActiveTab("profile")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
            My Profile
          </button>
          <button className={"nav-item " + (activeTab === "settings" ? "active" : "")} onClick={() => setActiveTab("settings")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Settings
          </button>
          <button className={"nav-item " + (activeTab === "chat" ? "active" : "")} onClick={() => { setActiveTab("chat"); fetchChatSessions(); }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Product Assistant
          </button>
          <div style={{ flex: 1 }} />
          <button className="nav-item" style={{ color: "#ef4444" }} onClick={() => { localStorage.removeItem("user_id"); router.push("/"); }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </nav>
      </aside>

      <main className="portal-main">
        <header className="portal-header">
          <div className="header-title">
            {activeTab === "dashboard" && "Overview"}
            {activeTab === "opportunities" && "Browse Opportunities"}
            {activeTab === "profile" && "My Profile"}
            {activeTab === "settings" && "Settings"}
            {activeTab === "chat" && "💬 Product Assistant"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {/* Dark / Light toggle */}
            <button
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              style={{
                width: "36px", height: "36px", borderRadius: "50%", border: "1px solid var(--border-bright)",
                background: "var(--bg-card)", cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center", transition: "all 0.2s",
                color: "var(--text-secondary)", flexShrink: 0,
              }}
            >
              {theme === "dark" ? (
                /* Sun icon */
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                /* Moon icon */
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
            <div className="header-profile" onClick={() => setActiveTab("profile")} style={{ cursor: "pointer" }} title="View My Profile">
              <div className="avatar">{displayName.charAt(0).toUpperCase()}</div>
              <span style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--text-main)" }}>{displayName}</span>
            </div>
          </div>
        </header>

        <div className="portal-content">

          {/* ============================================================
              DASHBOARD TAB
          ============================================================ */}
          {activeTab === "dashboard" && (
            <>
              {error && <div className="error-box">{error}</div>}

              {/* Stats Row — shown when we have match data */}
              {candidate && (
                <div className="stats-row">
                  {[
                    { label: "Skills Detected", value: candidate.skills.length, color: "#818cf8", bg: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.25)", icon: "🧠" },
                    { label: "Matches Found", value: matches.raw_matches.length, color: "#38bdf8", bg: "rgba(56,189,248,0.1)", border: "rgba(56,189,248,0.2)", icon: "🎯" },
                    { label: "Resumes Uploaded", value: resumes.length, color: "#c4b5fd", bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.2)", icon: "📄" },
                    { label: "Best Match Score", value: Math.max(...matches.raw_matches.map((m: any) => m.relevance_score)) + "%", color: "#34d399", bg: "rgba(52,211,153,0.1)", border: "rgba(52,211,153,0.2)", icon: "⭐" },
                  ].map((s, i) => (
                    <div key={i} className="stat-card" style={{ borderTop: `2px solid ${s.border}` }}>
                      <div className="stat-icon" style={{ background: s.bg, color: s.color, borderRadius: "8px" }}>{s.icon}</div>
                      <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                      <div className="stat-label">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload + Active Profile Snapshot */}
              <div className="grid-2">
                {/* Upload Card */}
                <div className="card">
                  <h2 className="card-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Resume Upload
                  </h2>
                  <form onSubmit={handleUpload}>
                    <div className="upload-area">
                      <p style={{ color: "var(--text-muted)", marginBottom: "1rem", fontSize: "0.95rem" }}>
                        Upload a PDF or TXT resume to get AI-powered matches.
                      </p>
                      <input type="file" accept=".pdf,.txt" onChange={e => setFile(e.target.files?.[0] || null)} className="file-input" />
                    </div>
                    {/* Live progress indicator */}
                    {uploading && analysisStep && (
                      <div style={{ marginTop: "0.85rem", display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.85rem", color: "var(--primary)" }}>
                        <span style={{ display: "inline-block", width: "14px", height: "14px", border: "2px solid var(--primary)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                        {analysisStep}
                      </div>
                    )}
                    <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "flex-end" }}>
                      <button type="submit" disabled={!file || uploading} className="btn btn-primary">
                        {uploading ? "Analyzing…" : "Analyze & Match"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Active Profile Snapshot */}
                <div className="card">
                  <h2 className="card-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                    </svg>
                    Active Profile Snapshot
                  </h2>
                  {candidate ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

                      {/* Name */}
                      <div className="snap-field">
                        <span className="snap-label">Full Name</span>
                        <div className="snap-value">{candidate.name}</div>
                      </div>

                      {/* Skills — ALL badges, no slicing */}
                      <div className="snap-field">
                        <span className="snap-label">Skills ({candidate.skills.length} detected)</span>
                        <div className="skill-container" style={{ marginTop: "0.4rem" }}>
                          {candidate.skills.map((s: string, i: number) => (
                            <span key={i} className="skill-badge">{s}</span>
                          ))}
                        </div>
                      </div>

                      {/* Education — one box per entry */}
                      <div className="snap-field">
                        <span className="snap-label">Education</span>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.4rem" }}>
                          {splitLines(candidate.education).map((line: string, i: number) => (
                            <div key={i} className="info-box info-box--edu">
                              <span className="info-box__icon">🎓</span>
                              <span>{line}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Experience — one box per entry */}
                      {candidate.experience && candidate.experience !== "N/A" && (
                        <div className="snap-field">
                          <span className="snap-label">Experience</span>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.4rem" }}>
                            {splitLines(candidate.experience).map((line: string, i: number) => (
                              <div key={i} className="info-box info-box--exp">
                                <span className="info-box__icon">💼</span>
                                <span>{line}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Projects — one box per entry */}
                      {candidate.projects && candidate.projects !== "N/A" && (
                        <div className="snap-field">
                          <span className="snap-label">Projects</span>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.4rem" }}>
                            {splitLines(candidate.projects).map((line: string, i: number) => (
                              <div key={i} className="info-box info-box--proj">
                                <span className="info-box__icon">🚀</span>
                                <span>{line}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "2rem", color: "var(--text-muted)", gap: "0.75rem" }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.35 }}>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                      </svg>
                      <p style={{ fontSize: "0.9rem" }}>Upload a resume to see your profile snapshot.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Match Cards + Rationale */}
              {matches && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  <div className="card">
                    <h2 className="card-title">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                      Top Internship Matches
                    </h2>
                    <div className="match-list">
                      {matches.raw_matches.map((m: any, idx: number) => {
                        const key = m.company + "-" + m.title;
                        const insight = insightsData[key];
                        const sc = scoreColor(m.relevance_score);
                        const reqSkills: string[] = m.required_skills
                          ? (Array.isArray(m.required_skills) ? m.required_skills : splitComma(m.required_skills))
                          : (m.skills ? splitComma(m.skills) : []);
                        const workMode = m.work_mode || m.mode || "";
                        return (
                          <div key={idx} className="match-card-expanded">
                            {/* Header row */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
                              <div style={{ flex: 1 }}>
                                <div className="match-title">{m.title}</div>
                                <div style={{ fontWeight: 600, color: "var(--primary)", fontSize: "0.95rem", marginTop: "0.2rem" }}>{m.company}</div>

                                {/* Pills row: location, duration, work mode */}
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.55rem" }}>
                                  {m.location && (
                                    <span className={`pill ${m.location.toLowerCase().includes("remote") ? "pill--green" : m.location.toLowerCase().includes("hybrid") ? "pill--yellow" : "pill--blue"}`}>
                                      📍 {m.location}
                                    </span>
                                  )}
                                  {m.duration && <span className="pill pill--purple">⏱ {m.duration}</span>}
                                  {workMode && <span className="pill pill--neutral">🖥 {workMode}</span>}
                                </div>

                                {/* Required skills tags */}
                                {reqSkills.length > 0 && (
                                  <div style={{ marginTop: "0.65rem" }}>
                                    <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                      Required Skills
                                    </span>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.3rem" }}>
                                      {reqSkills.map((sk: string, si: number) => (
                                        <span key={si} className="req-skill-tag">{sk}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Score badge + progress bar */}
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.4rem", minWidth: "130px" }}>
                                <span className="score-badge" style={{ background: sc.bg, color: sc.fg, border: `1px solid ${(sc as any).border || "transparent"}` }}>
                                  {m.relevance_score}% Match
                                </span>
                                <div className="relevance-bar-track">
                                  <div className="relevance-bar-fill" style={{ width: m.relevance_score + "%", background: sc.bar }} />
                                </div>
                                <span style={{ fontSize: "0.68rem", color: sc.fg, opacity: 0.75, fontWeight: 600 }}>
                                  {m.relevance_score >= 75 ? "Strong fit ↑" : m.relevance_score >= 50 ? "Good fit" : "Partial fit"}
                                </span>
                              </div>
                            </div>

                            {/* Two separate action buttons */}
                            <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end", gap: "0.6rem", flexWrap: "wrap" }}>
                              <button
                                className="btn btn-primary"
                                disabled={loadingCoverLetter === key || !!insight?.cover_letter}
                                onClick={() => handleGenerateCoverLetter(m.company, m.title)}
                                style={{ background: insight?.cover_letter ? "#059669" : undefined }}
                              >
                                {loadingCoverLetter === key ? "Generating…" : insight?.cover_letter ? "✓ Cover Letter Ready" : "✉ Cover Letter"}
                              </button>
                              <button
                                className="btn btn-primary"
                                disabled={loadingSkillGap === key || !!insight?.skill_gap}
                                onClick={() => handleGenerateSkillGap(m.company, m.title)}
                                style={{ background: insight?.skill_gap ? "#d97706" : undefined }}
                              >
                                {loadingSkillGap === key ? "Analyzing…" : insight?.skill_gap ? "✓ Skill Gap Ready" : "📊 Skill Gap Analysis"}
                              </button>
                            </div>

                            {/* Independent insight panels */}
                            {(insight?.cover_letter || insight?.skill_gap) && (
                              <div className="grid-2" style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px dashed var(--border)" }}>
                                {insight?.skill_gap && (
                                  <div>
                                    <h3 style={{ fontSize: "0.88rem", fontWeight: 700, marginBottom: "0.5rem", color: "#fbbf24", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                      📊 Skill Gap Analysis
                                    </h3>
                                    <div className="rationale" style={{ background: "rgba(245,158,11,0.07)", color: "#fcd34d", borderColor: "rgba(245,158,11,0.2)" }}>{insight.skill_gap}</div>
                                  </div>
                                )}
                                {insight?.cover_letter && (
                                  <div>
                                    <h3 style={{ fontSize: "0.88rem", fontWeight: 700, marginBottom: "0.5rem", color: "#a5b4fc", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                      ✉ AI Cover Letter Draft
                                    </h3>
                                    <div className="rationale" style={{ background: "rgba(99,102,241,0.06)", color: "#c7d2fe", borderColor: "rgba(99,102,241,0.2)", maxHeight: "320px", overflowY: "auto" }}>{insight.cover_letter}</div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}
            </>
          )}

          {/* ============================================================
              OPPORTUNITIES TAB
          ============================================================ */}
          {activeTab === "opportunities" && (() => {
            const locationTypes = ["All", "Remote", "Hybrid", "On-site"];
            const filtered = opportunities.filter(opp => {
              const matchSearch = oppSearch === "" ||
                opp.title.toLowerCase().includes(oppSearch.toLowerCase()) ||
                opp.company.toLowerCase().includes(oppSearch.toLowerCase()) ||
                opp.skills.toLowerCase().includes(oppSearch.toLowerCase());
              const matchFilter = oppFilter === "All" ||
                opp.location.toLowerCase().includes(oppFilter.toLowerCase());
              return matchSearch && matchFilter;
            });
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {/* Search + Filter Bar */}
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
                    <svg style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      className="form-input"
                      style={{ paddingLeft: "2.25rem" }}
                      placeholder="Search by title, company, or skill…"
                      value={oppSearch}
                      onChange={e => setOppSearch(e.target.value)}
                    />
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    {locationTypes.map(t => (
                      <button
                        key={t}
                        onClick={() => setOppFilter(t)}
                        style={{
                          padding: "0.4rem 0.9rem", borderRadius: "50px", fontSize: "0.82rem", fontWeight: 600,
                          border: "1.5px solid", cursor: "pointer", transition: "all 0.15s",
                          borderColor: oppFilter === t ? "var(--primary)" : "var(--border)",
                          background: oppFilter === t ? "var(--primary)" : "white",
                          color: oppFilter === t ? "white" : "var(--text-muted)",
                        }}
                      >{t}</button>
                    ))}
                  </div>
                  <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                    {filtered.length} of {opportunities.length} listings
                  </span>
                </div>

                {/* Cards grid */}
                {filtered.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                    <p>No opportunities match your search.</p>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.25rem" }}>
                    {filtered.map((opp: any, i: number) => {
                      const isRemote = opp.location.toLowerCase().includes("remote");
                      const isHybrid = opp.location.toLowerCase().includes("hybrid");
                      const locColor = isRemote
                        ? { bg: "rgba(16,185,129,0.12)", color: "#6ee7b7", border: "rgba(16,185,129,0.25)" }
                        : isHybrid
                        ? { bg: "rgba(245,158,11,0.12)", color: "#fcd34d", border: "rgba(245,158,11,0.25)" }
                        : { bg: "rgba(99,102,241,0.12)", color: "#a5b4fc", border: "rgba(99,102,241,0.25)" };
                      const skillList = opp.skills.split(",").map((s: string) => s.trim()).filter(Boolean);
                      return (
                        <div key={i} style={{
                          background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)",
                          padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.7rem",
                          transition: "all 0.25s ease", position: "relative", overflow: "hidden",
                        }}
                          onMouseEnter={e => {
                            e.currentTarget.style.borderColor = "rgba(99,102,241,0.3)";
                            e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,102,241,0.1)";
                            e.currentTarget.style.transform = "translateY(-2px)";
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.borderColor = "var(--border)";
                            e.currentTarget.style.boxShadow = "none";
                            e.currentTarget.style.transform = "translateY(0)";
                          }}
                        >
                          {/* Header */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-main)", lineHeight: 1.3, letterSpacing: "-0.1px" }}>{opp.title}</div>
                              <div style={{ fontWeight: 600, color: "#818cf8", fontSize: "0.82rem", marginTop: "0.2rem" }}>{opp.company}</div>
                            </div>
                            <span style={{ fontSize: "0.67rem", fontWeight: 700, padding: "0.2rem 0.6rem", borderRadius: "50px", background: locColor.bg, color: locColor.color, border: `1px solid ${locColor.border}`, whiteSpace: "nowrap", flexShrink: 0 }}>
                              {isRemote ? "Remote" : isHybrid ? "Hybrid" : "On-site"}
                            </span>
                          </div>

                          {/* Meta pills */}
                          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>📍 {opp.location}</span>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>⏱ {opp.duration}</span>
                            {opp.education && <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>🎓 {opp.education}</span>}
                          </div>

                          {/* Description */}
                          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.55, margin: 0 }}>
                            {opp.description.length > 130 ? opp.description.slice(0, 130) + "…" : opp.description}
                          </p>

                          {/* Skills */}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                            {skillList.slice(0, 5).map((s: string, si: number) => (
                              <span key={si} className="req-skill-tag">{s}</span>
                            ))}
                            {skillList.length > 5 && (
                              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>+{skillList.length - 5} more</span>
                            )}
                          </div>

                          {/* Apply Button */}
                          <div style={{ marginTop: "0.25rem", display: "flex", justifyContent: "flex-end" }}>
                            <a
                              href={opp.apply_url || `https://www.google.com/search?q=${encodeURIComponent(opp.title + " " + opp.company + " internship apply")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: "inline-flex", alignItems: "center", gap: "0.4rem",
                                padding: "0.45rem 1.1rem", borderRadius: "var(--radius-sm)",
                                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                color: "white", fontSize: "0.8rem", fontWeight: 700, textDecoration: "none",
                                transition: "all 0.2s", boxShadow: "0 4px 12px rgba(99,102,241,0.3)",
                              }}
                              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(99,102,241,0.45)"; }}
                              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(99,102,241,0.3)"; }}
                            >
                              🚀 Apply Now
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ============================================================
              PROFILE TAB
          ============================================================ */}
          {activeTab === "profile" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

              {/* AI-Extracted Section (from resume) */}
              {candidate && (
                <div className="card">
                  <h2 className="card-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
                    </svg>
                    AI-Extracted from Resume
                  </h2>

                  <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>

                    {/* Skills */}
                    <div>
                      <div className="extracted-section-label">
                        <span className="extracted-label-dot" style={{ background: "#4f46e5" }} />
                        Skills
                      </div>
                      <div className="skill-container" style={{ marginTop: "0.5rem" }}>
                        {candidate.skills.map((s: string, i: number) => (
                          <span key={i} className="skill-badge">{s}</span>
                        ))}
                      </div>
                    </div>

                    {/* Education */}
                    <div>
                      <div className="extracted-section-label">
                        <span className="extracted-label-dot" style={{ background: "#0891b2" }} />
                        Education
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: "0.5rem" }}>
                        {splitLines(candidate.education).map((line: string, i: number) => (
                          <div key={i} className="info-box info-box--edu">
                            <span className="info-box__icon">🎓</span>
                            <span>{line}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Experience — Timeline style */}
                    {candidate.experience && candidate.experience !== "N/A" && (
                      <div>
                        <div className="extracted-section-label">
                          <span className="extracted-label-dot" style={{ background: "#059669" }} />
                          Experience
                        </div>
                        <div className="timeline" style={{ marginTop: "0.5rem" }}>
                          {splitLines(candidate.experience).map((line: string, i: number) => (
                            <div key={i} className="timeline-item">
                              <div className="timeline-dot" />
                              <div className="timeline-card">
                                <div className="timeline-card__text">{line}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Projects — Individual cards */}
                    {candidate.projects && candidate.projects !== "N/A" && (
                      <div>
                        <div className="extracted-section-label">
                          <span className="extracted-label-dot" style={{ background: "#7c3aed" }} />
                          Projects
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.75rem", marginTop: "0.5rem" }}>
                          {splitLines(candidate.projects).map((line: string, i: number) => (
                            <div key={i} className="project-card">
                              <div className="project-card__num">#{i + 1}</div>
                              <div className="project-card__text">{line}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Manual Profile — Personal Info */}
              <div className="card">
                {sectionTitle("Personal Information", (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                ))}
                <div className="profile-details">
                  {profileField("Full Name", "fullName")}
                  {profileField("Phone", "phone", "tel")}
                  {profileField("Location", "location", "text", "City, Country")}
                  {profileField("Date of Birth", "dateOfBirth", "date")}
                  {profileSelect("Gender", "gender", ["Male", "Female", "Non-binary", "Prefer not to say"])}
                  {profileTextarea("Short Bio", "bio", "Tell us about yourself…", 3)}
                </div>
              </div>

              {/* Social Links */}
              <div className="card">
                {sectionTitle("Social & Links", (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                ))}
                <div className="profile-details">
                  {profileField("LinkedIn URL", "linkedin", "url", "https://linkedin.com/in/...")}
                  {profileField("GitHub URL", "github", "url", "https://github.com/...")}
                  {profileField("Portfolio URL", "portfolio", "url", "https://yoursite.com")}
                  {profileField("Twitter / X", "twitter", "text", "@handle")}
                </div>
              </div>

              {/* Education */}
              <div className="card">
                {sectionTitle("Education", (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />
                  </svg>
                ))}
                <div className="profile-details">
                  {profileField("Degree", "degree", "text", "B.Sc. Computer Science")}
                  {profileField("Major / Field of Study", "major")}
                  {profileField("University", "university")}
                  {profileField("Graduation Year", "graduationYear", "number", "2026")}
                  {profileField("GPA (optional)", "gpa", "text", "3.8 / 4.0")}
                </div>
              </div>

              {/* Preferences */}
              <div className="card">
                {sectionTitle("Internship Preferences", (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ))}
                <div className="profile-details">
                  {profileTextarea("Preferred Roles", "preferredRoles", "e.g. Software Engineer, Data Analyst", 2)}
                  {profileTextarea("Preferred Locations", "preferredLocations", "e.g. Remote, New York, London", 2)}
                  {profileSelect("Work Type", "workType", ["Remote", "On-site", "Hybrid"])}
                  {profileField("Available From", "availableFrom", "date")}
                  {profileSelect("Open to Relocate", "openToRelocate", ["Yes", "No", "Maybe"])}
                  {profileField("Preferred Duration", "internshipDuration", "text", "3–6 months")}
                </div>
              </div>

              {/* Extra */}
              <div className="card">
                {sectionTitle("Additional Info", (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                ))}
                <div className="profile-details">
                  {profileTextarea("Certifications", "certifications", "e.g. AWS Cloud Practitioner, Google Analytics…", 3)}
                  {profileTextarea("Languages Spoken", "languages", "e.g. English (fluent), Hindi (native)", 2)}
                  {profileTextarea("Achievements", "achievements", "Awards, honours, publications…", 3)}
                  {profileTextarea("Hobbies & Interests", "hobbies", "e.g. Open-source, Photography, Chess", 2)}
                </div>
              </div>

              {/* Save button */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", alignItems: "center" }}>
                {profileSaved && (
                  <span style={{ color: "#059669", fontWeight: 600, fontSize: "0.9rem" }}>✓ Profile saved!</span>
                )}
                <button className="btn btn-primary" onClick={handleProfileSave} style={{ padding: "0.75rem 2rem" }}>
                  Save Profile
                </button>
              </div>
            </div>
          )}

          {/* ============================================================
              SETTINGS TAB
          ============================================================ */}
          {activeTab === "settings" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div className="card">
                {sectionTitle("Resume History", (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                  </svg>
                ))}
                {resumes.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No resumes uploaded yet.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {resumes.map((r: any) => (
                      <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.85rem 1rem", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: r.is_active ? "var(--primary-light)" : "white" }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{r.filename}</span>
                          <span style={{ marginLeft: "0.75rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>{new Date(r.uploaded_at).toLocaleDateString()}</span>
                          {r.is_active && <span style={{ marginLeft: "0.6rem", background: "#059669", color: "white", fontSize: "0.7rem", padding: "0.1rem 0.45rem", borderRadius: "50px" }}>Active</span>}
                        </div>
                        {!r.is_active && (
                          <button className="btn btn-primary" style={{ padding: "0.4rem 0.9rem", fontSize: "0.82rem" }} onClick={() => activateResume(r.id)}>
                            Set Active
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card">
                {sectionTitle("Account", (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ))}
                <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                  User ID: <strong>{userId}</strong>
                </p>
                <button
                  className="btn"
                  style={{ background: "#fee2e2", color: "#dc2626", fontWeight: 600 }}
                  onClick={() => { localStorage.removeItem("user_id"); router.push("/"); }}
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}

          {/* ============================================================
              CHAT TAB — Product Assistant
          ============================================================ */}
          {activeTab === "chat" && (
            <div style={{ display: "flex", gap: "1.5rem", height: "calc(100vh - 130px)", overflow: "hidden" }}>

              {/* Session sidebar */}
              <div style={{ width: "220px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <button
                  className="btn"
                  style={{ width: "100%", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontWeight: 600, marginBottom: "0.5rem" }}
                  onClick={createNewSession}
                >
                  + New Chat
                </button>
                <div style={{ overflowY: "auto", flex: 1 }}>
                  {chatSessions.length === 0 && (
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center", marginTop: "1rem" }}>
                      No sessions yet. Start a new chat!
                    </p>
                  )}
                  {chatSessions.map((s: any) => (
                    <button
                      key={s.session_id}
                      onClick={() => loadSessionHistory(s.session_id)}
                      style={{
                        width: "100%", textAlign: "left", padding: "0.55rem 0.75rem",
                        borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "0.8rem",
                        background: chatSessionId === s.session_id ? "rgba(99,102,241,0.15)" : "transparent",
                        color: chatSessionId === s.session_id ? "#6366f1" : "var(--text-main)",
                        fontWeight: chatSessionId === s.session_id ? 600 : 400,
                        marginBottom: "2px",
                      }}
                    >
                      💬 {s.session_id.slice(0, 8)}…
                      <br />
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                        {s.created_at ? new Date(s.created_at).toLocaleDateString() : ""}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Main chat panel */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                {!chatSessionId ? (
                  /* Empty state */
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", color: "var(--text-muted)" }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <p style={{ fontSize: "1rem", fontWeight: 500 }}>Start a new chat or pick a session</p>
                    <p style={{ fontSize: "0.85rem" }}>Ask me anything about InternMatch AI!</p>
                    <button className="btn" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontWeight: 600 }} onClick={createNewSession}>
                      Start Chatting
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Message thread */}
                    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem", padding: "0.5rem 0.25rem 0.5rem 0" }}>
                      {chatMessages.length === 0 && (
                        <div style={{ textAlign: "center", color: "var(--text-muted)", marginTop: "2rem", fontSize: "0.9rem" }}>
                          No messages yet. Ask something below!
                        </div>
                      )}
                      {chatMessages.map((msg: any, idx: number) => (
                        <div key={msg.id ?? idx} style={{ display: "flex", flexDirection: msg.role === "user" ? "row-reverse" : "row", gap: "0.75rem", alignItems: "flex-start" }}>
                          {/* Avatar */}
                          <div style={{
                            width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
                            background: msg.role === "user" ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "linear-gradient(135deg,#10b981,#059669)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "0.75rem", color: "#fff", fontWeight: 700,
                          }}>
                            {msg.role === "user" ? "U" : "AI"}
                          </div>
                          {/* Bubble */}
                          <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column", gap: "0.35rem", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                            <div style={{
                              padding: "0.75rem 1rem", borderRadius: msg.role === "user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                              background: msg.role === "user" ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "var(--card-bg, rgba(255,255,255,0.07))",
                              color: msg.role === "user" ? "#fff" : "var(--text-main)",
                              fontSize: "0.9rem", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word",
                              border: msg.role === "assistant" ? "1px solid rgba(255,255,255,0.08)" : "none",
                            }}>
                              {msg.content}
                            </div>
                          </div>
                        </div>
                      ))}
                      {/* Typing indicator */}
                      {chatLoading && (
                        <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                          <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg,#10b981,#059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", color: "#fff", fontWeight: 700 }}>AI</div>
                          <div style={{ padding: "0.75rem 1rem", borderRadius: "4px 16px 16px 16px", background: "var(--card-bg, rgba(255,255,255,0.07))", border: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: "4px", alignItems: "center" }}>
                            {[0, 1, 2].map(i => (
                              <span key={i} style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#6366f1", display: "inline-block", animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
                            ))}
                          </div>
                        </div>
                      )}
                      <div ref={chatBottomRef} />
                    </div>

                    {/* Input bar */}
                    <div style={{ paddingTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
                      <textarea
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
                        placeholder="Ask anything about InternMatch AI… (Enter to send, Shift+Enter for new line)"
                        rows={2}
                        style={{
                          flex: 1, resize: "none", padding: "0.75rem 1rem", borderRadius: "12px",
                          border: "1px solid rgba(99,102,241,0.3)", background: "var(--card-bg, rgba(255,255,255,0.06))",
                          color: "var(--text-main)", fontSize: "0.9rem", lineHeight: 1.5, outline: "none",
                          fontFamily: "inherit",
                        }}
                        disabled={chatLoading}
                      />
                      <button
                        onClick={sendChatMessage}
                        disabled={chatLoading || !chatInput.trim()}
                        className="btn"
                        style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontWeight: 600, padding: "0.75rem 1.25rem", flexShrink: 0, opacity: (chatLoading || !chatInput.trim()) ? 0.5 : 1 }}
                      >
                        Send
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
