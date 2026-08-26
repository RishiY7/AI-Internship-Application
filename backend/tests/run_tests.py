import os
import sys
import json

# Add parent directory to path to import matching_engine
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from matching_engine import InternshipMatcher

# Expected top match for each candidate (name → expected company-title substring)
# These validate semantic correctness of the RAG retrieval.
EXPECTED_TOP_MATCH = {
    "Alice Sharma":  ("TechCorp",        "Backend Python Intern"),
    "Bob Verma":     ("DataWorks",       "Data Science Intern"),
    "Charlie Gupta": ("AI Innovators",   "AI/ML Intern"),
    "Diana Patel":   ("FutureTech",      "Generative AI Intern"),
    "Evan Thomas":   ("WebMakers",       "Frontend React Intern"),
    "Fiona Desai":   ("StartUp Inc.",    "Full Stack Developer Intern"),
    "Gaurav Singh":  ("CloudOps Solutions", "DevOps Intern"),
    "Hina Khan":     ("BigData Corp",    "Data Engineering Intern"),
    "Ishaan Reddy":  ("SecureNet",       "Cybersecurity Intern"),
    "Jaya Kumar":    ("Appify",          "Mobile App Dev Intern"),
}

def run_tests():
    resumes_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data_prep", "resumes.json")
    with open(resumes_path, "r") as f:
        candidates = json.load(f)

    print(f"Loaded {len(candidates)} candidates for testing.")

    matcher = InternshipMatcher(vectorstore_path=os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "vector_store", "internships_faiss_index"
    ))

    if not matcher.vectorstore:
        print("FAIL: Vector store not loaded. Run vector_store/indexer.py first.")
        sys.exit(1)

    print("\n" + "="*60)
    print("STARTING BATCH MATCHING TEST")
    print("="*60 + "\n")

    passed = 0
    failed = 0

    for i, candidate in enumerate(candidates):
        name = candidate["name"]
        print(f"--- Test Case {i+1}: {name} ---")
        print(f"Skills: {', '.join(candidate['skills'])}")

        # --- Raw Retrieval ---
        raw_matches = matcher.get_raw_retrieval(candidate, k=3)

        # Assert 1: We always get results back
        assert len(raw_matches) > 0, f"FAIL [{name}]: No matches returned from FAISS."

        print(f"\nTop {len(raw_matches)} Retrievals:")
        for rank, m in enumerate(raw_matches):
            print(f"  {rank+1}. {m['company']} – {m['title']} "
                  f"(L2: {m['l2_distance']:.4f}, Relevance: {m['relevance_score']}%)")

        # Assert 2: Top match relevance score is within a plausible range
        top = raw_matches[0]
        assert 0.0 <= top["relevance_score"] <= 100.0, (
            f"FAIL [{name}]: Relevance score {top['relevance_score']} out of range."
        )

        # Assert 3: Domain-correct top match
        if name in EXPECTED_TOP_MATCH:
            exp_company, exp_title = EXPECTED_TOP_MATCH[name]
            assert top["company"] == exp_company and top["title"] == exp_title, (
                f"FAIL [{name}]: Expected top match '{exp_title} @ {exp_company}', "
                f"got '{top['title']} @ {top['company']}'."
            )
            print(f"  ✓ Top match assertion passed: {exp_title} @ {exp_company}")

        # --- LLM RAG Evaluation ---
        print("\nLLM RAG Evaluation:")
        try:
            evaluation = matcher.match_candidate(candidate)

            # Assert 4: LLM returns a non-empty rationale
            assert evaluation and len(evaluation.strip()) > 20, (
                f"FAIL [{name}]: LLM returned an empty or trivially short rationale."
            )
            print(evaluation)
            passed += 1
        except AssertionError:
            raise
        except Exception as e:
            print(f"ERROR during LLM evaluation: {e}")
            failed += 1

        print("\n" + "-"*60 + "\n")

    print("="*60)
    print(f"TEST SUMMARY: {passed} passed, {failed} failed out of {len(candidates)} candidates.")
    print("="*60)

    if failed > 0:
        sys.exit(1)

if __name__ == "__main__":
    run_tests()
