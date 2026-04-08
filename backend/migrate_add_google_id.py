"""
One-time migration: add google_id column to the users table.
Run from the backend/ directory:
    python migrate_add_google_id.py
Safe to run multiple times — skips if column already exists.
"""
import sqlite3
import os

DB_PATH = os.getenv("DATABASE_URL", "sqlite:///./paysplit.db").replace("sqlite:///", "")

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check if column already exists
    cursor.execute("PRAGMA table_info(users)")
    columns = [row[1] for row in cursor.fetchall()]

    if "google_id" in columns:
        print("✓ google_id column already exists — nothing to do.")
    else:
        cursor.execute("ALTER TABLE users ADD COLUMN google_id TEXT")
        cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_google_id ON users (google_id)")
        conn.commit()
        print("✓ Added google_id column and unique index to users table.")

    conn.close()

if __name__ == "__main__":
    migrate()
