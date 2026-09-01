"""
chat_engine.py
Phase 2.2 — ProductChatbot class.
Implements the full §6 memory flow:
  retrieve history -> retrieve RAG context -> build prompt -> LLM -> return + store
"""

import os
import sys
import uuid

# --- Path setup ---
CHATBOT_DIR = os.path.dirname(os.path.abspath(__file__))   # backend/chatbot/
BACKEND_DIR = os.path.dirname(CHATBOT_DIR)                  # backend/
PROJECT_DIR = os.path.dirname(BACKEND_DIR)                  # project root
sys.path.append(BACKEND_DIR)

# --- Load .env from project root ---
from dotenv import load_dotenv
load_dotenv(os.path.join(PROJECT_DIR, ".env"))

from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from sqlalchemy.orm import Session

from config import GROQ_MODEL
import models

# --- Constants ---
EMBEDDING_MODEL  = "sentence-transformers/all-MiniLM-L6-v2"
INDEX_PATH       = os.path.join(BACKEND_DIR, "vector_store", "product_faiss_index")
HISTORY_WINDOW   = 10    # last N messages to include (5 exchanges)
TOP_K_CHUNKS     = 3     # number of RAG doc chunks to retrieve

SYSTEM_PROMPT = (
    "You are a helpful Product Assistant for InternMatch AI — an AI-powered internship matching platform. "
    "Answer questions ONLY using the provided product documentation context and conversation history. "
    "If the answer is not in the context, say you do not have that information. "
    "Be concise, friendly, and accurate."
)


class ProductChatbot:
    def __init__(self):
        # Load embedding model (same one used for internship matching)
        print("[ChatEngine] Loading embedding model...")
        self.embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)

        # Load product FAISS index
        print(f"[ChatEngine] Loading FAISS index from: {INDEX_PATH}")
        if not os.path.exists(INDEX_PATH):
            raise FileNotFoundError(
                f"Product FAISS index not found at {INDEX_PATH}. "
                "Run backend/chatbot/doc_indexer.py first."
            )
        self.vectorstore = FAISS.load_local(
            INDEX_PATH,
            self.embeddings,
            allow_dangerous_deserialization=True,
        )

        # Groq LLM — ultra-fast for real-time chat
        print(f"[ChatEngine] Initialising Groq LLM: {GROQ_MODEL}")
        self.llm = ChatGroq(
            model=GROQ_MODEL,
            temperature=0.3,
            max_tokens=1024,
        )
        print("[ChatEngine] Ready.")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def chat(self, user_id: int, session_id: str, query: str, db: Session) -> dict:
        """
        Full §6 memory flow:
        1. Retrieve conversation history (user_id + session_id)
        2. Retrieve relevant product doc chunks via RAG
        3. Build combined prompt
        4. Call Groq LLM
        5. Store both user query and assistant response in DB
        6. Return response + source chunks
        """
        # Step 1 — retrieve history
        history = self._get_history(user_id, session_id, db)

        # Step 2 — retrieve RAG context
        rag_docs = self.vectorstore.similarity_search(query, k=TOP_K_CHUNKS)
        context  = "\n\n---\n\n".join(doc.page_content for doc in rag_docs)
        source_chunks = [
            {"content": doc.page_content, "source": doc.metadata.get("source", "product_knowledge.md")}
            for doc in rag_docs
        ]

        # Step 3 — build prompt & call LLM
        prompt    = self._build_prompt(history, context, query)
        chain     = prompt | self.llm | StrOutputParser()
        response  = chain.invoke({}).strip()

        # Step 4 — store user message
        db.add(models.ChatMessage(
            user_id       = user_id,
            session_id    = session_id,
            role          = "user",
            content       = query,
            source_chunks = None,
        ))

        # Step 5 — store assistant response
        db.add(models.ChatMessage(
            user_id       = user_id,
            session_id    = session_id,
            role          = "assistant",
            content       = response,
            source_chunks = source_chunks,
        ))
        db.commit()

        return {
            "response":      response,
            "session_id":    session_id,
            "source_chunks": source_chunks,
        }

    def get_history_for_api(self, user_id: int, session_id: str, db: Session) -> list:
        """Return full conversation history as a list of dicts (for the API)."""
        messages = (
            db.query(models.ChatMessage)
            .filter(
                models.ChatMessage.user_id   == user_id,
                models.ChatMessage.session_id == session_id,
            )
            .order_by(models.ChatMessage.created_at.asc())
            .all()
        )
        return [
            {
                "id":           m.id,
                "role":         m.role,
                "content":      m.content,
                "created_at":   m.created_at.isoformat() if m.created_at else None,
                "source_chunks": m.source_chunks,
                "feedback":     m.feedback,
            }
            for m in messages
        ]

    def get_sessions_for_api(self, user_id: int, db: Session) -> list:
        """Return all sessions for a user, ordered newest first."""
        rows = (
            db.query(
                models.ChatMessage.session_id,
                models.ChatMessage.created_at,
            )
            .filter(models.ChatMessage.user_id == user_id)
            .order_by(models.ChatMessage.created_at.desc())
            .all()
        )
        # Deduplicate — keep first occurrence (newest) of each session_id
        seen    = set()
        sessions = []
        for row in rows:
            if row.session_id not in seen:
                seen.add(row.session_id)
                sessions.append({
                    "session_id": row.session_id,
                    "created_at": row.created_at.isoformat() if row.created_at else None,
                })
        return sessions

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _get_history(self, user_id: int, session_id: str, db: Session) -> list:
        """Retrieve last HISTORY_WINDOW messages for this user + session."""
        messages = (
            db.query(models.ChatMessage)
            .filter(
                models.ChatMessage.user_id   == user_id,
                models.ChatMessage.session_id == session_id,
            )
            .order_by(models.ChatMessage.created_at.desc())
            .limit(HISTORY_WINDOW)
            .all()
        )
        # Reverse so oldest is first (correct chronological order for the prompt)
        return list(reversed(messages))

    def _build_prompt(self, history: list, context: str, query: str) -> ChatPromptTemplate:
        """
        Build the full prompt:
          [system] + [conversation history] + [RAG context] + [current query]
        """
        messages = [("system", SYSTEM_PROMPT)]

        # Inject conversation history as alternating human/ai turns
        for msg in history:
            role = "human" if msg.role == "user" else "ai"
            messages.append((role, msg.content))

        # RAG context + current query as the final human turn
        messages.append((
            "human",
            f"Product Documentation Context:\n{context}\n\nQuestion: {query}"
        ))

        return ChatPromptTemplate.from_messages(messages)
