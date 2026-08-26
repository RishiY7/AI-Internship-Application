# Full-Stack Internship Matching RAG System

This project is a Retrieval-Augmented Generation (RAG) pipeline that takes a candidate's resume data and retrieves the most relevant internships from an Internship Vector Database based on semantic similarity. It has been built as a modern Full-Stack web application.

## Architecture & Tech Stack

- **Frontend:** Next.js (React), Tailwind CSS. Provides a UI for user registration, resume PDF uploading, and visualizing RAG match results.
- **Backend:** FastAPI (Python). Handles authentication, PDF parsing, and exposing the RAG pipeline as REST APIs.
- **Database:** PostgreSQL (SQLAlchemy). Stores user credentials securely (bcrypt) and keeps a record of uploaded resumes and extracted JSON data.
- **Vector Store:** FAISS CPU. Stores embeddings of the internship opportunities generated via `sentence-transformers/all-MiniLM-L6-v2`.
- **LLM/RAG — Dual-Model Strategy:**
  - **Gemini 1.5 Flash** (Google): Resume PDF parsing (native multimodal input — no text extraction needed) and cover letter generation (long-form creative writing).
  - **Groq + Qwen 3.6-27B**: RAG match evaluation and skill gap analysis (ultra-fast inference, structured output).

## Project Structure

- `backend/data_prep/`: Contains the JSON datasets for internships (`internship_data.json`) and synthetic candidate profiles (`resumes.json`).
- `backend/vector_store/`: Contains `indexer.py` which reads the internship data, creates embeddings, and saves the vector store.
- `backend/matching_engine.py`: The core semantic matching and RAG prompt logic. 
- `backend/main.py`: FastAPI server handling routes and database sessions.
- `backend/tests/run_tests.py`: Batch test suite matching 10 distinct synthetic candidates representing various archetypes (Skill-based, Education-based, AI/ML, etc.) as requested by the assignment.
- `frontend/`: Next.js web application.

## Setup Instructions

### 1. Database Setup
Ensure PostgreSQL is running locally. Create a database named `internship_db`.

### 2. Backend Setup
Create a `.env` file in the `backend/` directory and add your Groq API Key:
```env
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/internship_db
```
Install dependencies and build the vector database:
```bash
cd backend
pip install -r requirements.txt
python vector_store/indexer.py
```
Start the API Server:
```bash
uvicorn main:app --reload
```

### 3. Frontend Setup
In a separate terminal, navigate to the frontend directory:
```bash
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:3000` to register, upload a resume, and test the RAG matching engine.

## Testing (Assignment Requirement)
To verify the system against the 5-10 distinct candidate archetypes specified in the assignment without using the UI, you can run the batch test script:
```bash
cd backend
python tests/run_tests.py
```

## Limitations & Future Work

- **Small internship dataset:** The vector store currently contains only 10 internship entries — sufficient to demonstrate the RAG pipeline but not representative of a production system. Scaling to thousands of listings would improve match diversity and accuracy.
- **No JWT auth:** User sessions are stored via `user_id` in `localStorage`. A production deployment would replace this with JWT tokens or HTTP-only cookies.
- **Normalised relevance score:** Raw FAISS L2 distances are converted to a 0–100% relevance score using `max(0, 1 - L2/2) * 100`. This is an approximation; calibration against real user data would improve reliability.
- **Single embedding model:** Only one embedding model (`all-MiniLM-L6-v2`) is used. A fine-tuned domain-specific model could improve matching quality for technical roles.

