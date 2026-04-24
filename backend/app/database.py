"""
Database engine, session factory, and initialization (including seed data).
"""
import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# SQLite file lives next to the backend package by default
BASE_DIR = Path(__file__).resolve().parent
DATABASE_URL = f"sqlite:///{BASE_DIR / 'app.db'}"

# Needed for SQLite + FastAPI threading
connect_args = {"check_same_thread": False}
engine = create_engine(DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Single Base for all ORM models
Base = declarative_base()


def get_db():
  """Yields a DB session and ensures it is closed (FastAPI dependency)."""
  db = SessionLocal()
  try:
    yield db
  finally:
    db.close()


def init_db():
  """
  Create tables. Import models so they register with Base metadata before create_all.
  """
  from . import models  # noqa: F401  # registers ORM mappers

  Base.metadata.create_all(bind=engine)
