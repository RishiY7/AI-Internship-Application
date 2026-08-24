# Full-Stack Internship Matching RAG System

This project is a Retrieval-Augmented Generation (RAG) pipeline that takes a candidate's resume data and retrieves the most relevant internships from an Internship Vector Database based on semantic similarity. It has been built as a modern Full-Stack web application.

## Architecture & Tech Stack

- **Frontend:** Next.js (React), Tailwind CSS. Provides a UI for user registration, resume PDF uploading, and visualizing RAG match results.
- **Backend:** FastAPI (Python). Handles authentication, PDF parsing, and exposing the RAG pipeline as REST APIs.
- **Database:** PostgreSQL (SQLAlchemy). Stores user credentials securely (bcrypt) and keeps a record of uploaded resumes and extracted JSON data.
- **Vector Store:** FAISS CPU. Stores embeddings of the internship opportunities generated via `sentence-transformers/all-MiniLM-L6-v2`.
- **LLM/RAG:** LangChain & Groq. Evaluates the retrieved FAISS context and provides reasoning on candidate fit. Also used for extracting structured JSON from raw PDF resumes.

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
GROQ_API_KEY=your_api_key_here
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
