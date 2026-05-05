#!/usr/bin/env python
import os
import sys
from alembic.config import Config
from alembic import command

def run_migration():
    try:
        DATABASE_URL = os.environ.get("DATABASE_URL", "")

        if not DATABASE_URL:
            print("ERROR: DATABASE_URL environment variable is not set.")
            return 1

        versions_dir = os.path.dirname(os.path.abspath(__file__))
        alembic_dir = os.path.dirname(versions_dir)
        backend_dir = os.path.dirname(alembic_dir)
        os.chdir(backend_dir)

        print("Running PaySplit Multi-Person Splits Migration...")
        print("-" * 60)
        print("Database: Render PostgreSQL")
        print("-" * 60)

        config = Config("alembic.ini")
        config.set_main_option("sqlalchemy.url", DATABASE_URL)

        print("Creating database tables...")
        command.upgrade(config, "head")

        print("-" * 60)
        print("Migration completed successfully!")
        print()
        print("Tables created:")
        print("  - split_participants")
        print("  - split_invitations")
        print()
        print("Your multi-person splits feature is ready!")
        return 0

    except Exception as e:
        print("-" * 60)
        print("Migration failed: " + str(e))
        print()
        print("Troubleshooting:")
        print("  1. Make sure DATABASE_URL is set in Render environment variables")
        print("  2. Check Render PostgreSQL service is running")
        print("  3. Verify alembic.ini exists in backend/")
        print("  4. Check migration file exists in backend/alembic/versions/")
        return 1

if __name__ == "__main__":
    sys.exit(run_migration())