# Central configuration for the InternMatch AI backend

# --- LLM Routing ---
# Groq: ultra-fast inference — used for RAG match evaluation and skill gap analysis
GROQ_MODEL = "llama-3.1-8b-instant"  # ~800 tok/s on Groq LPU — no <think> blocks, 4-5x faster than 27B

# Gemini: multimodal + long-form — used for native PDF resume parsing and cover letter generation
GEMINI_MODEL = "gemini-2.5-flash"    # Pinned stable version — best speed/quality for cover letters

# Number of top internship matches to retrieve from FAISS
TOP_K_MATCHES = 3
