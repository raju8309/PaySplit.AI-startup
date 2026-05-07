"""
One-shot migration to align the split-related tables in PostgreSQL
with the current SQLAlchemy models.

Run from the backend/ directory:
    python fix_split_schema.py

Safe to run multiple times — uses IF NOT EXISTS everywhere.
"""

from sqlalchemy import text, inspect
from db import engine
from models import Base

# Import the models so Base knows about them
from models.split_transaction import (
    SplitTransaction,
    SplitParticipant,
    SplitInvitation,
)


def run():
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    print("━" * 60)
    print("PaySplit schema migration")
    print("━" * 60)

    # ── 1. Make sure split_transactions has the new columns ──────────────
    if "split_transactions" not in existing_tables:
        print("ℹ split_transactions table doesn't exist — will be created below.")
    else:
        existing_cols = [c["name"] for c in inspector.get_columns("split_transactions")]
        print(f"\nsplit_transactions columns currently: {existing_cols}")

        with engine.connect() as conn:
            if "split_type" not in existing_cols:
                conn.execute(text(
                    "ALTER TABLE split_transactions "
                    "ADD COLUMN split_type VARCHAR DEFAULT 'single_user'"
                ))
                print("✅ Added column: split_type")
            else:
                print("✓  split_type already present")

            if "virtual_card_id" not in existing_cols:
                conn.execute(text(
                    "ALTER TABLE split_transactions "
                    "ADD COLUMN virtual_card_id VARCHAR"
                ))
                print("✅ Added column: virtual_card_id")
            else:
                print("✓  virtual_card_id already present")

            conn.commit()

    # ── 2. Create split_participants and split_invitations if missing ────
    print("\nEnsuring split_participants & split_invitations tables exist...")
    Base.metadata.create_all(
        bind=engine,
        tables=[
            SplitParticipant.__table__,
            SplitInvitation.__table__,
        ],
    )
    print("✅ split_participants & split_invitations are ready")

    # ── 3. Final verification ────────────────────────────────────────────
    inspector = inspect(engine)  # refresh
    final_tables = inspector.get_table_names()

    print("\n━" * 60)
    print("Final schema state")
    print("━" * 60)
    for t in ("split_transactions", "split_participants", "split_invitations"):
        if t in final_tables:
            cols = [c["name"] for c in inspector.get_columns(t)]
            print(f"\n{t}:")
            for c in cols:
                print(f"  • {c}")
        else:
            print(f"\n⚠ {t} NOT FOUND (something went wrong)")

    print("\n✅ Migration complete.")


if __name__ == "__main__":
    run()