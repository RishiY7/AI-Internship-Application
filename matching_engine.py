import os
import json
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

# Load Environment Variables (.env file containing GROQ_API_KEY)
load_dotenv()

class InternshipMatcher:
    def __init__(self, vectorstore_path="vector_store/internships_faiss_index"):
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
            
        # Initialize Groq LLM
        # Ensure you have GROQ_API_KEY set in your environment variables or .env file
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            print("WARNING: GROQ_API_KEY is not set. The matching engine will fail when invoking LLM.")
            
        self.llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            temperature=0.2, # Low temperature for factual, grounded matching
            max_tokens=512,
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
            search_kwargs={"k": 3} # Retrieve top 3 internships
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
        self.rag_chain = (
            {"context": retriever | self._format_docs, "candidate_summary": RunnablePassthrough()}
            | match_prompt
            | self.llm
            | StrOutputParser()
        )
        
    def generate_candidate_summary(self, candidate):
        """Convert structured candidate data to string format for embedding"""
        skills_str = ", ".join(candidate.get("skills", []))
        return f"Name: {candidate['name']}\nSkills: {skills_str}\nEducation: {candidate['education']}\nExperience: {candidate['experience']}\nProjects: {candidate['projects']}"

    def match_candidate(self, candidate):
        if not self.vectorstore:
            return "Vector store not loaded."
            
        candidate_summary = self.generate_candidate_summary(candidate)
        result = self.rag_chain.invoke(candidate_summary)
        return result

    def get_raw_retrieval(self, candidate, k=3):
        """Just get the retrieved documents and scores without LLM evaluation"""
        if not self.vectorstore:
            return []
        
        candidate_summary = self.generate_candidate_summary(candidate)
        docs_and_scores = self.vectorstore.similarity_search_with_score(candidate_summary, k=k)
        
        results = []
        for doc, score in docs_and_scores:
            results.append({
                "company": doc.metadata["company"],
                "title": doc.metadata["title"],
                "l2_distance": float(score)  # Lower is better in FAISS L2 distance
            })
        return results

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
