import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Используем переменную окружения или дефолтный путь
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/beatstore.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False}, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
