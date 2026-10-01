# AI Career Companion Agent for Internship Matching and Interview Preparation

An AI-powered full-stack web app for internship matching and interview preparation. Upload your resume → get matched to internships → prepare for interviews with a personalised AI coach.

![AI Career Companion Agent](Landing%20Page.png)
---

## Features

| Feature | Description |
|---------|-------------|
| **Resume Upload & Parsing** | Upload a PDF resume → Groq LLM extracts name, skills, education, experience, projects |
| **AI Internship Matching** | FAISS semantic search + Groq LLM rationale for top 3 matched internships |
| **Cover Letter Generator** | Personalised cover letter per listing using Gemini |
| **Skill Gap Analysis** | Bullet-point list of missing skills for a target role using Groq |
| **Product Assistant Chatbot** | RAG chatbot answering questions about this platform using its own documentation, with per-user per-session conversation memory |
| **Interview Prep Agent** | Standalone AI coach that reads your resume and helps with role recommendations, interview questions (technical + HR), answer guidance, preparation roadmap, and document-based Q&A (PDF/DOCX upload) |
| **Application Tracker** | Track internship applications with pipeline status: Applied → Interviewing → Offered / Rejected |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| Backend | FastAPI (Python) |
| Database | PostgreSQL via SQLAlchemy (auto-created if not exists) |
| Vector Store | FAISS (CPU) — local, no external service |
| Embeddings | `sentence-transformers/all-MiniLM-L6-v2` |
| LLM (fast) | Groq `groq/compound-mini` — resume parsing, matching, chatbot, interview agent |
| LLM (creative) | Google Gemini `gemini-2.5-flash` — cover letter generation |

---

## Project Structure

```
AI-Internship-Application/
├── backend/
│   ├── main.py                        # All FastAPI routes
│   ├── models.py                      # SQLAlchemy models: User, Resume, ChatMessage, InternshipApplication
│   ├── database.py                    # PostgreSQL engine + SessionLocal + get_db
│   ├── config.py                      # LLM model name constants
│   ├── llm_client.py                  # get_llm() — Groq primary + Gemini automatic fallback
│   ├── matching_engine.py             # InternshipMatcher: FAISS + LLM rationale
│   ├── migrate.py                     # DB migration helper
│   ├── requirements.txt
│   ├── chatbot/                       # Product Assistant Chatbot (RAG over product docs)
│   │   ├── chat_engine.py             # ProductChatbot class
│   │   ├── doc_indexer.py             # Builds product_faiss_index
│   │   └── product_knowledge.md       # RAG knowledge base
│   ├── interview_agent/               # Interview Prep Agent (resume-based, no FAISS)
│   │   ├── agent.py                   # InterviewPrepAgent class
│   │   ├── prompts.py                 # System prompts per intent
│   │   └── doc_parser.py             # PDF + DOCX text extraction
│   ├── data_prep/
│   │   └── internship_data.json       # Internship listings dataset
│   ├── vector_store/
│   │   ├── internships_faiss_index/   # FAISS index for internship matching
│   │   └── product_faiss_index/       # FAISS index for product chatbot RAG
│   └── tests/
│       └── run_tests.py
├── frontend/
│   └── src/app/
│       ├── page.tsx                   # Landing / login / register page
│       ├── layout.tsx
│       ├── globals.css
│       └── dashboard/
│           ├── page.tsx               # Main dashboard (resume, matches, chatbot)
│           └── interview/
│               └── page.tsx           # Interview Prep Agent page
├── start.py                           # Starts backend + frontend concurrently
└── .env                               # API keys
```

---

## Two AI Agents — Clearly Separate

| | Product Assistant Chatbot | Interview Prep Agent |
|---|---|---|
| **Purpose** | Answers questions about this platform | Prepares you for job interviews |
| **Context source** | Product docs FAISS index | Your parsed resume from DB |
| **API routes** | `/api/chat/*` | `/api/interview/*` |
| **Frontend** | Tab inside dashboard | Separate page `/dashboard/interview` |
| **Doc upload** | ❌ | ✅ PDF / DOCX |
| **FAISS / RAG** | ✅ | ❌ (resume injected directly) |

---

## API Endpoints

### Auth
| Method | Path | Body |
|--------|------|------|
| `POST` | `/api/register` | `{email, password, full_name?, phone?, university?}` |
| `POST` | `/api/login` | `{email, password}` |

### Resume
| Method | Path | Notes |
|--------|------|-------|
| `POST` | `/api/upload_resume?user_id=N` | Multipart file — parses resume then runs FAISS matching in background |
| `GET` | `/api/resumes/{user_id}` | List all resumes |
| `POST` | `/api/resumes/{resume_id}/activate?user_id=N` | Set active resume |
| `GET` | `/api/matches/{user_id}?requesting_user_id=N` | Cached match result or 202 if still running |
| `GET` | `/api/analysis_status/{user_id}` | Poll background job progress |
| `POST` | `/api/retry_matching/{user_id}?requesting_user_id=N` | Re-trigger matching |

### Insights & Opportunities
| Method | Path | Notes |
|--------|------|-------|
| `POST` | `/api/generate_insights` | `{user_id, company, title}` → cover letter + skill gap |
| `GET` | `/api/opportunities` | All internship listings |

### Product Assistant Chatbot
| Method | Path | Notes |
|--------|------|-------|
| `POST` | `/api/chat/session` | `{user_id}` → new session UUID |
| `GET` | `/api/chat/sessions/{user_id}` | List sessions |
| `POST` | `/api/chat` | `{user_id, session_id, message}` → RAG response |
| `GET` | `/api/chat/history/{user_id}/{session_id}` | Full history |
| `POST` | `/api/chat/feedback` | `{message_id, feedback: "like"/"dislike"}` |

### Interview Prep Agent
| Method | Path | Notes |
|--------|------|-------|
| `POST` | `/api/interview/session` | `{user_id}` → new `interview-<uuid>` session |
| `GET` | `/api/interview/sessions/{user_id}` | List interview sessions |
| `POST` | `/api/interview/chat` | `{user_id, session_id, message, doc_context?}` → AI response |
| `POST` | `/api/interview/upload_doc` | Multipart PDF/DOCX → returns extracted text |
| `GET` | `/api/interview/history/{user_id}/{session_id}` | Full history |

### Application Tracker
| Method | Path | Notes |
|--------|------|-------|
| `POST` | `/api/apply` | `{user_id, title, company, location?, duration?, skills?, apply_url?}` → records application |
| `GET` | `/api/applications/{user_id}` | List all applications, newest-first |
| `PATCH` | `/api/applications/{application_id}/status?status=X&user_id=N` | Update status: `applied` / `interviewing` / `offered` / `rejected` |

---

## Setup

### Prerequisites
- Python 3.10+
- Node.js 18+

### 1. Environment Variables
Create `.env` in the project root:
```env
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
```

### 2. Backend
```bash
# Activate virtual environment
venv\Scripts\activate          # Windows
source venv/bin/activate       # Mac/Linux

# Install dependencies
pip install -r backend/requirements.txt

# Build FAISS indexes (run once)
python backend/vector_store/indexer.py
python backend/chatbot/doc_indexer.py
```

### 3. Frontend
```bash
cd frontend
npm install
```

### 4. Run
```bash
# Both servers at once
python start.py

# Or separately
cd backend && uvicorn main:app --reload --port 8000
cd frontend && npm run dev
```

### 5. Access
- **App:** http://localhost:3000
- **API:** http://localhost:8000
- **Swagger Docs:** http://localhost:8000/docs

---

## Database Schema

### `users`
`id`, `email` (unique), `hashed_password`, `full_name`, `phone`, `university`

### `resumes`
`id`, `filename`, `raw_text`, `structured_data` (JSON string), `match_result` (JSON string), `is_active`, `created_at`, `user_id` (FK)

**`structured_data` shape:**
```json
{ "name": "", "skills": [], "education": "", "experience": "", "projects": "" }
```

### `chat_messages`
`id`, `user_id` (FK), `session_id`, `role` (`"user"` / `"assistant"`), `content`, `created_at`, `source_chunks` (JSON), `feedback`

> Session IDs prefixed with `"interview-"` belong to the Interview Prep Agent. Plain UUIDs belong to the Product Chatbot.

### `internship_applications`
`id`, `user_id` (FK), `title`, `company`, `location`, `duration`, `skills`, `apply_url`, `applied_at`, `status` (`"applied"` / `"interviewing"` / `"offered"` / `"rejected"`)

---

## Limitations

- **Small internship dataset** — demonstration only, not production scale
- **No JWT auth** — `user_id` stored in `localStorage`; production would use JWT or HTTP-only cookies
- **PostgreSQL** — default connection is `localhost:5432/internship_db`; configure via `DATABASE_URL` in `.env` for a remote instance
- **Groq model** — `groq/compound-mini` pinned in `config.py`; update there if a preferred model is available

