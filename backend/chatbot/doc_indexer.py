"""
doc_indexer.py
Phase 2.1 — Loads product_knowledge.pdf, chunks it, generates embeddings,
and saves a FAISS index to backend/vector_store/product_faiss_index/.

Run once (or whenever product_knowledge.pdf is updated):
    python backend/chatbot/doc_indexer.py
"""

import os
import sys

# --- Path setup: allow imports from backend/ (config.py, etc.) ---
CHATBOT_DIR = os.path.dirname(os.path.abspath(__file__))   # backend/chatbot/
BACKEND_DIR = os.path.dirname(CHATBOT_DIR)                  # backend/
PROJECT_DIR = os.path.dirname(BACKEND_DIR)                  # project root (.env lives here)
sys.path.append(BACKEND_DIR)

# --- Load .env from project root ---
from dotenv import load_dotenv
load_dotenv(os.path.join(PROJECT_DIR, ".env"))

from langchain_community.document_loaders import PyMuPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

# --- Paths ---
DOC_PATH   = os.path.join(CHATBOT_DIR, "product_knowledge.pdf")
INDEX_PATH = os.path.join(BACKEND_DIR, "vector_store", "product_faiss_index")

EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
CHUNK_SIZE      = 500
CHUNK_OVERLAP   = 50


def build_index():
    print("=" * 60)
    print("InternMatch AI — Product Knowledge Indexer (PDF Edition)")
    print("=" * 60)

    # Step 1: Load the document
    print(f"\n[1/5] Loading document: {DOC_PATH}")
    if not os.path.exists(DOC_PATH):
        raise FileNotFoundError(f"product_knowledge.pdf not found at: {DOC_PATH}")
    loader = PyMuPDFLoader(DOC_PATH)
    docs = loader.load()
    print(f"      Loaded {len(docs)} document(s), total chars: {sum(len(d.page_content) for d in docs)}")

    # Step 2: Split into chunks
    print(f"\n[2/5] Splitting into chunks (size={CHUNK_SIZE}, overlap={CHUNK_OVERLAP})")
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n## ", "\n### ", "\n#### ", "\n\n", "\n", " ", ""],
    )
    chunks = splitter.split_documents(docs)
    print(f"      Created {len(chunks)} chunks")

    # Step 3: Load embedding model
    print(f"\n[3/5] Loading embedding model: {EMBEDDING_MODEL}")
    embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
    print("      Model loaded")

    # Step 4: Build FAISS index
    print(f"\n[4/5] Building FAISS index from {len(chunks)} chunks...")
    vectorstore = FAISS.from_documents(chunks, embeddings)
    print("      Index built")

    # Step 5: Save to disk
    print(f"\n[5/5] Saving index to: {INDEX_PATH}")
    os.makedirs(INDEX_PATH, exist_ok=True)
    vectorstore.save_local(INDEX_PATH)
    print("      Saved successfully")

    print("\n" + "=" * 60)
    print(f"Done! Product FAISS index is ready at:")
    print(f"  {INDEX_PATH}")
    print("=" * 60)
    return vectorstore


if __name__ == "__main__":
    build_index()
