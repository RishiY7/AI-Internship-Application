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
      
      // Save user ID to localStorage for simplicity
      localStorage.setItem("user_id", data.user_id);
      router.push("/dashboard");
    } catch (err) {
      setError("Could not connect to the server");
      setLoading(false);
    }
  };

  return (
    <main className="auth-layout">
      <div className="auth-sidebar">
        <h1>Internship<br/>Matcher</h1>
        <p>Discover your next great opportunity with AI-powered resume analysis and semantic matching.</p>
      </div>
      
      <div className="auth-content">
        <div className="auth-box">
          <h2 className="auth-title">
            {isLogin ? "Welcome back" : "Create an account"}
          </h2>
          <p className="auth-subtitle">
            {isLogin ? "Please enter your details to sign in." : "Start your journey today."}
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
                placeholder="Enter your email"
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
              style={{ width: '100%', padding: '0.85rem' }}
              disabled={loading}
            >
              {loading ? "Processing..." : isLogin ? "Sign In" : "Register"}
            </button>
          </form>
          
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button 
              className="btn-text"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
