import os
import json
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document

def build_vector_store():
    # 1. Load data
    data_path = os.path.join("..", "data_prep", "internship_data.json")
    with open(data_path, "r") as f:
        internships_data = json.load(f)

    # 2. Initialize the embedding model
    print("Initializing embedding model...")
    embedding_model = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

    # 3. Convert data to LangChain Documents
    docs = []
    for item in internships_data:
        # Combine title, description, and skills into one string for embedding
        page_content = f"Title: {item['title']}\nSkills Required: {item['skills']}\nDescription: {item['description']}\nEducation: {item['education']}\nExperience: {item['experience']}\nLocation: {item['location']}"
        
        # Store structured data as metadata
        metadata = {
            "title": item["title"],
            "company": item["company"],
            "skills": item["skills"],
            "location": item["location"],
            "duration": item["duration"]
        }
        
        docs.append(Document(page_content=page_content, metadata=metadata))

    # 4. Build and save the FAISS Vector Store
    print("Building FAISS index...")
    vectorstore = FAISS.from_documents(docs, embedding_model)
    
    save_path = "internships_faiss_index"
    vectorstore.save_local(save_path)
    print(f"Vector database built and saved to {save_path}!")

if __name__ == "__main__":
    build_vector_store()
