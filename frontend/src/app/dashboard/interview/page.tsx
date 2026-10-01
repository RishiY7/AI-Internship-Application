"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Hexagon, LayoutDashboard, Briefcase, User,
  Settings, MessageSquare, LogOut, BrainCircuit,
  Send, Upload, X, Plus, ChevronRight
} from "lucide-react";

const API = "http://localhost:8000";

const QUICK_PROMPTS = [
  "Which roles can I apply for based on my resume?",
  "What are my strongest technical skills?",
  "Give me 5 interview questions for a Software Engineer role",
  "Create an interview preparation roadmap for a Data Analyst",
  "What skill gaps do I have for a Machine Learning Engineer?",
];

export default function InterviewPage() {
  const router = useRouter();
  const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;

  // --- Session & Chat state ---
  const [sessionId, setSessionId]         = useState<string | null>(null);
  const [sessions, setSessions]           = useState<any[]>([]);
  const [messages, setMessages]           = useState<any[]>([]);
  const [input, setInput]                 = useState("");
  const [loading, setLoading]             = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // --- Document state ---
  const [docContext, setDocContext]       = useState("");
  const [docName, setDocName]             = useState("");
  const [uploadingDoc, setUploadingDoc]   = useState(false);
  const [docError, setDocError]           = useState("");

  // --- UI state ---
  const [activeNav, setActiveNav]         = useState("interview");
  const [theme, setTheme]                 = useState<"dark" | "light">("dark");
  const [sidebarOpen, setSidebarOpen]     = useState(true);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const textareaRef   = useRef<HTMLTextAreaElement>(null);

  // Auth guard + init
  useEffect(() => {
    if (!userId) { router.push("/"); return; }
    // Load theme
    const saved = (localStorage.getItem("theme") as "dark" | "light") || "dark";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
    // Load sessions
    fetchSessions();
  }, [userId, router]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [input]);

  // ------------------------------------------------------------------ //
  // API calls                                                            //
  // ------------------------------------------------------------------ //

  async function fetchSessions() {
    if (!userId) return;
    setLoadingSessions(true);
    try {
      const res  = await fetch(`${API}/api/interview/sessions/${userId}`);
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch { /* silently fail */ }
    finally { setLoadingSessions(false); }
  }

  async function createSession() {
    if (!userId) return;
    try {
      const res  = await fetch(`${API}/api/interview/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: Number(userId) }),
      });
      const data = await res.json();
      setSessionId(data.session_id);
      setMessages([]);
      setDocContext("");
      setDocName("");
      fetchSessions();
    } catch (e) { console.error("Failed to create session", e); }
  }

  async function loadSession(sid: string) {
    setSessionId(sid);
    setDocContext("");
    setDocName("");
    try {
      const res  = await fetch(`${API}/api/interview/history/${userId}/${sid}`);
      const data = await res.json();
      setMessages(data.messages || []);
    } catch { setMessages([]); }
  }

  async function sendMessage(text?: string) {
    const query = (text ?? input).trim();
    if (!query || !sessionId || loading) return;
    setInput("");

    const userMsg = { role: "user", content: query };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res  = await fetch(`${API}/api/interview/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id:     Number(userId),
          session_id:  sessionId,
          message:     query,
          doc_context: docContext,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Request failed");
      setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
    } catch (e: any) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `⚠️ Error: ${e.message}. Please try again.`,
      }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDocUpload(file: File) {
    setDocError("");
    setUploadingDoc(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res  = await fetch(`${API}/api/interview/upload_doc`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed");
      setDocContext(data.doc_context);
      setDocName(data.filename);
    } catch (e: any) {
      setDocError(e.message);
    } finally {
      setUploadingDoc(false);
    }
  }

  function clearDoc() {
    setDocContext("");
    setDocName("");
    setDocError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", next);
  }

  function formatMessage(content: string) {
    // Simple markdown-like rendering: bold **text**, code `text`, newlines
    return content
      .split("\n")
      .map((line, i) => {
        const formatted = line
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          .replace(/`(.*?)`/g, "<code style='background:rgba(99,102,241,0.15);padding:1px 5px;border-radius:3px;font-family:monospace;font-size:0.9em'>$1</code>");
        return <p key={i} style={{ margin: "0.2rem 0", lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: formatted || "&nbsp;" }} />;
      });
  }

  const displayName = typeof window !== "undefined" ? localStorage.getItem("user_full_name") || "User" : "User";

  // ------------------------------------------------------------------ //
  // Render                                                               //
  // ------------------------------------------------------------------ //

  return (
    <div className="portal-layout" style={{ minHeight: "100vh", display: "flex" }}>

      {/* ============================================================
          SIDEBAR
      ============================================================ */}
      <aside className="portal-sidebar">
        <div className="sidebar-header">
          <div style={{
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            width: "30px", height: "30px", borderRadius: "8px",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            boxShadow: "0 4px 12px rgba(99,102,241,0.4)",
          }}>
            <Hexagon size={16} color="white" strokeWidth={2.5} />
          </div>
          InternMatch
        </div>

        <nav className="sidebar-nav">
          <button className="nav-item" onClick={() => router.push("/dashboard")}>
            <LayoutDashboard size={20} strokeWidth={2} />
            Dashboard
          </button>
          <button className="nav-item" onClick={() => router.push("/dashboard")}>
            <Briefcase size={20} strokeWidth={2} />
            Opportunities
          </button>
          <button className="nav-item" onClick={() => router.push("/dashboard")}>
            <User size={20} strokeWidth={2} />
            My Profile
          </button>
          <button className="nav-item" onClick={() => router.push("/dashboard")}>
            <MessageSquare size={20} strokeWidth={2} />
            Product Assistant
          </button>
          <button className="nav-item active">
            <BrainCircuit size={20} strokeWidth={2} />
            Interview Prep
          </button>

          <div style={{ flex: 1 }} />

          <button className="nav-item" style={{ color: "#ef4444" }} onClick={() => {
            localStorage.removeItem("user_id");
            router.push("/");
          }}>
            <LogOut size={20} strokeWidth={2} />
            Logout
          </button>
        </nav>
      </aside>

      {/* ============================================================
          MAIN CONTENT
      ============================================================ */}
      <main className="portal-main" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <header className="portal-header">
          <div className="header-title">
            🎯 Interview Prep Agent
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {/* Theme toggle */}
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
            <div className="header-profile">
              <div className="avatar">{displayName.charAt(0).toUpperCase()}</div>
              <span style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--text-main)" }}>{displayName}</span>
            </div>
          </div>
        </header>

        {/* Body: 3-column layout */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", gap: 0 }}>

          {/* ---- LEFT: Session History ---- */}
          <div style={{
            width: "240px", flexShrink: 0,
            borderRight: "1px solid var(--border)",
            display: "flex", flexDirection: "column",
            background: "var(--bg-sidebar, var(--bg-card))",
            overflowY: "auto",
          }}>
            <div style={{ padding: "1rem", borderBottom: "1px solid var(--border)" }}>
              <button
                onClick={createSession}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                  gap: "0.5rem", padding: "0.6rem 1rem", borderRadius: "var(--radius-sm)",
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  color: "white", fontWeight: 700, fontSize: "0.85rem",
                  border: "none", cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(99,102,241,0.3)", transition: "all 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(99,102,241,0.45)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(99,102,241,0.3)"; }}
              >
                <Plus size={15} />
                New Session
              </button>
            </div>

            <div style={{ padding: "0.75rem 0.75rem 0.5rem", fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Past Sessions
            </div>

            {loadingSessions ? (
              <div style={{ padding: "1rem", color: "var(--text-muted)", fontSize: "0.82rem", textAlign: "center" }}>Loading…</div>
            ) : sessions.length === 0 ? (
              <div style={{ padding: "1rem", color: "var(--text-muted)", fontSize: "0.82rem", textAlign: "center" }}>No sessions yet</div>
            ) : (
              sessions.map((s, i) => (
                <button
                  key={s.session_id}
                  onClick={() => loadSession(s.session_id)}
                  style={{
                    width: "100%", textAlign: "left", padding: "0.65rem 0.75rem",
                    background: sessionId === s.session_id ? "rgba(99,102,241,0.12)" : "transparent",
                    border: "none", borderLeft: sessionId === s.session_id ? "3px solid #6366f1" : "3px solid transparent",
                    cursor: "pointer", fontSize: "0.8rem", color: sessionId === s.session_id ? "var(--text-main)" : "var(--text-muted)",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: "0.2rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    Session {sessions.length - i}
                  </div>
                  <div style={{ fontSize: "0.72rem", opacity: 0.65 }}>
                    {s.created_at ? new Date(s.created_at).toLocaleDateString() : ""}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* ---- CENTRE: Chat Window ---- */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* No session placeholder */}
            {!sessionId ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5rem", padding: "2rem" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🎯</div>
                  <h2 style={{ fontWeight: 700, fontSize: "1.25rem", color: "var(--text-main)", marginBottom: "0.5rem" }}>
                    Interview Prep Agent
                  </h2>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", maxWidth: "380px", lineHeight: 1.6 }}>
                    Your AI coach that reads your resume and helps you prepare for interviews — role recommendations, technical questions, HR questions, roadmaps, and document Q&amp;A.
                  </p>
                </div>
                <button
                  onClick={createSession}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.5rem",
                    padding: "0.75rem 1.75rem", borderRadius: "var(--radius-sm)",
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    color: "white", fontWeight: 700, fontSize: "0.9rem",
                    border: "none", cursor: "pointer",
                    boxShadow: "0 4px 15px rgba(99,102,241,0.4)", transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 25px rgba(99,102,241,0.5)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 15px rgba(99,102,241,0.4)"; }}
                >
                  <Plus size={18} /> Start New Session
                </button>

                {/* Quick prompts */}
                <div style={{ width: "100%", maxWidth: "500px" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.75rem", textAlign: "center" }}>
                    Try asking…
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {QUICK_PROMPTS.map((p, i) => (
                      <button
                        key={i}
                        onClick={async () => { await createSession(); }}
                        style={{
                          textAlign: "left", padding: "0.65rem 1rem",
                          background: "var(--bg-card)", border: "1px solid var(--border)",
                          borderRadius: "var(--radius-sm)", cursor: "pointer",
                          fontSize: "0.83rem", color: "var(--text-muted)", transition: "all 0.15s",
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)"; e.currentTarget.style.color = "var(--text-main)"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                      >
                        {p} <ChevronRight size={14} style={{ flexShrink: 0 }} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Message list */}
                <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

                  {/* Doc active banner */}
                  {docName && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: "0.6rem",
                      padding: "0.6rem 1rem", borderRadius: "var(--radius-sm)",
                      background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)",
                      fontSize: "0.82rem", color: "#a5b4fc",
                    }}>
                      <span>📄</span>
                      <span style={{ flex: 1 }}>Document active: <strong>{docName}</strong> — questions will use this as context</span>
                      <button onClick={clearDoc} style={{ background: "none", border: "none", cursor: "pointer", color: "#a5b4fc", display: "flex" }}>
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {/* Empty state for new session */}
                  {messages.length === 0 && (
                    <div style={{ textAlign: "center", padding: "2rem 0" }}>
                      <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "1.25rem" }}>
                        Session started. Try one of these:
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "440px", margin: "0 auto" }}>
                        {QUICK_PROMPTS.map((p, i) => (
                          <button
                            key={i}
                            onClick={() => sendMessage(p)}
                            style={{
                              textAlign: "left", padding: "0.6rem 1rem",
                              background: "var(--bg-card)", border: "1px solid var(--border)",
                              borderRadius: "var(--radius-sm)", cursor: "pointer",
                              fontSize: "0.82rem", color: "var(--text-muted)", transition: "all 0.15s",
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)"; e.currentTarget.style.color = "var(--text-main)"; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                          >
                            {p} <ChevronRight size={14} style={{ flexShrink: 0 }} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Messages */}
                  {messages.map((msg, i) => (
                    <div key={i} style={{ display: "flex", flexDirection: msg.role === "user" ? "row-reverse" : "row", gap: "0.75rem", alignItems: "flex-start" }}>
                      {/* Avatar */}
                      <div style={{
                        width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 700,
                        background: msg.role === "user"
                          ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                          : "linear-gradient(135deg, #0891b2, #0e7490)",
                        color: "white",
                      }}>
                        {msg.role === "user" ? displayName.charAt(0).toUpperCase() : "🎯"}
                      </div>

                      {/* Bubble */}
                      <div style={{
                        maxWidth: "72%", padding: "0.75rem 1rem",
                        borderRadius: msg.role === "user" ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
                        background: msg.role === "user"
                          ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                          : "var(--bg-card)",
                        border: msg.role === "user" ? "none" : "1px solid var(--border)",
                        color: msg.role === "user" ? "white" : "var(--text-main)",
                        fontSize: "0.88rem",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                      }}>
                        {formatMessage(msg.content)}
                      </div>
                    </div>
                  ))}

                  {/* Loading bubble */}
                  {loading && (
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                      <div style={{
                        width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: "linear-gradient(135deg, #0891b2, #0e7490)", color: "white", fontSize: "0.8rem",
                      }}>🎯</div>
                      <div style={{
                        padding: "0.75rem 1rem", borderRadius: "4px 18px 18px 18px",
                        background: "var(--bg-card)", border: "1px solid var(--border)",
                        display: "flex", gap: "4px", alignItems: "center",
                      }}>
                        {[0, 1, 2].map(d => (
                          <span key={d} style={{
                            width: "7px", height: "7px", borderRadius: "50%",
                            background: "#6366f1", display: "inline-block",
                            animation: `bounce 1.2s ease-in-out ${d * 0.2}s infinite`,
                          }} />
                        ))}
                      </div>
                    </div>
                  )}

                  <div ref={chatBottomRef} />
                </div>

                {/* Input bar */}
                <div style={{ borderTop: "1px solid var(--border)", padding: "1rem 1.5rem", background: "var(--bg-card)" }}>
                  <div style={{
                    display: "flex", gap: "0.75rem", alignItems: "flex-end",
                    background: "var(--bg-main, var(--bg))", borderRadius: "12px",
                    border: "1px solid var(--border-bright)", padding: "0.5rem 0.75rem",
                    transition: "border-color 0.2s",
                  }}
                    onFocusCapture={e => e.currentTarget.style.borderColor = "rgba(99,102,241,0.5)"}
                    onBlurCapture={e => e.currentTarget.style.borderColor = "var(--border-bright)"}
                  >
                    <textarea
                      ref={textareaRef}
                      rows={1}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask anything — role suggestions, interview questions, roadmap…"
                      disabled={loading}
                      style={{
                        flex: 1, resize: "none", border: "none", background: "transparent",
                        outline: "none", fontSize: "0.9rem", color: "var(--text-main)",
                        lineHeight: 1.6, maxHeight: "140px", overflow: "auto",
                        fontFamily: "inherit",
                      }}
                    />
                    <button
                      onClick={() => sendMessage()}
                      disabled={!input.trim() || loading}
                      style={{
                        width: "36px", height: "36px", borderRadius: "8px", flexShrink: 0,
                        background: input.trim() && !loading ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "var(--border)",
                        border: "none", cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.2s", color: "white",
                      }}
                    >
                      <Send size={15} />
                    </button>
                  </div>
                  <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.4rem", textAlign: "center" }}>
                    Enter to send · Shift+Enter for new line
                  </p>
                </div>
              </>
            )}
          </div>

          {/* ---- RIGHT: Document Upload Panel ---- */}
          <div style={{
            width: "260px", flexShrink: 0,
            borderLeft: "1px solid var(--border)",
            padding: "1.25rem",
            display: "flex", flexDirection: "column", gap: "1rem",
            background: "var(--bg-sidebar, var(--bg-card))",
            overflowY: "auto",
          }}>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.75rem" }}>
                📄 Document Q&amp;A
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.55, marginBottom: "1rem" }}>
                Upload a Job Description, study material, or any PDF/DOCX. The agent will answer your questions based on its content.
              </p>

              {/* Upload area */}
              {!docName ? (
                <div
                  onClick={() => sessionId && fileInputRef.current?.click()}
                  style={{
                    border: "2px dashed var(--border-bright)", borderRadius: "var(--radius-sm)",
                    padding: "1.5rem 1rem", textAlign: "center", cursor: sessionId ? "pointer" : "not-allowed",
                    transition: "all 0.2s", opacity: sessionId ? 1 : 0.5,
                  }}
                  onDragOver={e => { e.preventDefault(); if (sessionId) e.currentTarget.style.borderColor = "rgba(99,102,241,0.5)"; }}
                  onDragLeave={e => { e.currentTarget.style.borderColor = "var(--border-bright)"; }}
                  onDrop={e => {
                    e.preventDefault();
                    e.currentTarget.style.borderColor = "var(--border-bright)";
                    if (!sessionId) return;
                    const file = e.dataTransfer.files[0];
                    if (file) handleDocUpload(file);
                  }}
                  onMouseEnter={e => { if (sessionId) e.currentTarget.style.borderColor = "rgba(99,102,241,0.4)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-bright)"; }}
                >
                  {uploadingDoc ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ display: "inline-block", width: "20px", height: "20px", border: "2px solid #6366f1", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Extracting…</span>
                    </div>
                  ) : (
                    <>
                      <Upload size={24} style={{ color: "var(--text-muted)", marginBottom: "0.5rem" }} />
                      <div style={{ fontSize: "0.83rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                        {sessionId ? "Click or drag to upload" : "Start a session first"}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>PDF or DOCX</div>
                    </>
                  )}
                </div>
              ) : (
                /* Uploaded doc chip */
                <div style={{
                  display: "flex", alignItems: "center", gap: "0.6rem",
                  padding: "0.75rem", borderRadius: "var(--radius-sm)",
                  background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)",
                }}>
                  <span style={{ fontSize: "1.25rem" }}>📄</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#a5b4fc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {docName}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Active context</div>
                  </div>
                  <button onClick={clearDoc} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", flexShrink: 0 }}>
                    <X size={14} />
                  </button>
                </div>
              )}

              {docError && (
                <div style={{ marginTop: "0.5rem", fontSize: "0.78rem", color: "#f87171", background: "rgba(239,68,68,0.1)", padding: "0.5rem 0.75rem", borderRadius: "6px" }}>
                  ⚠️ {docError}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleDocUpload(f); }}
              />
            </div>

            {/* Tips */}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.75rem" }}>
                💡 Tips
              </div>
              {[
                { icon: "🎯", text: "Ask which roles match your resume" },
                { icon: "❓", text: "Request technical & HR questions" },
                { icon: "🗺️", text: "Get a preparation roadmap" },
                { icon: "📄", text: 'Upload a JD and ask "Am I a fit?"' },
              ].map((tip, i) => (
                <div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.6rem", fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.45 }}>
                  <span style={{ flexShrink: 0 }}>{tip.icon}</span>
                  <span>{tip.text}</span>
                </div>
              ))}
            </div>
          </div>

        </div>{/* end 3-col */}
      </main>

      {/* Bounce animation for loading dots */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
