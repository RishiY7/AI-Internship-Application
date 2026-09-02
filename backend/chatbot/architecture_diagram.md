# InternMatch AI — System Architecture Diagram

## §8 System Architecture

This diagram matches the exact architecture specified in the assignment §8.

```
                 ┌──────────────┐
                 │     User     │
                 └──────┬───────┘
                        │
                        ▼
                 ┌──────────────┐
                 │   Frontend   │
                 │  (Next.js)   │
                 └──────┬───────┘
                        │
                        ▼
                 ┌──────────────┐
                 │   Backend    │
                 │  (FastAPI)   │
                 └──────┬───────┘
                        │
          ┌─────────────┴─────────────┐
          ▼                           ▼
 ┌─────────────────┐         ┌──────────────────┐
 │ Conversation DB │         │   RAG Pipeline   │
 │  (PostgreSQL)   │         │                  │
 │                 │         │ Product Document │
 │ User ID         │         │       ↓          │
 │ Session ID      │         │    Chunking      │
 │ Conversation    │         │       ↓          │
 └────────┬────────┘         │   Embeddings     │
          │                  │       ↓          │
          ▼                  │ Vector Database  │
 ┌─────────────────┐         └────────┬─────────┘
 │ Conversation    │                  │
 │ Memory          │                  │
 └────────┬────────┘                  │
          └──────────────┬────────────┘
                         ▼
                  ┌──────────────┐
                  │     LLM      │
                  │    (Groq)    │
                  └──────┬───────┘
                         ▼
                  ┌──────────────┐
                  │   Response   │
                  └──────────────┘
```

---

## Component → Implementation Mapping

| Architecture Box | Technology | File / Class |
|-----------------|-----------|--------------|
| User | Browser | http://localhost:3000 |
| Frontend | Next.js (React + TypeScript) | `frontend/src/app/dashboard/page.tsx` — chat tab |
| Backend | FastAPI (Python) | `backend/main.py` — `/api/chat` endpoint |
| Conversation DB | PostgreSQL | `chat_messages` table (via SQLAlchemy) |
| RAG Pipeline | LangChain + FAISS + HuggingFace | `backend/chatbot/doc_indexer.py` |
| Conversation Memory | PostgreSQL query | `backend/chatbot/chat_engine.py` — `_get_history()` |
| LLM | Groq `groq/compound-mini` | `backend/chatbot/chat_engine.py` — `ChatGroq` |
| Response | JSON | `{response, session_id, source_chunks}` |

---

## Full Request/Response Flow for the Chatbot

```
Browser (user types question)
    │
    │  HTTP POST /api/chat
    │  Body: {user_id, session_id, message}
    ▼
FastAPI Backend (main.py)
    │
    │  get_chatbot().chat(user_id, session_id, message, db)
    ▼
chat_engine.py — ProductChatbot.chat()
    │
    ├── Step 1: _get_history(user_id, session_id, db)
    │   └── SELECT last 10 rows FROM chat_messages
    │       WHERE user_id=X AND session_id=Y
    │       ORDER BY created_at DESC LIMIT 10
    │
    ├── Step 2: vectorstore.similarity_search(query, k=3)
    │   └── Embed query → L2 search in product_faiss_index
    │       → returns top 3 document chunks
    │
    ├── Step 3: _build_prompt(history, context, query)
    │   └── ChatPromptTemplate:
    │       [system] You are the Product Assistant...
    │       [human] <history turn 1>
    │       [ai]    <history turn 2>
    │       ...
    │       [human] Context: <RAG chunks>\nQuestion: <query>
    │
    ├── Step 4: chain = prompt | llm | StrOutputParser()
    │   └── Groq API call → response text
    │
    ├── Step 5: db.add(ChatMessage user_id, session_id, "user", query))
    ├── Step 6: db.add(ChatMessage user_id, session_id, "assistant", response))
    └── Step 7: return {response, session_id, source_chunks}
    │
    ▼
FastAPI returns JSON response
    │
    ▼
Frontend: appends bubbles to message thread
         stores session_id for next turn
```
