# InternMatch AI — Database Schema

## Tables Overview

The database has 3 tables. `users` is the root entity. `resumes` and `chat_messages` both reference `users.id`.

---

## Entity-Relationship Diagram

```
┌─────────────────────────────┐
│           users             │
│─────────────────────────────│
│ id           INTEGER  (PK)  │
│ email        STRING  UNIQUE │
│ hashed_password  STRING     │
│ full_name    STRING         │
│ phone        STRING         │
│ university   STRING         │
└──────────────┬──────────────┘
               │ 1
               │
        ┌──────┴──────┐
        │ N           │ N
┌───────┴──────────┐  ┌┴────────────────────────┐
│    resumes       │  │     chat_messages        │
│──────────────────│  │──────────────────────────│
│ id      INT (PK) │  │ id          INT (PK)     │
│ user_id INT (FK) │  │ user_id     INT (FK)     │
│ filename STRING  │  │ session_id  STRING (idx) │
│ raw_text TEXT    │  │ role        STRING       │
│ structured_data  │  │ content     TEXT         │
│          TEXT    │  │ created_at  DATETIME     │
│ match_result     │  │ source_chunks  JSON      │
│          TEXT    │  │ feedback    STRING       │
│ is_active BOOL   │  └──────────────────────────┘
│ created_at DTIME │
└──────────────────┘
```

---

## Table: users

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, auto-increment | Unique user identifier |
| `email` | STRING | UNIQUE, indexed | User email address used for login |
| `hashed_password` | STRING | NOT NULL | Bcrypt-hashed password |
| `full_name` | STRING | nullable | Display name shown in dashboard |
| `phone` | STRING | nullable | Contact number |
| `university` | STRING | nullable | Institution name |

---

## Table: resumes

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, auto-increment | Unique resume identifier |
| `user_id` | INTEGER | FOREIGN KEY → users.id | Owner of this resume |
| `filename` | STRING | NOT NULL | Original uploaded filename |
| `raw_text` | TEXT | NOT NULL | Full text extracted from PDF by PyMuPDF |
| `structured_data` | TEXT (JSON) | NOT NULL | AI-parsed fields: name, skills[], education, experience, projects |
| `match_result` | TEXT (JSON) | nullable | Cached FAISS + LLM matching results |
| `is_active` | BOOLEAN | default=False | Whether this is the currently active resume for matching |
| `created_at` | DATETIME | default=utcnow | Upload timestamp |

---

## Table: chat_messages

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, auto-increment | Unique message identifier |
| `user_id` | INTEGER | FOREIGN KEY → users.id, NOT NULL | Which user sent/received this message |
| `session_id` | STRING | indexed, NOT NULL | UUID identifying the chat session (one per conversation) |
| `role` | STRING | NOT NULL | `"user"` (human message) or `"assistant"` (LLM response) |
| `content` | TEXT | NOT NULL | Full message text |
| `created_at` | DATETIME | default=utcnow | Message timestamp |
| `source_chunks` | JSON | nullable | The RAG document chunks used to generate this response (assistant only) |
| `feedback` | STRING | nullable | User rating: `"like"`, `"dislike"`, or null |

---

## Session Isolation (§7)

All conversation history retrieval is scoped by BOTH `user_id` AND `session_id`:

```sql
-- What chat_engine._get_history() runs:
SELECT * FROM chat_messages
WHERE user_id = :user_id
  AND session_id = :session_id
ORDER BY created_at DESC
LIMIT 10;
```

This means:
- **User A, Session 1** cannot see messages from **User A, Session 2**
- **User A** cannot see messages from **User B** even if session UUIDs happened to match
- Each "New Chat" generates a fresh UUID → completely independent conversation
- A user can have unlimited sessions, each fully independent

---

## Auto-Migration

The `chat_messages` table is created automatically via SQLAlchemy on server startup:

```python
# backend/main.py line 28
Base.metadata.create_all(bind=engine)
```

This calls `CREATE TABLE IF NOT EXISTS chat_messages (...)` — safe to run on an existing database with no existing chatbot tables.

---

## source_chunks JSON Structure

The `source_chunks` column stores a JSON array of the RAG chunks used to generate each assistant response:

```json
[
  {
    "content": "InternMatch AI uses FAISS vector similarity search...",
    "source": "product_knowledge.md"
  },
  {
    "content": "The AI Internship Matching feature converts resume data...",
    "source": "product_knowledge.md"
  },
  {
    "content": "sentence-transformers/all-MiniLM-L6-v2 produces 384-dim vectors...",
    "source": "product_knowledge.md"
  }
]
```
