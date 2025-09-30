from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, Table
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

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
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Связи
    favorites = relationship("Beat", secondary=favorites_table, back_populates="favorited_by")
    cart_items = relationship("Beat", secondary=cart_table, back_populates="in_carts")
    purchases = relationship("Purchase", back_populates="user")

class Beat(Base):
    __tablename__ = "beats"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    artist = Column(String, default="Producer")
    genre = Column(String, nullable=False)
    key = Column(String)  # тональность
    bpm = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)
    description = Column(Text)
    demo_url = Column(String)
    full_audio_url = Column(String)  # полная версия после покупки
    project_files_url = Column(String)  # zip с проектом
    cover_url = Column(String)  # обложка бита
    is_available = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Связи
    favorited_by = relationship("User", secondary=favorites_table, back_populates="favorites")
    in_carts = relationship("User", secondary=cart_table, back_populates="cart_items")
    purchases = relationship("Purchase", back_populates="beat")

class Purchase(Base):
    __tablename__ = "purchases"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    beat_id = Column(Integer, ForeignKey('beats.id'), nullable=False)
    purchase_date = Column(DateTime, default=datetime.utcnow)
    price_paid = Column(Float, nullable=False)
    
    # Связи
    user = relationship("User", back_populates="purchases")
    beat = relationship("Beat", back_populates="purchases")
