import os
import json
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from config import GROQ_MODEL, GEMINI_MODEL, TOP_K_MATCHES

# Load Environment Variables (.env file containing GROQ_API_KEY)
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
load_dotenv(dotenv_path)

class InternshipMatcher:
    def __init__(self, vectorstore_path=os.path.join(os.path.dirname(os.path.abspath(__file__)), "vector_store", "internships_faiss_index")):
        self.embedding_model = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
        
        # Load Vector Store
        try:
            self.vectorstore = FAISS.load_local(
                vectorstore_path, 
                self.embedding_model, 
                allow_dangerous_deserialization=True
            )
        except Exception as e:
            print(f"Error loading vector store from {vectorstore_path}: {e}")
            self.vectorstore = None
            
        # Groq — ultra-fast inference for RAG evaluation and skill gap (structured, concise)
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            print("WARNING: GROQ_API_KEY is not set.")

        self.llm = ChatGroq(
            model=GROQ_MODEL,
            temperature=0.2,   # Low temperature for factual, grounded matching
            max_tokens=1024,   # Enough for full rationale without truncation
        )

        # Gemini — multimodal + long-form for cover letter generation
        gemini_api_key = os.getenv("GEMINI_API_KEY")
        if not gemini_api_key:
            print("WARNING: GEMINI_API_KEY is not set. Cover letter generation will fail.")

        self.gemini_llm = ChatGoogleGenerativeAI(
            model=GEMINI_MODEL,
            google_api_key=gemini_api_key,
            temperature=0.4,   # Slightly creative for natural-sounding prose
        )

        # Setup RAG chain
        self._setup_chain()

    def _format_docs(self, docs):
        return "\n\n".join(
            f"[{d.metadata['company']} - {d.metadata['title']}]\nLocation: {d.metadata['location']}\nDuration: {d.metadata['duration']}\n{d.page_content}" 
            for d in docs
        )

    def _setup_chain(self):
        if not self.vectorstore:
            return
            
        # 1. Setup the Retriever
        retriever = self.vectorstore.as_retriever(
            search_type="similarity",
            search_kwargs={"k": TOP_K_MATCHES}
        )

        # 2. Create the Prompt Template
        match_prompt = ChatPromptTemplate.from_messages([
            ("system", 
             "You are an expert technical recruiter and internship matcher. Based ONLY on the provided internship opportunities (Context), "
             "explain which internship is the best fit for the candidate and why. Provide a matching rationale and output the relevance score/rank if possible. "
             "Do not hallucinate skills or requirements. If the candidate doesn't match well, mention what they are lacking."),
            ("human", "Internship Opportunities (Context):\n{context}\n\nCandidate Resume Summary:\n{candidate_summary}")
        ])

        # 3. Build the RAG Chain using LCEL
        # Input: dict with "embedding_query" (for FAISS) and "candidate_summary" (for LLM prompt)
        self.rag_chain = (
            {
                "context": (lambda x: x["embedding_query"]) | retriever | self._format_docs,
                "candidate_summary": lambda x: x["candidate_summary"],
            }
            | match_prompt
            | self.llm
            | StrOutputParser()
        )
        
    def _build_embedding_query(self, candidate) -> str:
        """
        Skills/domain-only string used for FAISS vector search.
        Name is intentionally excluded — it's noise for semantic skill matching.
        """
        skills_str = ", ".join(candidate.get("skills", []))
        return (
            f"Skills: {skills_str}\n"
            f"Education: {candidate.get('education', 'N/A')}\n"
            f"Experience: {candidate.get('experience', 'N/A')}\n"
            f"Projects: {candidate.get('projects', 'N/A')}"
        )

    def generate_candidate_summary(self, candidate) -> str:
        """
        Full candidate summary including name — used in LLM prompts only (not embeddings).
        """
        skills_str = ", ".join(candidate.get("skills", []))
        return (
            f"Name: {candidate.get('name', 'Unknown')}\n"
            f"Skills: {skills_str}\n"
            f"Education: {candidate.get('education', 'N/A')}\n"
            f"Experience: {candidate.get('experience', 'N/A')}\n"
            f"Projects: {candidate.get('projects', 'N/A')}"
        )

    def match_candidate(self, candidate):
        if not self.vectorstore:
            return "Vector store not loaded."
        # Use embedding query (no name) for retrieval, full summary for LLM prompt
        embedding_query = self._build_embedding_query(candidate)
        candidate_summary = self.generate_candidate_summary(candidate)
        result = self.rag_chain.invoke({"embedding_query": embedding_query, "candidate_summary": candidate_summary})
        return result

    def get_raw_retrieval(self, candidate, k=3):
        """Get retrieved documents and scores without LLM evaluation."""
        if not self.vectorstore:
            return []

        embedding_query = self._build_embedding_query(candidate)
        docs_and_scores = self.vectorstore.similarity_search_with_score(embedding_query, k=k)

        results = []
        for doc, score in docs_and_scores:
            # Convert L2 distance to a 0–100% relevance score (lower L2 = higher relevance)
            relevance_score = round(max(0.0, 1.0 - float(score) / 2.0) * 100, 1)
            results.append({
                "company": doc.metadata["company"],
                "title": doc.metadata["title"],
                "l2_distance": float(score),       # Raw FAISS L2 distance (lower = better)
                "relevance_score": relevance_score  # Human-readable 0–100% score
            })
        return results

    def get_internship_context(self, company: str, title: str) -> str:
        """
        Look up an internship directly from the JSON dataset by company+title.
        More reliable than a second FAISS search (which can return the wrong entry).
        """
        data_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "data_prep", "internship_data.json"
        )
        try:
            with open(data_path, "r") as f:
                internships = json.load(f)
            for item in internships:
                if item["company"] == company and item["title"] == title:
                    return (
                        f"[{item['company']} - {item['title']}]\n"
                        f"Description: {item['description']}\n"
                        f"Skills Required: {item['skills']}\n"
                        f"Education: {item['education']}\n"
                        f"Experience: {item['experience']}\n"
                        f"Location: {item['location']}\n"
                        f"Duration: {item['duration']}"
                    )
        except Exception as e:
            print(f"Warning: Could not load internship data for context: {e}")
        return ""

    def generate_cover_letter(self, candidate, company, title):
        """
        Uses Gemini — best for long-form creative writing with large context.
        Gemini produces more natural, fluent cover letters than a speed-optimised model.
        """
        internship_context = self.get_internship_context(company, title)
        candidate_summary = self.generate_candidate_summary(candidate)

        gemini_api_key = os.getenv("GEMINI_API_KEY")
        if not gemini_api_key:
            raise RuntimeError("GEMINI_API_KEY not set. Cannot generate cover letter.")

        prompt = ChatPromptTemplate.from_messages([
            ("system",
             "You are an expert career coach. Write a professional, personalized cover letter "
             "for the candidate applying to the given internship. Highlight how their skills align "
             "with the internship requirements. Use the candidate's actual name — do not use "
             "placeholders like [Your Name]."),
            ("human", f"Internship Details:\n{internship_context}\n\nCandidate Resume:\n{candidate_summary}")
        ])

        chain = prompt | self.gemini_llm | StrOutputParser()
        return chain.invoke({})

    def generate_skill_gap(self, candidate, company, title):
        """
        Uses Groq — best for fast, concise, structured bullet-point output.
        Speed matters here since this is shown alongside the cover letter in real-time.
        """
        internship_context = self.get_internship_context(company, title)
        candidate_summary = self.generate_candidate_summary(candidate)

        prompt = ChatPromptTemplate.from_messages([
            ("system",
             "You are an expert technical recruiter. Compare the candidate's resume with the "
             "internship details. Identify specifically what skills the candidate is missing or "
             "needs to improve to be a perfect fit. Be concise, actionable, and format as bullet points."),
            ("human", f"Internship Details:\n{internship_context}\n\nCandidate Resume:\n{candidate_summary}")
        ])

        chain = prompt | self.llm | StrOutputParser()
        return chain.invoke({})

if __name__ == "__main__":
    # Simple test if run directly
    matcher = InternshipMatcher()
    
    test_candidate = {
        "name": "Test User",
        "skills": ["Python", "FastAPI", "SQL"],
        "education": "B.Tech CS",
        "experience": "1 year backend developer",
        "projects": "REST API"
    }
    
    print("Evaluating test candidate...")
    result = matcher.match_candidate(test_candidate)
    print("\n--- Match Results ---")
    print(result)
