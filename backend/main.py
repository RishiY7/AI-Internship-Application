import os
import json
import fitz # PyMuPDF
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from pydantic import BaseModel
from typing import List, Optional

from database import engine, Base, get_db
import models
from matching_engine import InternshipMatcher
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate

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

# --- Pydantic Models ---
class UserCreate(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str
    
class CandidateExtracted(BaseModel):
    name: str
    skills: List[str]
    education: str
    experience: str
    projects: str

class InsightRequest(BaseModel):
    user_id: int
    company: str
    title: str

# --- Helpers ---
def extract_text_from_pdf(file_bytes: bytes) -> str:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text()
    return text

def parse_resume_with_llm(raw_text: str) -> dict:
    llm = ChatGroq(model="qwen/qwen3.6-27b", temperature=0)
    structured_llm = llm.with_structured_output(CandidateExtracted)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "Extract the candidate information from the following resume text. If a field is missing, put 'N/A'."),
        ("human", "{text}")
    ])
    
    chain = prompt | structured_llm
    result = chain.invoke({"text": raw_text})
    return result.model_dump()

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
async def upload_resume(user_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    content = await file.read()
    
    try:
        raw_text = extract_text_from_pdf(content) if file.filename.endswith(".pdf") else content.decode("utf-8")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse file: {e}")
        
    try:
        extracted_data = parse_resume_with_llm(raw_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM Extraction failed: {e}")
    
    # Mark all other resumes as inactive
    db.query(models.Resume).filter(models.Resume.user_id == user_id).update({"is_active": False})
    
    # Save to DB
    resume = models.Resume(
        filename=file.filename,
        raw_text=raw_text,
        structured_data=json.dumps(extracted_data),
        is_active=True,
        owner=db_user
    )
    db.add(resume)
    db.commit()
    
    return {"message": "Resume processed successfully", "extracted_data": extracted_data}

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
    
    try:
        raw_matches = matcher.get_raw_retrieval(candidate_data, k=3)
        llm_rationale = matcher.match_candidate(candidate_data)
        
        return {
            "candidate": candidate_data,
            "raw_matches": raw_matches,
            "llm_rationale": llm_rationale
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Matching failed: {e}")

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
