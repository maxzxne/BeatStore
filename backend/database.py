"""
Конфигурация базы данных для BeatStore

Настройка подключения к SQLite базе данных через SQLAlchemy:
- Создание движка базы данных
- Настройка сессий для работы с БД
- Поддержка переменных окружения для конфигурации
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# URL базы данных из переменной окружения или дефолтный путь
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/beatstore.db")

# Создание движка базы данных
# check_same_thread=False позволяет использовать SQLite в многопоточной среде
engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False}, 
    echo=False  # Отключено логирование SQL запросов
)

# Создание фабрики сессий для работы с базой данных
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
