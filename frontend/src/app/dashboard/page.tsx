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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <header className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900">Internship Dashboard</h1>
          <button 
            onClick={() => {
              localStorage.removeItem("user_id");
              router.push("/");
            }}
            className="text-sm text-gray-500 hover:text-gray-900"
          >
            Logout
          </button>
        </header>

        {/* Upload Section */}
        <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">Upload Resume</h2>
          <form onSubmit={handleUpload} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Select PDF</label>
              <input 
                type="file" 
                accept=".pdf,.txt"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            <button 
              type="submit" 
              disabled={!file || uploading}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
            >
              {uploading ? "Analyzing..." : "Analyze & Match"}
            </button>
          </form>
          {error && <p className="mt-2 text-red-500 text-sm">{error}</p>}
        </section>

        {/* Results Section */}
        {matches && (
          <div className="space-y-6">
            
            <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold mb-4 text-gray-900">Your Extracted Profile</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="font-medium text-gray-500">Name:</span> {matches.candidate.name}</div>
                <div><span className="font-medium text-gray-500">Skills:</span> {matches.candidate.skills.join(", ")}</div>
                <div className="col-span-2"><span className="font-medium text-gray-500">Education:</span> {matches.candidate.education}</div>
                <div className="col-span-2"><span className="font-medium text-gray-500">Experience:</span> {matches.candidate.experience}</div>
              </div>
            </section>

            <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold mb-4 text-gray-900">Top Matches (FAISS Vector Search)</h2>
              <ul className="space-y-3">
                {matches.raw_matches.map((m: any, idx: number) => (
                  <li key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-100">
                    <div>
                      <div className="font-semibold text-gray-900">{m.title}</div>
                      <div className="text-sm text-gray-500">{m.company}</div>
                    </div>
                    <div className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                      Score: {m.l2_distance.toFixed(4)}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold mb-4 text-gray-900">AI Evaluation Rationale</h2>
              <div className="prose max-w-none text-gray-700 whitespace-pre-wrap text-sm border-l-4 border-blue-500 pl-4">
                {matches.llm_rationale}
              </div>
            </section>
            
          </div>
        )}

      </div>
    </div>
  );
}
