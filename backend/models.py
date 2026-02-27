"""
SQLAlchemy модели для базы данных BeatStore

Определяет структуру таблиц и связи между ними:
- User - пользователи системы
- Beat - музыкальные биты
- Course - курсы обучения
- Purchase - история покупок битов
- CoursePurchase - история покупок курсов
- ServiceOrder - заказы услуг
- favorites_table - связь многие-ко-многим для избранного битов
- cart_table - связь многие-ко-многим для корзины битов
- course_favorites_table - связь многие-ко-многим для избранного курсов
- course_cart_table - связь многие-ко-многим для корзины курсов
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

# Таблица для связи многие-ко-многим (избранное курсов)
course_favorites_table = Table(
    'course_favorites',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('course_id', Integer, ForeignKey('courses.id'), primary_key=True)
)

# Таблица для связи многие-ко-многим (корзина курсов)
course_cart_table = Table(
    'course_cart',
    Base.metadata,
    Column('user_id', Integer, ForeignKey('users.id'), primary_key=True),
    Column('course_id', Integer, ForeignKey('courses.id'), primary_key=True)
)

class User(Base):
    """
    Модель пользователя системы
    Содержит информацию о пользователе и его связи с битами
    """
    __tablename__ = "users"
    
    # Основные поля
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=True)  # Может быть None для OAuth
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=True)  # Может быть None для OAuth пользователей
    is_active = Column(Boolean, default=True)  # Активен ли пользователь
    is_admin = Column(Boolean, default=False)  # Является ли администратором
    created_at = Column(DateTime, default=datetime.utcnow)  # Дата регистрации
    
    # Согласие на обработку персональных данных
    consent_personal_data = Column(Boolean, default=True)  # Флаг согласия (по умолчанию True при регистрации через сайт)
    consent_personal_data_at = Column(DateTime, nullable=True)  # Время получения согласия
    consent_personal_data_version = Column(String, nullable=True)  # Версия документов (политика/соглашение)
    
    # OAuth поля
    oauth_provider = Column(String, nullable=True)  # google, vk, yandex
    oauth_provider_id = Column(String, nullable=True)  # ID пользователя в OAuth провайдере
    
    # Дополнительные поля
    additional_contact = Column(String, nullable=True)  # Дополнительная связь (Telegram и т.д.)
    
    # Связи с другими таблицами
    favorites = relationship("Beat", secondary=favorites_table, back_populates="favorited_by")
    cart_items = relationship("Beat", secondary=cart_table, back_populates="in_carts")
    purchases = relationship("Purchase", back_populates="user")
    course_favorites = relationship("Course", secondary=course_favorites_table, back_populates="favorited_by")
    course_cart_items = relationship("Course", secondary=course_cart_table, back_populates="in_carts")
    course_purchases = relationship("CoursePurchase", back_populates="user")
    service_orders = relationship("ServiceOrder", back_populates="user")

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
    price = Column(Float, nullable=False)  # Цена в рублях (базовая цена для обратной совместимости)
    price_mp3 = Column(Float, nullable=True)  # Цена для MP3 файла
    price_wav = Column(Float, nullable=True)  # Цена для WAV файла
    price_exclusive = Column(Float, nullable=True)  # Цена для эксклюзивного ZIP
    description = Column(Text)  # Описание бита
    
    # Файлы
    demo_url = Column(String)  # URL демо-версии для прослушивания
    full_audio_url = Column(String)  # URL полной версии после покупки (старое поле для обратной совместимости)
    project_files_url = Column(String)  # URL ZIP архива с проектом (старое поле)
    cover_url = Column(String)  # URL обложки бита
    
    # Новые файлы для трех вариантов покупки
    wav_url = Column(String)  # URL для WAV файла
    mp3_url = Column(String)  # URL для MP3 файла
    exclusive_url = Column(String)  # URL для эксклюзивного ZIP (FL-проект, дорожки и т.д.)
    
    # Статус
    is_available = Column(Boolean, default=True)  # Доступен ли для покупки
    allow_multiple_purchases = Column(Boolean, default=False)  # Разрешить множественные покупки (False = эксклюзивный, только один покупатель)
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
    purchase_type = Column(String, default="mp3")  # Тип покупки: 'wav', 'mp3', 'exclusive'
    
    # Связи с другими таблицами
    user = relationship("User", back_populates="purchases")
    beat = relationship("Beat", back_populates="purchases")

class Course(Base):
    """
    Модель курса обучения
    Содержит информацию о курсе с превью и полным видео
    """
    __tablename__ = "courses"
    
    # Основные поля
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)  # Название курса
    purpose = Column(String)  # Предназначение (сведение/битмэйкинг/саунддизайн/...)
    description = Column(Text)  # Описание курса
    tags = Column(String)  # Тэги через запятую (компрессия, эквализация, саунддизайн и тд)
    price = Column(Float, nullable=False)  # Цена в рублях
    
    # Видео файлы
    preview_video_url = Column(String)  # URL превью видео для просмотра на сайте
    full_video_url = Column(String)  # URL полного видео для скачивания после покупки
    
    # Статус
    is_available = Column(Boolean, default=True)  # Доступен ли для покупки
    created_at = Column(DateTime, default=datetime.utcnow)  # Дата добавления
    
    # Связи с пользователями
    favorited_by = relationship("User", secondary=course_favorites_table, back_populates="course_favorites")
    in_carts = relationship("User", secondary=course_cart_table, back_populates="course_cart_items")
    purchases = relationship("CoursePurchase", back_populates="course")

class CoursePurchase(Base):
    """
    Модель покупки курса
    Записывает историю всех покупок курсов пользователями
    """
    __tablename__ = "course_purchases"
    
    # Основные поля
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)  # ID покупателя
    course_id = Column(Integer, ForeignKey('courses.id'), nullable=False)  # ID купленного курса
    purchase_date = Column(DateTime, default=datetime.utcnow)  # Дата покупки
    price_paid = Column(Float, nullable=False)  # Сумма, уплаченная за курс
    
    # Связи с другими таблицами
    user = relationship("User", back_populates="course_purchases")
    course = relationship("Course", back_populates="purchases")

class ServiceOrder(Base):
    """
    Модель заказа услуги
    Содержит информацию о заказе услуги от пользователя
    """
    __tablename__ = "service_orders"
    
    # Основные поля
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)  # ID заказчика (может быть None для неавторизованных)
    
    # Контактная информация для неавторизованных пользователей
    customer_name = Column(String, nullable=True)  # Имя заказчика
    customer_email = Column(String, nullable=True)  # Email заказчика
    
    # Тип заказа
    order_type = Column(String, default="know")  # "know" или "dont_know"
    
    # Категории услуг (JSON строка с массивом категорий)
    service_category = Column(String, nullable=True)  # Старое поле для обратной совместимости
    service_categories = Column(Text, nullable=True)  # JSON массив выбранных категорий
    
    # Материалы
    materials_url = Column(String)  # URL загруженных материалов (может быть JSON массив)
    reference_links = Column(Text)  # Ссылки на референсы (через запятую или перенос строки)
    reference_files_url = Column(String)  # URL загруженных референсов (может быть JSON массив)
    
    # Дополнительная информация для обратной связи
    contact_info = Column(String, nullable=True)  # Telegram, WhatsApp, другой email и т.д.
    
    # Описание
    description = Column(Text)  # Описание (ТЗ)
    
    # Дедлайн
    deadline_min = Column(Integer)  # Минимальный дедлайн (в днях) - старое поле
    deadline_max = Column(Integer)  # Максимальный дедлайн (в днях) - старое поле
    deadline_days = Column(Integer, nullable=True)  # Количество дней дедлайна
    
    # Цена и оплата
    price = Column(Float, nullable=True)  # Стоимость услуги (устанавливается админом)
    prepayment_percent = Column(Integer, nullable=True)  # Процент предоплаты (50 или 100)
    
    # Статус заказа
    status = Column(String, default="pending")  # pending/confirmed/paid/in_progress/completed/cancelled
    
    # Файлы результата работы (для заказов типа "не знаю")
    result_wav_url = Column(String, nullable=True)  # WAV файл результата
    result_mp3_url = Column(String, nullable=True)  # MP3 файл результата
    result_zip_url = Column(String, nullable=True)  # ZIP архив результата
    
    created_at = Column(DateTime, default=datetime.utcnow)  # Дата создания заказа
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)  # Дата обновления
    
    # Согласие на обработку персональных данных при оформлении заказа
    consent_personal_data = Column(Boolean, default=True)  # Флаг согласия
    consent_personal_data_at = Column(DateTime, nullable=True)  # Время получения согласия
    consent_personal_data_version = Column(String, nullable=True)  # Версия документов (политика/соглашение)
    consent_ip = Column(String, nullable=True)  # IP-адрес клиента в момент согласия
    
    # Связи с другими таблицами
    user = relationship("User", back_populates="service_orders")

class OAuthSettings(Base):
    """
    Модель настроек OAuth провайдеров
    Управляет видимостью и доступностью кнопок авторизации
    """
    __tablename__ = "oauth_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String, unique=True, nullable=False)  # google, vk, yandex, telegram
    is_hidden = Column(Boolean, default=False)  # Скрыть кнопку с форм
    is_disabled = Column(Boolean, default=False)  # Дизейблить кнопку (но показывать)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ErrorLog(Base):
    """
    Модель логов ошибок
    Записывает ошибки авторизации, регистрации, покупок и оплаты
    """
    __tablename__ = "error_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    error_type = Column(String, nullable=False, index=True)  # auth, registration, purchase, payment
    error_message = Column(Text, nullable=False)  # Сообщение об ошибке
    error_details = Column(Text, nullable=True)  # Дополнительные детали (traceback, stack trace)
    endpoint = Column(String, nullable=True)  # API endpoint, где произошла ошибка
    user_id = Column(Integer, ForeignKey('users.id'), nullable=True)  # ID пользователя (если известен)
    ip_address = Column(String, nullable=True)  # IP адрес пользователя
    user_agent = Column(String, nullable=True)  # User-Agent браузера
    created_at = Column(DateTime, default=datetime.utcnow, index=True)  # Время ошибки
    
    # Связь с пользователем (опционально)
    user = relationship("User", foreign_keys=[user_id])