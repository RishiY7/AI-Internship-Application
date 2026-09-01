# InternMatch AI — Product Knowledge Document

> This document serves as the primary knowledge base for the InternMatch AI Product Assistant Chatbot.
> It covers the product overview, all features, usage guide, architecture, and technology stack.

---

## 1. Product Overview

### Product Name
**InternMatch AI**

### Product Description
InternMatch AI is an AI-powered internship matching platform that helps students and fresh graduates find the most relevant internship opportunities. It uses Retrieval-Augmented Generation (RAG) and large language models (LLMs) to intelligently parse resumes, match candidates to internships, generate personalised cover letters, and identify skill gaps — all in one unified dashboard.

### Problem the Product Solves
Finding internships is time-consuming and imprecise. Students spend hours manually reading job descriptions and tailoring applications. Recruiters spend equal time sifting through irrelevant resumes. InternMatch AI eliminates this friction by:
- Automatically parsing and understanding resume content using AI
- Semantically matching candidates to relevant internships using vector similarity
- Generating personalised cover letters in seconds
- Showing candidates exactly which skills they need to develop for a target role

### Target Users
- **Students and fresh graduates** seeking internships relevant to their skills and academic background
- **Recruiters and hiring managers** who want to surface the most suitable candidates quickly
- **Career counsellors** helping students navigate internship applications

### Main Objectives
1. Automate resume parsing and structured data extraction using LLMs
2. Perform semantic internship matching using FAISS vector similarity search
3. Generate personalised, professional cover letters using AI
4. Identify and communicate skill gaps between the candidate profile and job requirements
5. Provide a conversational Product Assistant to answer user questions about the platform

---

## 2. Product Features and Functionalities

### Feature 1: Resume Upload and AI Parsing

**Feature Name:** Resume Upload and AI Parsing

**Purpose:**
Allow users to submit their resume so the system can extract structured information (name, skills, education, experience, projects) and use it as the basis for all AI-powered features.

**How It Works:**
1. The user uploads a PDF resume through the dashboard
2. PyMuPDF extracts the raw text from the PDF
3. The extracted text is sent to Groq LLM (llama-3.1-8b-instant) with a structured extraction prompt
4. The LLM returns a JSON object with: name, skills (list), education, experience, projects
5. The structured data is stored in PostgreSQL linked to the user account
6. Background processing immediately triggers the AI matching engine

**How Users Can Use It:**
1. Log in to the InternMatch AI dashboard
2. Click the "Upload Resume" button on the Overview tab
3. Select a PDF file from your device
4. Click "Upload and Analyse"
5. Watch the live progress indicator: Extracting text → Parsing with AI → Running matching engine

**Expected Output or Result:**
- Confirmation that the resume was parsed successfully
- Displayed extracted data: name, skills list, education, experience summary, projects
- AI matching begins automatically in the background

---

### Feature 2: AI Internship Matching

**Feature Name:** AI Internship Matching

**Purpose:**
Surface the most semantically relevant internship opportunities for the user by comparing their resume against all available listings using vector similarity search.

**How It Works:**
1. The user resume data (skills, education, experience, projects) is converted into a vector embedding using sentence-transformers/all-MiniLM-L6-v2
2. This embedding is compared against pre-indexed internship listing embeddings stored in a FAISS vector database
3. The top 3 most similar internship listings are retrieved using L2 distance
4. The retrieved listings are passed to Groq LLM along with the candidate summary
5. The LLM generates a natural-language matching rationale explaining why each listing fits
6. Results are cached in PostgreSQL for instant retrieval on return visits

**How Users Can Use It:**
1. Upload your resume (matching runs automatically after upload)
2. Navigate to the Overview tab on the dashboard
3. Your top matched internships appear with company name, job title, and relevance score
4. Click on any match to view full details

**Expected Output or Result:**
- A ranked list of the top 3 most relevant internship opportunities
- Each result shows: Company, Job Title, Relevance Score (0-100%)
- An AI-generated rationale paragraph explaining the match

---

### Feature 3: Cover Letter Generator

**Feature Name:** Cover Letter Generator

**Purpose:**
Automatically produce a professional, personalised cover letter tailored to a specific internship listing.

**How It Works:**
1. The user selects an internship (company and job title)
2. The system retrieves the full internship description from the dataset
3. The user resume data is combined with the internship details into a prompt
4. Google Gemini (gemini-2.5-flash) generates the cover letter — chosen for long-form creative writing quality
5. If Gemini is rate-limited, the system falls back to Groq automatically

**How Users Can Use It:**
1. Navigate to the Opportunities tab
2. Find any internship listing
3. Click "Generate Cover Letter"
4. Wait 3-8 seconds for generation
5. Read, copy, or use the generated letter

**Expected Output or Result:**
- A complete, ready-to-send cover letter (3-4 paragraphs)
- Uses the candidate real name (no placeholders)
- Personalised to the specific company and role
- Highlights the candidate relevant skills from their resume

---

### Feature 4: Skill Gap Analysis

**Feature Name:** Skill Gap Analysis

**Purpose:**
Show candidates exactly which skills they are missing for a target internship role, enabling targeted learning and development.

**How It Works:**
1. The user selects a specific internship
2. The system retrieves the full internship requirements
3. The candidate skills from their resume are compared against the job requirements
4. Groq LLM identifies specific gaps and returns a concise bullet-point list

**How Users Can Use It:**
1. Navigate to the Opportunities tab
2. Click "Generate Insights" on any internship listing
3. View the Skill Gap section in the results panel

**Expected Output or Result:**
- A bullet-point list of specific skills the candidate lacks for that role
- Actionable and concise items (e.g. "Experience with Docker containerisation")
- Generated within 2-5 seconds

---

### Feature 5: Product Assistant Chatbot

**Feature Name:** Product Assistant Chatbot

**Purpose:**
Provide an intelligent conversational assistant that answers any question about InternMatch AI — how to use it, how it works, its architecture, and technology — using this product knowledge document as its knowledge source.

**How It Works:**
1. The user types a question in the chat interface
2. The question is converted to a vector embedding using sentence-transformers/all-MiniLM-L6-v2
3. The embedding searches a FAISS index built from this Product Knowledge Document
4. The top 3 most relevant document chunks are retrieved
5. The previous conversation history (last 10 messages) is retrieved from PostgreSQL for this user and session
6. A prompt is built: System Instructions + Conversation History + Retrieved Context + Current Question
7. Groq LLM (llama-3.1-8b-instant) generates the response
8. The response is returned and the full conversation is stored in the database

**How Users Can Use It:**
1. Log in and click the "Product Assistant" tab in the dashboard sidebar
2. Type any question about InternMatch AI
3. Press Enter or click Send
4. The chatbot responds using the product documentation
5. Ask follow-up questions — the chatbot remembers the conversation within the session
6. Start a new session anytime with "New Chat"

**Expected Output or Result:**
- Accurate, document-grounded answers to product questions
- Responses maintain context across multiple turns in a session
- Each session is isolated per user — no cross-user data leakage
- Optional source citations showing which document section was used

---

## 3. How to Use the Product

### General Flow
1. User logs into the application
2. User accesses the product dashboard
3. User selects the required functionality from the sidebar
4. User uploads or enters the required information
5. The system processes the request using AI
6. The user receives the final result

### Detailed Step-by-Step Guide

**Step 1 — Register an Account**
- Visit the InternMatch AI homepage
- Click "Get Started" or "Register"
- Enter your email address and a password
- Submit the form
- You are automatically redirected to the dashboard

**Step 2 — Upload Your Resume**
- On the dashboard Overview tab, find the "Upload Resume" section
- Click "Choose File" and select your PDF resume
- Click "Upload and Analyse Resume"
- A live progress bar shows: Extracting text → Parsing with AI → Running AI matching
- Once complete, your parsed resume details appear on the screen

**Step 3 — View Your AI-Matched Internships**
- Your top 3 matched internships appear on the Overview tab after processing
- Each match shows: Company, Title, Relevance Score
- An AI rationale explains why each listing matches your profile

**Step 4 — Browse All Opportunities**
- Click the "Opportunities" tab in the sidebar
- Browse or search all available internship listings
- Use the location filter to narrow results

**Step 5 — Generate a Cover Letter**
- On any internship listing, click "Generate Cover Letter"
- Wait a few seconds for the AI to generate your personalised letter
- Read and copy the generated text

**Step 6 — View Skill Gap Analysis**
- On any listing, click "Generate Insights"
- The Skill Gap section shows exactly which skills you are missing for that role

**Step 7 — Use the Product Assistant**
- Click "Product Assistant" in the sidebar
- Type any question about InternMatch AI
- Examples: "How does matching work?", "What is RAG?", "How do I upload a resume?"
- Press Enter to submit
- Ask follow-up questions — the assistant remembers the conversation

---

## 4. Product Architecture

### High-Level Architecture

```
User
  |
  v
Frontend (Next.js / React)
  |
  v
Backend API (FastAPI / Python)
  |
  +-- LLM Layer (Groq + Gemini via LangChain)
  +-- Vector Database (FAISS)
  +-- Relational Database (PostgreSQL)
  +-- Document Store (Internship JSON + Product Knowledge PDF)
```

### Component Responsibilities

**Frontend — Next.js (React)**
- Role: User interface for the entire application
- Renders the dashboard with tabbed navigation (Overview, Opportunities, Profile, Settings, Product Assistant)
- Handles file upload, button clicks, and API calls
- Displays AI-generated results to the user
- Communicates with the backend via HTTP REST API

**Backend — FastAPI (Python)**
- Role: Business logic layer and API gateway
- Handles user registration, login, resume upload, and result retrieval
- Orchestrates AI operations: triggers LLM parsing, FAISS search, and LLM generation
- Manages database reads and writes
- Runs long operations as background tasks to keep the API responsive

**LLM Layer — Groq + Google Gemini via LangChain**
- Role: AI intelligence — generates all text outputs
- Groq (llama-3.1-8b-instant): Resume parsing, matching rationale, skill gap, chatbot responses
- Google Gemini (gemini-2.5-flash): Cover letter generation (superior creative writing quality)
- LangChain: Orchestration framework for prompts, RAG chains, and LLM calls

**Vector Database — FAISS**
- Role: Semantic similarity search engine
- Internship Index: Embeddings for all internship listings — used for job matching
- Product Index: Embeddings for this knowledge document — used by the chatbot
- Embedding model: sentence-transformers/all-MiniLM-L6-v2

**Relational Database — PostgreSQL**
- Role: Persistent data storage
- Stores: user accounts, uploaded resumes, parsed data, match results, chat conversations

### Complete System Flow for Chatbot

```
User sends question
       |
       v
Frontend (Next.js) -- HTTP POST /api/chat --> Backend (FastAPI)
                                                     |
                              +----------------------+---------------------+
                              |                                            |
                              v                                            v
                  Retrieve chat history                     Retrieve relevant context
                  from PostgreSQL                           from FAISS (product index)
                  (by user_id + session_id)                 (vector similarity search)
                              |                                            |
                              +----------------+---------------------------+
                                               |
                                               v
                                     Build combined prompt:
                                     System Instructions
                                     + Conversation History
                                     + Retrieved Document Chunks
                                     + Current User Question
                                               |
                                               v
                                    Groq LLM generates response
                                               |
                             +-----------------+-----------------+
                             |                                   |
                             v                                   v
                    Return to user (Frontend)        Store in PostgreSQL
                                                  (user_id, session_id,
                                                   role, content, timestamp)
```

---

## 5. Technology Stack

### Why Each Technology Was Selected

**Frontend**

| Technology | Reason |
|-----------|--------|
| Next.js (React) | Server-side rendering for fast initial page load. React component model for clean, reusable UI. TypeScript support for type safety. Already built and production-ready. |
| TypeScript | Catches type errors at compile time. Improves reliability of API calls and state management. |
| CSS | Custom styles for the glassmorphism dashboard design. |

**Backend**

| Technology | Reason |
|-----------|--------|
| Python | Dominant language for AI/ML. All major LLM and vector search libraries have first-class Python support. |
| FastAPI | Async-first, high-performance Python web framework. Auto-generates OpenAPI documentation. Simple dependency injection pattern. Already built. |
| Pydantic | Data validation for all API request and response models. Built into FastAPI. |
| Uvicorn | ASGI server for running FastAPI in production. Fast and lightweight. |

**AI and LLM**

| Technology | Reason |
|-----------|--------|
| LangChain | Provides ready-made abstractions for RAG chains, prompt templates, document loaders, and vector store integrations. Reduces boilerplate. Already integrated. |
| Groq (llama-3.1-8b-instant) | Chosen over OpenAI: free tier with generous limits, ultra-low latency (~800 tokens/second on Groq LPU hardware), already configured. The assignment allows alternative LLMs with explanation. |
| Google Gemini (gemini-2.5-flash) | Superior quality for long-form creative writing. Used for cover letter generation with Groq as automatic fallback. |
| sentence-transformers/all-MiniLM-L6-v2 | Free, local embedding model. Produces high-quality 384-dimensional vectors for semantic similarity. No API cost. Already integrated. |

**Vector Database**

| Technology | Reason |
|-----------|--------|
| FAISS (Facebook AI Similarity Search) | High-performance vector similarity search. Runs entirely locally with no external service. Already used for the internship matching feature and reused for the product chatbot. |

**Relational Database**

| Technology | Reason |
|-----------|--------|
| PostgreSQL | Reliable, production-grade relational database. Supports complex queries needed for session-scoped conversation retrieval. Already running locally. |
| SQLAlchemy | Python ORM providing clean model definitions and session management. Already used for user and resume tables. |

**Document Processing**

| Technology | Reason |
|-----------|--------|
| PyMuPDF | Fast, reliable PDF text extraction. Used for resume parsing and for loading the product knowledge document into the RAG pipeline. Already in project dependencies. |

---

## 6. API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/register | Register a new user account |
| POST | /api/login | Login and receive user_id |

### Resume Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/upload_resume?user_id={id} | Upload and AI-parse a PDF resume |
| GET | /api/resumes/{user_id} | Get all resumes for a user |
| POST | /api/resumes/{resume_id}/activate?user_id={id} | Set a resume as active |
| GET | /api/analysis_status/{user_id} | Poll live progress of background analysis |

### Matching and Insights

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/matches/{user_id}?requesting_user_id={id} | Get AI match results |
| POST | /api/retry_matching/{user_id}?requesting_user_id={id} | Retry failed matching |
| POST | /api/generate_insights | Generate cover letter and skill gap |
| GET | /api/opportunities | Get all internship listings |

### Product Chatbot (new feature)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/chat/session | Create a new chat session, returns session_id |
| GET | /api/chat/sessions/{user_id} | List all chat sessions for a user |
| POST | /api/chat | Send a message, receive AI response |
| GET | /api/chat/history/{user_id}/{session_id} | Get full conversation history |

---

## 7. Database Schema

### users table
| Column | Type | Description |
|--------|------|-------------|
| id | Integer (PK) | Unique user identifier |
| email | String (unique) | User email address |
| hashed_password | String | Bcrypt-hashed password |
| full_name | String | User full name |
| phone | String | Contact number |
| university | String | Institution name |

### resumes table
| Column | Type | Description |
|--------|------|-------------|
| id | Integer (PK) | Unique resume identifier |
| user_id | Integer (FK) | References users.id |
| filename | String | Original file name |
| raw_text | Text | Full extracted PDF text |
| structured_data | Text (JSON) | Parsed fields: name, skills, education, experience, projects |
| match_result | Text (JSON) | Cached FAISS and LLM matching results |
| is_active | Boolean | Whether this is the current active resume |
| created_at | DateTime | Upload timestamp |

### chat_messages table
| Column | Type | Description |
|--------|------|-------------|
| id | Integer (PK) | Unique message identifier |
| user_id | Integer (FK) | References users.id |
| session_id | String (indexed) | UUID identifying the chat session |
| role | String | "user" or "assistant" |
| content | Text | Message content |
| created_at | DateTime | Message timestamp |
| source_chunks | JSON | Document chunks used for this response |
| feedback | String | User feedback: "like", "dislike", or null |

---

## 8. Setup and Configuration

### Prerequisites
- Python 3.10 or higher
- Node.js 18 or higher
- PostgreSQL 14 or higher

### Environment Variables
Create a .env file in the project root:
```
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=postgresql://postgres:password@localhost:5432/InternshipApp
```

### Backend Setup
```
1. Create virtual environment:    python -m venv venv
2. Activate:                      venv\Scripts\activate
3. Install dependencies:          pip install -r backend/requirements.txt
4. Run migrations:                python backend/migrate.py
5. Build chatbot FAISS index:     python backend/chatbot/doc_indexer.py
6. Start server:                  uvicorn backend.main:app --reload --port 8000
```

### Frontend Setup
```
1. Install dependencies:   cd frontend && npm install
2. Start dev server:       npm run dev
```

### Access Points
- Application: http://localhost:3000
- API: http://localhost:8000
- API Documentation: http://localhost:8000/docs
