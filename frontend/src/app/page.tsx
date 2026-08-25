"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    const endpoint = isLogin ? "/api/login" : "/api/register";
    try {
      const res = await fetch(`http://localhost:8000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
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

  return (
    <main className="auth-layout">
      <div className="auth-sidebar" style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Background Decorative Elements */}
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)', borderRadius: '50%' }}></div>
        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)', borderRadius: '50%' }}></div>
        
        <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '3rem' }}>
            <div style={{ background: 'white', color: 'var(--primary)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            </div>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '1px' }}>InternMatch AI</span>
          </div>

          <h1 style={{ fontSize: '3.5rem', fontWeight: 800, lineHeight: 1.1, marginBottom: '1.5rem', textShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            Your Dream <br /> Internship, <br /> Just One Click Away.
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#e0e7ff', maxWidth: '450px', marginBottom: '3rem', lineHeight: 1.6 }}>
            Upload your resume, let AI extract your skills, and instantly get matched with thousands of opportunities.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.75rem', borderRadius: '50%' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Save Time</h3>
                <p style={{ color: '#c7d2fe', fontSize: '0.9rem' }}>Automated matching based on semantic vector search.</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.75rem', borderRadius: '50%' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>AI Cover Letters</h3>
                <p style={{ color: '#c7d2fe', fontSize: '0.9rem' }}>Generate tailored cover letters in seconds.</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.1)', padding: '0.75rem', borderRadius: '50%' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Skill Gap Analysis</h3>
                <p style={{ color: '#c7d2fe', fontSize: '0.9rem' }}>Know exactly what to learn to land the job.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
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
              style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', marginTop: '0.5rem' }}
              disabled={loading}
            >
              {loading ? "Processing..." : isLogin ? "Sign In to Dashboard" : "Create Account"}
            </button>
          </form>
          
          <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              {isLogin ? "New to InternMatch AI? " : "Already part of the network? "}
            </span>
            <button 
              className="btn-text"
              style={{ fontWeight: 600, fontSize: '0.95rem' }}
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
