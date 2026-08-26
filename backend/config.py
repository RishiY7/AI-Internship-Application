# Central configuration for the InternMatch AI backend

# --- LLM Routing ---
# Groq: ultra-fast inference — used for RAG match evaluation and skill gap analysis
GROQ_MODEL = "qwen/qwen3.6-27b"

# Gemini: multimodal + long-form — used for native PDF resume parsing and cover letter generation
GEMINI_MODEL = "gemini-1.5-flash"

# Number of top internship matches to retrieve from FAISS
TOP_K_MATCHES = 3
