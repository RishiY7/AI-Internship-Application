from sqlalchemy import Column, Integer, String, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    
    resumes = relationship("Resume", back_populates="owner")

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    raw_text = Column(Text)
    structured_data = Column(Text)   # JSON string of extracted skills/edu/etc
    match_result = Column(Text, nullable=True)  # JSON string of cached FAISS+LLM result
    is_active = Column(Boolean, default=False)
    user_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="resumes")
