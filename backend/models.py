"""
SQLAlchemy модели для базы данных BeatStore

Определяет структуру таблиц и связи между ними:
- User - пользователи системы
- Beat - музыкальные биты
- Purchase - история покупок
- favorites_table - связь многие-ко-многим для избранного
- cart_table - связь многие-ко-многим для корзины
"""

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, Table
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

# Базовый класс для всех моделей
Base = declarative_base()

# Таблица для связи многие-ко-многим (избранное)
favorites_table = Table(
    'favorites',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('beat_id', Integer, ForeignKey('beats.id'), primary_key=True)
)

# Таблица для связи многие-ко-многим (корзина)
cart_table = Table(
    'cart',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('beat_id', Integer, ForeignKey('beats.id'), primary_key=True)
)

class User(Base):
    """
    Модель пользователя системы
    Содержит информацию о пользователе и его связи с битами
    """
    __tablename__ = "users"
    
    # Основные поля
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)  # Хешированный пароль
    is_active = Column(Boolean, default=True)  # Активен ли пользователь
    is_admin = Column(Boolean, default=False)  # Является ли администратором
    created_at = Column(DateTime, default=datetime.utcnow)  # Дата регистрации
    
    # Связи с другими таблицами
    favorites = relationship("Beat", secondary=favorites_table, back_populates="favorited_by")
    cart_items = relationship("Beat", secondary=cart_table, back_populates="in_carts")
    purchases = relationship("Purchase", back_populates="user")

class Beat(Base):
    """
    Модель музыкального бита
    Содержит метаданные бита и ссылки на файлы
    """
    __tablename__ = "beats"
    
    # Основные поля
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)  # Название бита
    artist = Column(String, default="Producer")  # Исполнитель/продюсер
    genre = Column(String, nullable=False)  # Жанр музыки
    key = Column(String)  # Тональность (например, C, F#, Am)
    bpm = Column(Integer, nullable=False)  # Темп (удары в минуту)
    price = Column(Float, nullable=False)  # Цена в рублях
    description = Column(Text)  # Описание бита
    
    # Файлы
    demo_url = Column(String)  # URL демо-версии для прослушивания
    full_audio_url = Column(String)  # URL полной версии после покупки
    project_files_url = Column(String)  # URL ZIP архива с проектом
    cover_url = Column(String)  # URL обложки бита
    
    # Статус
    is_available = Column(Boolean, default=True)  # Доступен ли для покупки
    created_at = Column(DateTime, default=datetime.utcnow)  # Дата добавления
    
    # Связи с пользователями
    favorited_by = relationship("User", secondary=favorites_table, back_populates="favorites")
    in_carts = relationship("User", secondary=cart_table, back_populates="cart_items")
    purchases = relationship("Purchase", back_populates="beat")

class Purchase(Base):
    """
    Модель покупки бита
    Записывает историю всех покупок пользователей
    """
    __tablename__ = "purchases"
    
    # Основные поля
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)  # ID покупателя
    beat_id = Column(Integer, ForeignKey('beats.id'), nullable=False)  # ID купленного бита
    purchase_date = Column(DateTime, default=datetime.utcnow)  # Дата покупки
    price_paid = Column(Float, nullable=False)  # Сумма, уплаченная за бит
    
    # Связи с другими таблицами
    user = relationship("User", back_populates="purchases")
    beat = relationship("Beat", back_populates="purchases")
