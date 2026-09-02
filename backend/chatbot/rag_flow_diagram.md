# InternMatch AI — RAG Pipeline Flow Diagram

## §3 RAG Implementation — Full Flow

---

## Part A: Index Building (doc_indexer.py — run once)

```
product_knowledge.md   (20,670 bytes — full product documentation)
         │
         ▼
 [Step 1+2] TextLoader (LangChain)
 Load and read raw text from the .md file
         │
         ▼
 Raw text: 20,613 characters
         │
         ▼
 [Step 3] RecursiveCharacterTextSplitter
 chunk_size=500, chunk_overlap=50
 separators: [\n## , \n### , \n#### , \n\n, \n, space, ""]
         │
         ▼
 65 Text Chunks
 (each chunk: ~500 chars of product documentation)
         │
         ▼
 [Step 4] HuggingFaceEmbeddings
 model: sentence-transformers/all-MiniLM-L6-v2
 dimension: 384
 runs locally, no API cost
         │
         ▼
 65 x 384-dimensional Vector Embeddings
         │
         ▼
 [Step 5] FAISS.from_documents() → FAISS.save_local()
 saved to: backend/vector_store/product_faiss_index/
             ├── index.faiss   (99,885 bytes)
             └── index.pkl     (27,646 bytes)
```

---

## Part B: Query-Time Retrieval (chat_engine.py — every request)

```
User types: "How does internship matching work?"
         │
         ▼
 [Step 6] Receive query in ProductChatbot.chat()
         │
         ▼
 [Step 7] Embed query using same HuggingFaceEmbeddings model
 → 384-dimensional query vector
         │
         ▼
 [Step 8] FAISS.similarity_search(query, k=3)
 L2 distance search across all 65 chunk embeddings
         │
         ▼
 Top 3 Most Relevant Chunks
 (e.g. chunks about "AI Internship Matching" feature)
```

---

## Part C: Memory + Prompt Assembly (chat_engine.py)

```
 PostgreSQL Query:
 SELECT * FROM chat_messages
 WHERE user_id=X AND session_id=Y
 ORDER BY created_at DESC LIMIT 10
         │
         ▼
 Last 10 messages (reversed to chronological order)

 Top 3 RAG chunks (from FAISS search above)
         │
         ▼
 Combined Prompt (ChatPromptTemplate):
 ┌────────────────────────────────────────────────────┐
 │ [SYSTEM]                                           │
 │ You are a helpful Product Assistant for            │
 │ InternMatch AI. Answer ONLY using the provided    │
 │ documentation context and conversation history.   │
 │                                                    │
 │ [HUMAN] <turn 1 from history>                      │
 │ [AI]    <turn 2 from history>                      │
 │ ... (up to 10 messages)                            │
 │                                                    │
 │ [HUMAN]                                            │
 │ Product Documentation Context:                     │
 │ <chunk 1 text>                                     │
 │ ---                                                │
 │ <chunk 2 text>                                     │
 │ ---                                                │
 │ <chunk 3 text>                                     │
 │                                                    │
 │ Question: How does internship matching work?       │
 └────────────────────────────────────────────────────┘
         │
         ▼
 [Step 9] Groq LLM (groq/compound-mini)
 temperature=0.3, max_tokens=1024
 LangChain LCEL: prompt | ChatGroq | StrOutputParser
         │
         ▼
 Response: "InternMatch AI uses FAISS vector similarity..."
         │
         ▼
 Store both messages in PostgreSQL:
 INSERT INTO chat_messages (user_id, session_id, role, content, source_chunks)
 VALUES (X, Y, 'user', <query>, NULL)
 VALUES (X, Y, 'assistant', <response>, <source_chunks_json>)
         │
         ▼
 Return to frontend:
 {
   "response": "InternMatch AI uses FAISS...",
   "session_id": "uuid-...",
   "source_chunks": [
     {"content": "chunk text", "source": "product_knowledge.md"},
     ...
   ]
 }
```

---

## §3 Step-by-Step Assignment Checklist

| Step | Description | Implemented In | Status |
|------|-------------|---------------|--------|
| 1 | Load product documentation | `TextLoader(product_knowledge.md)` | ✅ |
| 2 | Extract text from document | Handled by TextLoader | ✅ |
| 3 | Chunk the document | `RecursiveCharacterTextSplitter(500, 50)` → 65 chunks | ✅ |
| 4 | Generate embeddings for chunks | `HuggingFaceEmbeddings(all-MiniLM-L6-v2)` | ✅ |
| 5 | Store embeddings in vector DB | `FAISS.save_local(product_faiss_index/)` | ✅ |
| 6 | Receive user query | `POST /api/chat` → `chat_engine.chat()` | ✅ |
| 7 | Convert query to embedding | `FAISS.similarity_search()` auto-embeds query | ✅ |
| 8 | Retrieve top-k relevant chunks | `k=3`, L2 distance search | ✅ |
| 9 | Generate response with LLM | `ChatGroq → StrOutputParser` | ✅ |
