from database import engine
from sqlalchemy import text

MIGRATIONS = [
    # Original migration — adds is_active to resumes
    "ALTER TABLE resumes ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;",
    "UPDATE resumes SET is_active = true WHERE id IN (SELECT MAX(id) FROM resumes GROUP BY user_id);",

    # User profile fields (full_name, phone, university)
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR;",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR;",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS university VARCHAR;",

    # Resume timestamp
    "ALTER TABLE resumes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();",
]

def migrate():
    with engine.connect() as conn:
        for sql in MIGRATIONS:
            try:
                conn.execute(text(sql))
                conn.commit()
                print(f"OK: {sql[:60]}...")
            except Exception as e:
                print(f"Skipped (may already exist): {e}")

if __name__ == "__main__":
    migrate()
