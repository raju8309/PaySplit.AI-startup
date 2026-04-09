#!/usr/bin/env python
import os
import sys
from alembic.config import Config
from alembic import command

def run_migration():
    try:
        DATABASE_URL = "postgresql://paysplit:PaySplit2026!@paysplit-db.cfwivs6oagt0.us-east-2.rds.amazonaws.com:5432/paysplit"
        
        versions_dir = os.path.dirname(os.path.abspath(__file__))
        alembic_dir = os.path.dirname(versions_dir)
        backend_dir = os.path.dirname(alembic_dir)
        os.chdir(backend_dir)
        
        print("Running PaySplit Multi-Person Splits Migration...")
        print("-" * 60)
        print("Database: AWS RDS PostgreSQL")
        print("Connection: paysplit-db.cfwivs6oagt0.us-east-2.rds.amazonaws.com")
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
        print("Connected to: paysplit-db.cfwivs6oagt0.us-east-2.rds.amazonaws.com")
        return 0
        
    except Exception as e:
        print("-" * 60)
        print("Migration failed: " + str(e))
        print()
        print("Troubleshooting:")
        print("  1. Make sure AWS RDS is running")
        print("  2. Check security group allows port 5432")
        print("  3. Verify connection string is correct")
        print("  4. Check alembic.ini exists in backend/")
        print("  5. Check migration file exists in backend/alembic/versions/")
        return 1

if __name__ == "__main__":
    sys.exit(run_migration())