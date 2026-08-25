from database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        try:
            # Check if column exists, if not add it
            conn.execute(text("ALTER TABLE resumes ADD COLUMN is_active BOOLEAN DEFAULT false;"))
            conn.execute(text("UPDATE resumes SET is_active = true WHERE id IN (SELECT MAX(id) FROM resumes GROUP BY user_id);"))
            conn.commit()
            print("Migration successful: Added is_active to resumes.")
        except Exception as e:
            print(f"Migration error (column might already exist): {e}")

if __name__ == "__main__":
    migrate()
