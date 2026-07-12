import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

# This app uses PostgreSQL only. DATABASE_URL must be set (see .env).
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. This app requires PostgreSQL, e.g. "
        "postgresql+psycopg://user:pass@host:5432/dbname"
    )

# Normalize the scheme so SQLAlchemy uses the psycopg (v3) driver. Managed hosts
# (Fly, Heroku, Render…) hand out `postgres://…`, which SQLAlchemy 2.x rejects,
# and a bare `postgresql://…` would pick the psycopg2 driver we don't install.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = "postgresql+psycopg://" + DATABASE_URL[len("postgres://"):]
elif DATABASE_URL.startswith("postgresql://") and "+" not in DATABASE_URL.split("://", 1)[0]:
    DATABASE_URL = "postgresql+psycopg://" + DATABASE_URL[len("postgresql://"):]

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    from backend import models  # noqa
    Base.metadata.create_all(bind=engine)
