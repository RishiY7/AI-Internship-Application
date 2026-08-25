"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [matches, setMatches] = useState<any>(null);
  const [error, setError] = useState("");
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
        // Fetch new matches
        await fetchMatches();
      }
    } catch (err) {
      setError("Network error during upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ padding: '2rem 1rem' }}>
      <div className="container dashboard-grid">
        
        <header className="glass-header">
          <h1 className="page-title">Internship Dashboard</h1>
          <button 
            onClick={() => {
              localStorage.removeItem("user_id");
              router.push("/");
            }}
            className="btn btn-logout"
          >
            Logout
          </button>
        </header>

        {/* Upload Section */}
        <section className="glass-card">
          <h2 className="section-title">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            Upload Resume
          </h2>
          <form onSubmit={handleUpload} className="upload-section">
            <div className="upload-row">
              <div style={{ flex: 1 }}>
                <label className="form-label">Select PDF or TXT</label>
                <input 
                  type="file" 
                  accept=".pdf,.txt"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="file-input"
                />
              </div>
              <button 
                type="submit" 
                disabled={!file || uploading}
                className="btn btn-primary"
                style={{ width: 'auto', padding: '0.75rem 2rem' }}
              >
                {uploading ? "Analyzing..." : "Analyze & Match"}
              </button>
            </div>
          </form>
          {error && <p className="error-text" style={{ marginTop: '1rem' }}>{error}</p>}
        </section>

        {/* Results Section */}
        {matches && (
          <>
            <section className="glass-card">
              <h2 className="section-title">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
                Your Extracted Profile
              </h2>
              <div className="grid-profile">
                <div className="profile-item">
                  <span className="profile-label">Name</span>
                  <div className="profile-value">{matches.candidate.name}</div>
                </div>
                <div className="profile-item">
                  <span className="profile-label">Skills</span>
                  <div className="profile-value">{matches.candidate.skills.join(", ")}</div>
                </div>
                <div className="profile-item" style={{ gridColumn: '1 / -1' }}>
                  <span className="profile-label">Education</span>
                  <div className="profile-value">{matches.candidate.education}</div>
                </div>
                <div className="profile-item" style={{ gridColumn: '1 / -1' }}>
                  <span className="profile-label">Experience</span>
                  <div className="profile-value">{matches.candidate.experience}</div>
                </div>
              </div>
            </section>

            <section className="glass-card">
              <h2 className="section-title">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                Top Matches (FAISS Vector Search)
              </h2>
              <ul className="matches-list">
                {matches.raw_matches.map((m: any, idx: number) => (
                  <li key={idx} className="match-item">
                    <div>
                      <div className="match-title">{m.title}</div>
                      <div className="match-company">{m.company}</div>
                    </div>
                    <div className="match-score">
                      Score: {m.l2_distance.toFixed(4)}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="glass-card">
              <h2 className="section-title">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                AI Evaluation Rationale
              </h2>
              <div className="rationale-box">
                {matches.llm_rationale}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
