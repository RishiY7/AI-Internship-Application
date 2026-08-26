import os
import json
import pymupdf as fitz  # PyMuPDF for PDF text extraction
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from pydantic import BaseModel
from typing import List, Optional, Dict

from database import engine, Base, get_db
import models
from matching_engine import InternshipMatcher
from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI  # kept for cover letter generation
from config import GROQ_MODEL, GEMINI_MODEL

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
matcher = InternshipMatcher(vectorstore_path="vector_store/internships_faiss_index")

# In-memory job status tracker: user_id -> {"status": "...", "step": "..."}
job_status: Dict[int, dict] = {}

# --- Pydantic Models ---
class UserCreate(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str
    
class InsightRequest(BaseModel):
    user_id: int
    company: str
    title: str

# --- Helpers ---
def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Fallback: extract raw text using PyMuPDF (used for storing raw_text in DB)."""
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text()
    return text

def parse_resume(file_bytes: bytes, filename: str, raw_text: str) -> dict:
    """
    Resume parser — uses Groq (ultra-fast) for all file types.
    PyMuPDF already extracted the text from PDFs; Groq gets clean plain text.
    Gemini is intentionally not used here — it's slow and rate-limited on free tier.
    """
    print("Parsing resume with Groq...")
    llm = ChatGroq(model=GROQ_MODEL, temperature=0)
    extraction_prompt = (
        "You are a resume parser. Extract the following fields from the resume text below and "
        "return ONLY a valid JSON object with these exact keys: "
        "\"name\" (string), \"skills\" (list of strings), \"education\" (string), "
        "\"experience\" (string), \"projects\" (string). "
        "If a field is missing, use \"N/A\" for strings or [] for lists. "
        "Do not include markdown fences or any other text — only the JSON object.\n\n"
        f"RESUME TEXT:\n{raw_text}"
    )
    response = llm.invoke(extraction_prompt)
    raw = response.content.strip()
    # Find the outermost JSON object to ignore any markdown or chatty preamble
    start = raw.find('{')
    end = raw.rfind('}')
    if start != -1 and end != -1:
        raw = raw[start:end+1]
    return json.loads(raw.strip())

# --- Endpoints ---
@app.post("/api/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = pwd_context.hash(user.password)
    new_user = models.User(email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User registered successfully", "user_id": new_user.id}

@app.post("/api/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not pwd_context.verify(user.password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    return {"message": "Login successful", "user_id": db_user.id}

@app.post("/api/upload_resume")
async def upload_resume(
    user_id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    content = await file.read()
    is_pdf = file.filename.lower().endswith(".pdf")

    # Step 1 — extract raw text (fast, local PyMuPDF)
    job_status[user_id] = {"status": "running", "step": "Extracting text from resume…"}
    try:
        raw_text = extract_text_from_pdf(content) if is_pdf else content.decode("utf-8")
    except Exception as e:
        job_status[user_id] = {"status": "error", "step": str(e)}
        raise HTTPException(status_code=400, detail=f"Could not read file: {e}")

    # Step 2 — LLM parsing (Gemini/Groq) — still synchronous but fast enough
    job_status[user_id] = {"status": "running", "step": "Parsing resume with AI…"}
    try:
        extracted_data = parse_resume(content, file.filename, raw_text)
    except Exception as e:
        job_status[user_id] = {"status": "error", "step": str(e)}
        raise HTTPException(status_code=500, detail=f"LLM Extraction failed: {e}")

    # Deactivate old resumes, save new one
    db.query(models.Resume).filter(models.Resume.user_id == user_id).update({"is_active": False})
    resume = models.Resume(
        filename=file.filename,
        raw_text=raw_text,
        structured_data=json.dumps(extracted_data),
        is_active=True,
        owner=db_user,
    )
    db.add(resume)
    db.commit()

    # Step 3 — kick off slow FAISS + LLM matching in the background
    job_status[user_id] = {"status": "running", "step": "Running AI matching engine…"}
    background_tasks.add_task(_run_matching_background, user_id, extracted_data)

    return {
        "message": "Resume parsed — matching is running in background.",
        "extracted_data": extracted_data,
    }


def _run_matching_background(user_id: int, candidate_data: dict):
    """Runs FAISS retrieval + LLM rationale in the background after upload returns."""
    from database import SessionLocal
    db = SessionLocal()
    try:
        job_status[user_id] = {"status": "running", "step": "Searching vector store…"}
        raw_matches = matcher.get_raw_retrieval(candidate_data, k=3)

        # Rationale disabled per user request
        llm_rationale = ""

        # Store result so /api/matches/{user_id} can return it
        resume = db.query(models.Resume).filter(
            models.Resume.user_id == user_id, models.Resume.is_active == True
        ).first()
        if resume:
            result = json.dumps({"raw_matches": raw_matches, "llm_rationale": llm_rationale})
            resume.match_result = result
            db.commit()

        job_status[user_id] = {"status": "done", "step": "Analysis complete!"}
    except Exception as e:
        job_status[user_id] = {"status": "error", "step": str(e)}
    finally:
        db.close()


@app.get("/api/analysis_status/{user_id}")
def get_analysis_status(user_id: int):
    """Poll this endpoint to get live progress of background resume analysis."""
    return job_status.get(user_id, {"status": "idle", "step": ""})



@app.get("/api/resumes/{user_id}")
def get_resumes(user_id: int, db: Session = Depends(get_db)):
    resumes = db.query(models.Resume).filter(models.Resume.user_id == user_id).order_by(models.Resume.id.desc()).all()
    return [{"id": r.id, "filename": r.filename, "is_active": r.is_active} for r in resumes]

@app.post("/api/resumes/{resume_id}/activate")
def activate_resume(resume_id: int, user_id: int, db: Session = Depends(get_db)):
    target = db.query(models.Resume).filter(models.Resume.id == resume_id, models.Resume.user_id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Resume not found")
        
    db.query(models.Resume).filter(models.Resume.user_id == user_id).update({"is_active": False})
    target.is_active = True
    db.commit()
    return {"message": "Resume activated"}

@app.get("/api/matches/{user_id}")
def get_matches(user_id: int, db: Session = Depends(get_db)):
    # Try getting active resume first, fallback to most recent
    resume = db.query(models.Resume).filter(models.Resume.user_id == user_id, models.Resume.is_active == True).first()
    if not resume:
        resume = db.query(models.Resume).filter(models.Resume.user_id == user_id).order_by(models.Resume.id.desc()).first()

    if not resume:
        raise HTTPException(status_code=404, detail="No resume uploaded for this user")

    candidate_data = json.loads(resume.structured_data)

    # If background matching is done, return cached result
    if resume.match_result:
        cached = json.loads(resume.match_result)
        return {
            "candidate": candidate_data,
            "raw_matches": cached["raw_matches"],
            "llm_rationale": cached["llm_rationale"],
        }

    # Still running — tell the frontend to keep polling
    raise HTTPException(status_code=202, detail="Matching in progress")

@app.post("/api/generate_insights")
def generate_insights(req: InsightRequest, db: Session = Depends(get_db)):
    resume = db.query(models.Resume).filter(models.Resume.user_id == req.user_id, models.Resume.is_active == True).first()
    if not resume:
        resume = db.query(models.Resume).filter(models.Resume.user_id == req.user_id).order_by(models.Resume.id.desc()).first()
    if not resume:
        raise HTTPException(status_code=404, detail="No resume uploaded")
        
    candidate_data = json.loads(resume.structured_data)
    
    try:
        cover_letter = matcher.generate_cover_letter(candidate_data, req.company, req.title)
        skill_gap = matcher.generate_skill_gap(candidate_data, req.company, req.title)
        return {
            "cover_letter": cover_letter,
            "skill_gap": skill_gap
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Insight generation failed: {e}")


@app.get("/api/opportunities")
def get_opportunities():
    """Return all internship listings from the dataset (public â€” no auth required)."""
    data_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "data_prep", "internship_data.json"
    )
    try:
        with open(data_path, "r") as f:
            internships = json.load(f)
        return internships
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not load opportunities: {e}")

