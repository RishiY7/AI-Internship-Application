# Internship Matching RAG System

This project is a Retrieval-Augmented Generation (RAG) pipeline that takes a candidate's resume data and retrieves the most relevant internships from an Internship Vector Database based on semantic similarity. It uses FAISS for vector storage and Groq's LLaMA 3 model to provide qualitative matching rationale.

## Project Structure

- `data_prep/`: Contains the JSON datasets for internships (`internship_data.json`) and synthetic candidate profiles (`resumes.json`).
- `vector_store/`: Contains `indexer.py` which reads the internship data, creates embeddings using `sentence-transformers/all-MiniLM-L6-v2`, and saves the vector store.
- `matching_engine.py`: The core semantic matching and RAG prompt logic. Sets up the FAISS retriever and LCEL chain with Groq.
- `tests/`: Contains `run_tests.py` which runs 10 test profiles through the RAG matching engine.
- `requirements.txt`: Python dependencies.

## Setup Instructions

1. **Install Requirements:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Environment Variables:**
   Create a `.env` file in the root directory and add your Groq API Key:
   ```env
   GROQ_API_KEY=your_api_key_here
   ```

3. **Build the Vector Store:**
   ```bash
   cd vector_store
   python indexer.py
   cd ..
   ```

4. **Run Tests:**
   Execute the batch test matching 10 different candidates against the internship dataset:
   ```bash
   python tests/run_tests.py
   ```

## Design Choices
- **Embeddings:** Used HuggingFace's `all-MiniLM-L6-v2` because it's lightweight, fast, and sufficient for semantic text similarity.
- **Vector DB:** Used FAISS CPU as it's locally executable and avoids complicated containerized setups for this milestone.
- **LLM/RAG:** Used LangChain and Groq's Llama 3 70B for the final evaluation step, allowing for strong reasoning about *why* the candidate is a match based strictly on retrieved context.
