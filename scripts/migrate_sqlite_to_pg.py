"""One-off copy of relational data from SQLite -> PostgreSQL.

Copies all five tables (users, documents, queries, conversations,
chat_messages). The document *vectors* are NOT touched — they live in Pinecone
and are addressed by the same owner_id that we copy here, so the link is
preserved.

Run once, from the project root, AFTER `alembic upgrade head`:

    venv/Scripts/python.exe scripts/migrate_sqlite_to_pg.py
"""
import os
import sys

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# make `backend` importable when run from the project root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.models import User, Document, Query, Conversation, ChatMessage  # noqa: E402

load_dotenv()

SQLITE_URL = "sqlite:///./rag_dashboard.db"
PG_URL = os.environ["DATABASE_URL"]

if PG_URL.startswith("sqlite"):
    raise SystemExit("DATABASE_URL still points at SQLite — set it to Postgres first.")

src = sessionmaker(bind=create_engine(
    SQLITE_URL, connect_args={"check_same_thread": False}))()
dst = sessionmaker(bind=create_engine(PG_URL))()

# Parents before children so foreign keys resolve.
MODELS = [User, Document, Query, Conversation, ChatMessage]


def copy(model):
    cols = [c.name for c in model.__table__.columns]
    rows = src.query(model).all()
    for r in rows:
        dst.add(model(**{c: getattr(r, c) for c in cols}))
    dst.commit()
    print(f"  {model.__tablename__:15} {len(rows)} rows")


print("Copying tables SQLite -> Postgres:")
for m in MODELS:
    copy(m)

# We inserted explicit primary keys, so Postgres' id sequences are still at 1.
# Fast-forward each so the next INSERT doesn't collide on a duplicate id.
print("Resetting id sequences:")
for m in MODELS:
    t = m.__tablename__
    dst.execute(text(
        f"SELECT setval(pg_get_serial_sequence('{t}', 'id'), "
        f"COALESCE((SELECT MAX(id) FROM {t}), 1))"))
    dst.commit()
    print(f"  {t}")

src.close()
dst.close()
print("Done.")
