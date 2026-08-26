"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [matches, setMatches] = useState<any>(null);
  const [resumes, setResumes] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loadingInsights, setLoadingInsights] = useState<string | null>(null);
  const [insightsData, setInsightsData] = useState<Record<string, any>>({});
  const [profileSaved, setProfileSaved] = useState(false);
  const [profile, setProfile] = useState({
    fullName: "", phone: "", location: "", dateOfBirth: "", gender: "", bio: "",
    linkedin: "", github: "", portfolio: "", twitter: "",
    degree: "", major: "", university: "", graduationYear: "", gpa: "",
    preferredRoles: "", preferredLocations: "", workType: "",
    availableFrom: "", openToRelocate: "", internshipDuration: "",
    certifications: "", languages: "", hobbies: "", achievements: "",
  });

  const router = useRouter();
  const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;

  useEffect(() => {
    if (!userId) { router.push("/"); return; }
    fetchMatches();
    fetchResumes();
    const saved = localStorage.getItem("profile_" + userId);
    if (saved) setProfile(JSON.parse(saved));
  }, [userId, router]);

  const fetchMatches = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/matches/" + userId);
      if (res.ok) setMatches(await res.json());
    } catch { console.log("Failed to fetch matches"); }
  };

  const fetchResumes = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/resumes/" + userId);
      if (res.ok) setResumes(await res.json());
    } catch { console.log("Failed to fetch resumes"); }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !userId) return;
    setUploading(true); setError("");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("http://localhost:8000/api/upload_resume?user_id=" + userId, { method: "POST", body: formData });
      if (!res.ok) { const err = await res.json(); setError(err.detail || "Upload failed"); }
      else { await fetchMatches(); await fetchResumes(); }
    } catch { setError("Network error during upload"); }
    finally { setUploading(false); }
  };

  const activateResume = async (resumeId: number) => {
    try {
      const res = await fetch("http://localhost:8000/api/resumes/" + resumeId + "/activate?user_id=" + userId, { method: "POST" });
      if (res.ok) { fetchResumes(); fetchMatches(); }
    } catch { console.log("Error activating resume"); }
  };

  const handleGenerateInsights = async (company: string, title: string) => {
    const key = company + "-" + title;
    setLoadingInsights(key);
    try {
      const res = await fetch("http://localhost:8000/api/generate_insights", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: parseInt(userId as string), company, title }),
      });
      if (res.ok) setInsightsData(prev => ({ ...prev, [key]: await res.json() }));
    } catch { console.log("Error generating insights"); }
    finally { setLoadingInsights(null); }
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
    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem", paddingBottom: "0.6rem", borderBottom: "2px solid var(--primary-light)" }}>
      <div style={{ color: "var(--primary)" }}>{icon}</div>
      <h3 style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-main)" }}>{title}</h3>
    </div>
  );

  const scoreColor = (score: number) => {
    if (score >= 75) return { fg: "#166534", bg: "#dcfce7", bar: "#22c55e" };
    if (score >= 50) return { fg: "#854d0e", bg: "#fef9c3", bar: "#f59e0b" };
    return { fg: "#7f1d1d", bg: "#fee2e2", bar: "#ef4444" };
  };

  const candidate = matches?.candidate;
  const displayName = candidate?.name || profile.fullName || "User";

  return (
    <div className="portal-layout">
      <aside className="portal-sidebar">
        <div className="sidebar-header">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary-light)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
          InternMatch
        </div>
        <nav className="sidebar-nav">
          <button className={"nav-item " + (activeTab === "dashboard" ? "active" : "")} onClick={() => setActiveTab("dashboard")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
            </svg>
            Dashboard
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
            {activeTab === "profile" && "My Profile"}
            {activeTab === "settings" && "Settings"}
          </div>
          <div className="header-profile">
            <div className="avatar">{displayName.charAt(0).toUpperCase()}</div>
            <span style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--text-main)" }}>{displayName}</span>
          </div>
        </header>

        <div className="portal-content">

          {activeTab === "dashboard" && (
            <>
              {error && <div className="error-box">{error}</div>}

              <div className="grid-2">
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
                    <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "flex-end" }}>
                      <button type="submit" disabled={!file || uploading} className="btn btn-primary">
                        {uploading ? "Analyzing…" : "Analyze & Match"}
                      </button>
                    </div>
                  </form>
                </div>

                <div className="card">
                  <h2 className="card-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                    </svg>
                    Active Profile Snapshot
                  </h2>
                  {candidate ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      <div className="snap-field">
                        <span className="snap-label">Full Name</span>
                        <div className="snap-value">{candidate.name}</div>
                      </div>
                      <div className="snap-field">
                        <span className="snap-label">Skills ({candidate.skills.length} detected)</span>
                        <div className="skill-container" style={{ marginTop: "0.3rem" }}>
                          {candidate.skills.map((s: string, i: number) => (
                            <span key={i} className="skill-badge">{s}</span>
                          ))}
                        </div>
                      </div>
                      <div className="snap-field">
                        <span className="snap-label">Education</span>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginTop: "0.3rem" }}>
                          {splitLines(candidate.education).map((line: string, i: number) => (
                            <div key={i} className="info-box info-box--edu">{line}</div>
                          ))}
                        </div>
                      </div>
                      {candidate.experience && candidate.experience !== "N/A" && (
                        <div className="snap-field">
                          <span className="snap-label">Experience</span>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginTop: "0.3rem" }}>
                            {splitLines(candidate.experience).map((line: string, i: number) => (
                              <div key={i} className="info-box info-box--exp"><span className="info-box__bullet" />{line}</div>
                            ))}
                          </div>
                        </div>
                      )}
                      {candidate.projects && candidate.projects !== "N/A" && (
                        <div className="snap-field">
                          <span className="snap-label">Projects</span>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginTop: "0.3rem" }}>
                            {splitLines(candidate.projects).map((line: string, i: number) => (
                              <div key={i} className="info-box info-box--proj">{line}</div>
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

              {candidate && (
                <div className="stats-row">
                  {[
                    { label: "Skills Detected", value: candidate.skills.length, color: "#4f46e5", bg: "#e0e7ff" },
                    { label: "Matches Found", value: matches.raw_matches.length, color: "#0891b2", bg: "#cffafe" },
                    { label: "Resumes Uploaded", value: resumes.length, color: "#7c3aed", bg: "#ede9fe" },
                    { label: "Best Match Score", value: Math.max(...matches.raw_matches.map((m: any) => m.relevance_score)) + "%", color: "#059669", bg: "#d1fae5" },
                  ].map((s, i) => (
                    <div key={i} className="stat-card" style={{ borderTop: "3px solid " + s.color }}>
                      <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                      <div className="stat-label">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

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
                        const isLoading = loadingInsights === key;
                        const sc = scoreColor(m.relevance_score);
                        return (
                          <div key={idx} className="match-card-expanded">
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
                              <div>
                                <div className="match-title">{m.title}</div>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.3rem", flexWrap: "wrap" }}>
                                  <span style={{ fontWeight: 600, color: "var(--primary)", fontSize: "0.95rem" }}>{m.company}</span>
                                  {m.location && <span className="pill pill--neutral">{m.location}</span>}
                                  {m.duration && <span className="pill pill--purple">{"⏱ " + m.duration}</span>}
                                </div>
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.3rem", minWidth: "120px" }}>
                                <span style={{ fontSize: "0.8rem", fontWeight: 700, padding: "0.25rem 0.75rem", borderRadius: "50px", background: sc.bg, color: sc.fg }}>
                                  {m.relevance_score}% Match
                                </span>
                                <div style={{ width: "100%", height: "5px", background: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
                                  <div style={{ width: m.relevance_score + "%", height: "100%", background: sc.bar, borderRadius: "4px" }} />
                                </div>
                              </div>
                            </div>
                            <div style={{ marginTop: "0.85rem", display: "flex", justifyContent: "flex-end" }}>
                              <button className="btn btn-primary" disabled={isLoading || !!insight} onClick={() => handleGenerateInsights(m.company, m.title)}>
                                {isLoading ? "Generating…" : insight ? "Insights Ready" : "Generate Cover Letter & Skill Gap"}
                              </button>
                            </div>
                            {insight && (
                              <div className="grid-2" style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px dashed var(--border)" }}>
                                <div>
                                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.5rem", color: "#92400e" }}>Skill Gap Analysis</h3>
                                  <div className="rationale" style={{ background: "#fef3c7", color: "#92400e" }}>{insight.skill_gap}</div>
                                </div>
                                <div>
                                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.5rem" }}>AI Cover Letter Draft</h3>
                                  <div className="rationale" style={{ background: "#f8fafc", color: "#1e293b", maxHeight: "320px", overflowY: "auto" }}>{insight.cover_letter}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="card">
                    <h2 className="card-title">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                      </svg>
                      Overall AI Rationale
                    </h2>
                    <div className="rationale">{matches.llm_rationale}</div>
                  </div>
                </div>
              )}
            </>
          )}
