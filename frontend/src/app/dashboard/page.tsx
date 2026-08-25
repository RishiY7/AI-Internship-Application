"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [matches, setMatches] = useState<any>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const router = useRouter();
  
  const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;

  useEffect(() => {
    if (!userId) {
      router.push("/");
      return;
    }
    fetchMatches();
  }, [userId, router]);

  const fetchMatches = async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/matches/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setMatches(data);
      }
    } catch (err) {
      console.log("Failed to fetch matches");
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !userId) return;
    
    setUploading(true);
    setError("");
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const res = await fetch(`http://localhost:8000/api/upload_resume?user_id=${userId}`, {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        const err = await res.json();
        setError(err.detail || "Upload failed");
      } else {
        await fetchMatches();
      }
    } catch (err) {
      setError("Network error during upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="portal-layout">
      
      {/* Sidebar */}
      <aside className="portal-sidebar">
        <div className="sidebar-header">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary-light)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
          InternMatch
        </div>
        
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            Dashboard
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            My Profile
          </button>

          <button 
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            Settings
          </button>
          
          <div style={{ flex: 1 }}></div>
          
          <button 
            className="nav-item"
            style={{ color: '#ef4444' }}
            onClick={() => {
              localStorage.removeItem("user_id");
              router.push("/");
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Logout
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="portal-main">
        <header className="portal-header">
          <div className="header-title">
            {activeTab === 'dashboard' && 'Overview'}
            {activeTab === 'profile' && 'My Profile'}
            {activeTab === 'settings' && 'Settings'}
          </div>
          
          <div className="header-profile">
            <div className="avatar">
              {matches ? matches.candidate.name.charAt(0) : "U"}
            </div>
            <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-main)' }}>
              {matches ? matches.candidate.name : "User"}
            </span>
          </div>
        </header>

        <div className="portal-content">
          {activeTab === 'dashboard' && (
            <>
              {error && <div className="error-box">{error}</div>}
              
              <div className="grid-2">
                
                {/* Upload Card */}
                <div className="card">
                  <h2 className="card-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    Resume Upload
                  </h2>
                  <form onSubmit={handleUpload}>
                    <div className="upload-area">
                      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.95rem' }}>
                        Upload your latest resume (PDF or TXT) to get matched with internships.
                      </p>
                      <input 
                        type="file" 
                        accept=".pdf,.txt"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="file-input"
                      />
                    </div>
                    <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
                      <button 
                        type="submit" 
                        disabled={!file || uploading}
                        className="btn btn-primary"
                      >
                        {uploading ? "Analyzing..." : "Analyze & Match"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Profile Card */}
                <div className="card">
                  <h2 className="card-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    Extracted Profile
                  </h2>
                  
                  {matches ? (
                    <div className="profile-details">
                      <div className="profile-field">
                        <span className="profile-label">Full Name</span>
                        <div className="profile-value">{matches.candidate.name}</div>
                      </div>
                      <div className="profile-field">
                        <span className="profile-label">Top Skills</span>
                        <div className="profile-value">{matches.candidate.skills.slice(0, 4).join(", ")}{matches.candidate.skills.length > 4 ? "..." : ""}</div>
                      </div>
                      <div className="profile-field full-width">
                        <span className="profile-label">Education</span>
                        <div className="profile-value">{matches.candidate.education}</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                      No profile data available. Upload a resume.
                    </div>
                  )}
                </div>
              </div>

              {matches && (
                <div className="grid-2">
                  <div className="card">
                    <h2 className="card-title">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                      Top Matches
                    </h2>
                    <div className="match-list">
                      {matches.raw_matches.map((m: any, idx: number) => (
                        <div key={idx} className="match-card">
                          <div>
                            <div className="match-title">{m.title}</div>
                            <div className="match-company">{m.company}</div>
                          </div>
                          <div className="match-badge">
                            Score: {m.l2_distance.toFixed(3)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="card">
                    <h2 className="card-title">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                      AI Rationale
                    </h2>
                    <div className="rationale">
                      {matches.llm_rationale}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'profile' && (
            <div className="card">
              <h2 className="card-title">Full Profile Details</h2>
              {matches ? (
                <div className="profile-details" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="profile-field">
                    <span className="profile-label">Name</span>
                    <div className="profile-value">{matches.candidate.name}</div>
                  </div>
                  <div className="profile-field">
                    <span className="profile-label">All Skills</span>
                    <div className="profile-value">{matches.candidate.skills.join(", ")}</div>
                  </div>
                  <div className="profile-field">
                    <span className="profile-label">Education</span>
                    <div className="profile-value">{matches.candidate.education}</div>
                  </div>
                  <div className="profile-field">
                    <span className="profile-label">Experience</span>
                    <div className="profile-value" style={{ whiteSpace: 'pre-wrap' }}>{matches.candidate.experience}</div>
                  </div>
                  <div className="profile-field">
                    <span className="profile-label">Projects</span>
                    <div className="profile-value" style={{ whiteSpace: 'pre-wrap' }}>{matches.candidate.projects}</div>
                  </div>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>No profile data available.</p>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="card">
              <h2 className="card-title">Account Settings</h2>
              <p style={{ color: 'var(--text-muted)' }}>Preferences and account settings will appear here.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
