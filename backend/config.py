# Central configuration for the InternMatch AI backend

# Groq LLM model used for resume parsing, RAG evaluation,
# cover letter generation, and skill gap analysis.
GROQ_MODEL = "qwen/qwen3.6-27b"

# Number of top internship matches to retrieve from FAISS
TOP_K_MATCHES = 3
