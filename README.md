# InternMatch AI — Full-Stack Internship Matching Platform

An AI-powered internship matching platform with a **Product Assistant Chatbot**. Uses RAG (Retrieval-Augmented Generation) to semantically match candidates to internships, generate personalised cover letters, identify skill gaps, and answer questions about the product using its own documentation.

---

## Features

| Feature | Description |
|---------|-------------|
| **Resume Upload & Parsing** | Upload a PDF resume → AI extracts name, skills, education, experience, projects |
| **AI Internship Matching** | FAISS vector similarity search + LLM rationale for top 3 matched internships |
| **Cover Letter Generator** | Personalised cover letter per listing using Gemini (Groq fallback) |
| **Skill Gap Analysis** | Bullet-point list of skills you're missing for a target role |
| **💬 Product Assistant Chatbot** | RAG chatbot that answers questions about InternMatch AI using its own documentation, with multi-turn conversation memory per user and session |

---

## Architecture & Tech Stack

### Core Stack

| Layer | Technology | Why chosen |
|-------|-----------|------------|
| Frontend | Next.js (React) + TypeScript | SSR, component model, already built |
| Backend | FastAPI (Python) | Async, fast, auto OpenAPI docs |
| Database | PostgreSQL + SQLAlchemy | Relational, multi-user, conversation history storage |
| Vector Store | FAISS (CPU) | Local, no external service, already used for matching |
| Embeddings | `sentence-transformers/all-MiniLM-L6-v2` | Free, local, high-quality 384-dim vectors |

### LLM Strategy

| Model | Used for | Why |
|-------|---------|-----|
| **Groq `groq/compound-mini`** | Resume parsing, internship matching, skill gap, **Product Assistant Chatbot** | Ultra-low latency on Groq LPU; free tier; already integrated |
| **Google Gemini `gemini-2.5-flash`** | Cover letter generation (with Groq fallback) | Superior long-form creative writing quality |

> **Note on LLM choice (§10):** The assignment recommends OpenAI. This project uses **Groq** instead because: (1) it is already integrated, (2) free tier with no billing required, (3) ~800 tokens/second on Groq LPU hardware — significantly faster for real-time chat. This is an explicitly allowed alternative per the assignment.

---

## Project Structure

```
backend/
├── chatbot/
│   ├── __init__.py
│   ├── product_knowledge.md    ← §2 Product Documentation (RAG knowledge base)
│   ├── doc_indexer.py          ← §3 RAG: loads, chunks, embeds, saves FAISS index
│   └── chat_engine.py          ← §3+§4+§6: ProductChatbot class (RAG + memory flow)
├── vector_store/
│   ├── internships_faiss_index/  ← FAISS index for job matching
│   └── product_faiss_index/      ← FAISS index for chatbot RAG (65 chunks)
├── config.py                   ← LLM model constants
├── database.py                 ← PostgreSQL connection
├── models.py                   ← User, Resume, ChatMessage (SQLAlchemy models)
├── matching_engine.py          ← Internship matching RAG logic
├── migrate.py                  ← DB migrations
├── main.py                     ← FastAPI app + all API endpoints
├── requirements.txt
└── tests/run_tests.py

frontend/src/app/
├── page.tsx                    ← Landing/login page
└── dashboard/
    └── page.tsx                ← Full dashboard (Overview, Opportunities, Profile, Settings, 💬 Chat)
```

---

## Product Assistant Chatbot — How It Works

Implements the complete RAG + memory pipeline:

```
User Question
     ↓
FAISS search over product_knowledge.md (top 3 chunks)
     +
PostgreSQL: last 10 messages for this user + session
     ↓
[System Prompt] + [Conversation History] + [RAG Context] + [Question]
     ↓
Groq LLM (groq/compound-mini)
     ↓
Response → stored in chat_messages table (user_id, session_id, role, content, timestamp)
```

**Key properties:**
- Conversation memory: resolves pronouns and follow-up questions across turns
- Per-user, per-session isolation: no cross-user data leakage
- Source citations: each response includes which document chunks were retrieved
- Like/Dislike feedback stored per message (bonus)

### Chatbot API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat/session` | Create a new chat session → returns UUID |
| `GET` | `/api/chat/sessions/{user_id}` | List all sessions for a user |
| `POST` | `/api/chat` | Send message → RAG + memory → LLM response |
| `GET` | `/api/chat/history/{user_id}/{session_id}` | Full conversation history |
| `POST` | `/api/chat/feedback` | Submit like/dislike on a message |

### Database Schema — `chat_messages`

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | Integer FK | Links to users table |
| `session_id` | String (UUID) | One UUID per chat session |
| `role` | String | `"user"` or `"assistant"` |
| `content` | Text | Message content |
| `created_at` | DateTime | Timestamp |
| `source_chunks` | JSON | RAG chunks used for this response |
| `feedback` | String | `"like"` / `"dislike"` / null |

---

## Setup Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL 14+

### 1. Environment Variables
Create a `.env` file in the **project root** (same level as `backend/` and `frontend/`):
```env
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/InternshipApp
```

### 2. Backend Setup
```bash
# From project root — activate virtual environment
venv\Scripts\activate          # Windows
source venv/bin/activate       # Mac/Linux

# Install dependencies
pip install -r backend/requirements.txt

# Build internship FAISS index (if not already built)
python backend/vector_store/indexer.py

# Build product chatbot FAISS index (run once, or after updating product_knowledge.md)
python backend/chatbot/doc_indexer.py

# Start backend server (run from backend/ directory)
cd backend
uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 4. Access
- **Application:** http://localhost:3000
- **API:** http://localhost:8000
- **API Docs (Swagger):** http://localhost:8000/docs

---

## Testing

To verify RAG matching against 10 distinct synthetic candidate archetypes:
```bash
cd backend
python tests/run_tests.py
```

To test the chatbot API directly:
```bash
# Create a session
curl -X POST http://localhost:8000/api/chat/session \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1}'

# Send a message
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "session_id": "<session_id>", "message": "What is InternMatch AI?"}'
```

---

## Limitations & Future Work

- **Small internship dataset:** 10 internship entries — sufficient for demonstration but not production scale.
- **No JWT auth:** Sessions use `user_id` in `localStorage`. Production would use JWT or HTTP-only cookies.
- **Relevance score approximation:** FAISS L2 distance converted via `max(0, 1 - L2/2) * 100`. Calibration against real data would improve accuracy.
- **Single embedding model:** `all-MiniLM-L6-v2` is general-purpose. A domain-specific model could improve matching quality for technical roles.
- **Groq model:** `groq/compound-mini` is used as `llama-3.1-8b-instant` was deprecated on this account. Can be updated in `backend/config.py` when a preferred model becomes available.
