import os
import sys
import json

# Add parent directory to path to import matching_engine
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from matching_engine import InternshipMatcher

def run_tests():
    # Load test candidates
    resumes_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data_prep", "resumes.json")
    with open(resumes_path, "r") as f:
        candidates = json.load(f)
        
    print(f"Loaded {len(candidates)} candidates for testing.")
    
    matcher = InternshipMatcher(vectorstore_path=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "vector_store", "internships_faiss_index"))
    
    if not matcher.vectorstore:
        print("Failed to initialize matcher. Make sure vector store is built first.")
        return

    print("\n" + "="*50)
    print("STARTING BATCH MATCHING TEST")
    print("="*50 + "\n")

    for i, candidate in enumerate(candidates):
        print(f"--- Test Case {i+1}: {candidate['name']} ---")
        print(f"Skills: {', '.join(candidate['skills'])}")
        
        # Raw Retrieval
        raw_matches = matcher.get_raw_retrieval(candidate, k=3)
        print("\nTop 3 Retrievals (FAISS L2 Distance - Lower is Better):")
        for rank, match in enumerate(raw_matches):
            print(f"  {rank+1}. {match['company']} - {match['title']} (Score: {match['l2_distance']:.4f})")
            
        print("\nLLM RAG Evaluation:")
        try:
            evaluation = matcher.match_candidate(candidate)
            print(evaluation)
        except Exception as e:
            print(f"Error during LLM evaluation: {e}")
            
        print("\n" + "-"*50 + "\n")

if __name__ == "__main__":
    run_tests()
