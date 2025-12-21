"""
Backend API для BeatStore - платформы продажи музыкальных битов

Основные функции:
- RESTful API для управления битами, пользователями и покупками
- Аутентификация и авторизация через JWT токены
- Загрузка и обслуживание аудио файлов и обложек
- Система корзины и избранного
- Административные функции

Технологии: FastAPI, SQLAlchemy, SQLite, JWT, bcrypt
"""

print("=" * 50)
print("НАЧАЛО ЗАГРУЗКИ МОДУЛЯ main.py")
print("=" * 50)

from fastapi import FastAPI, HTTPException, Depends, status, File, UploadFile, Form, Request
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from sqlalchemy import or_
import shutil
import os
import sys
import re

print("Импорт database и models...")
from database import SessionLocal, engine
from models import Base, User, Beat, Purchase, Course, CoursePurchase, ServiceOrder, cart_table, course_cart_table, course_favorites_table
print("Импорт database и models завершен")
# Убираем Cloudinary - используем локальное хранение на Render

# Настройка кодировки для Windows
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
    sys.stderr = codecs.getwriter("utf-8")(sys.stderr.detach())

# Создание таблиц базы данных при запуске
def update_database_schema():
    """Обновляет схему базы данных, добавляя отсутствующие колонки"""
    from sqlalchemy import inspect, text
    
    try:
        print("Проверка схемы базы данных...")
        inspector = inspect(engine)
        
        # Проверяем таблицу service_orders
        if 'service_orders' in inspector.get_table_names():
            columns = [col['name'] for col in inspector.get_columns('service_orders')]
            
            # Добавляем отсутствующие колонки
            if 'customer_name' not in columns:
                print("Добавление колонки customer_name в service_orders...")
                with engine.connect() as conn:
                    conn.execute(text("ALTER TABLE service_orders ADD COLUMN customer_name VARCHAR"))
                    conn.commit()
                print("Колонка customer_name добавлена")
            
            if 'customer_email' not in columns:
                print("Добавление колонки customer_email в service_orders...")
                with engine.connect() as conn:
                    conn.execute(text("ALTER TABLE service_orders ADD COLUMN customer_email VARCHAR"))
                    conn.commit()
                print("Колонка customer_email добавлена")
        
        # Создаем все таблицы (если их еще нет)
        Base.metadata.create_all(bind=engine)
        print("Схема базы данных обновлена")
    except Exception as e:
        print(f"Ошибка обновления схемы БД: {e}")
        import traceback
        traceback.print_exc()
        # В случае ошибки все равно пытаемся создать таблицы
Base.metadata.create_all(bind=engine)

update_database_schema()

# Создание администратора при первом запуске приложения
def create_admin_user():
    """
    Создает администратора по умолчанию при первом запуске
    Логин: admin, Пароль: admin123
    """
    try:
        db = SessionLocal()
        try:
            # Проверяем, существует ли уже администратор
            admin = db.query(User).filter(User.username == "admin").first()
            if not admin:
                # Создаем нового администратора
                admin_password = get_password_hash("admin123")
                admin_user = User(
                    email="admin@beatstore.com",
                    username="admin",
                    password_hash=admin_password,
                    is_admin=True
                )
                db.add(admin_user)
                db.commit()
                print("=" * 50)
                print("Админ создан: username=admin, password=admin123")
                print("=" * 50)
            else:
                print(f"Админ уже существует: {admin.username}, is_admin: {admin.is_admin}")
        except Exception as e:
            print(f"Ошибка создания админа: {e}")
            import traceback
            traceback.print_exc()
        finally:
            db.close()
    except Exception as e:
        print(f"Критическая ошибка при создании админа: {e}")
        import traceback
        traceback.print_exc()

# Создание экземпляра FastAPI приложения
print("Создание экземпляра FastAPI...")
app = FastAPI(title="BeatStore API", description="API для платформы продажи музыкальных битов")
print("FastAPI приложение создано")

# Настройка CORS для взаимодействия с frontend
# ДОЛЖНО БЫТЬ ПЕРЕД ВСЕМИ ЭНДПОИНТАМИ
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Для продакшена можно ограничить домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("FastAPI приложение создано, CORS настроен")

# Настройка кодировки для JSON ответов
import json
from fastapi.responses import JSONResponse

def custom_json_encoder(obj):
    """Кастомный JSON энкодер для корректной обработки русских символов"""
    if isinstance(obj, str):
        return obj.encode('utf-8').decode('utf-8')
    return obj

# Подключение статических файлов (аудио, обложки)
# Функция для обработки Range запросов
def parse_range_header(range_header: str, file_size: int):
    """Парсит Range заголовок и возвращает начальную и конечную позиции"""
    if not range_header:
        return None, None
    
    # Извлекаем диапазон из заголовка (например, "bytes=0-1023")
    match = re.match(r'bytes=(\d+)-(\d*)', range_header)
    if not match:
        return None, None
    
    start = int(match.group(1))
    end = int(match.group(2)) if match.group(2) else file_size - 1
    
    # Проверяем корректность диапазона
    if start >= file_size or end >= file_size or start > end:
        return None, None
    
    return start, end

def serve_audio_with_range(file_path: str, request: Request):
    """Обслуживает аудио файл с поддержкой Range запросов"""
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    file_size = os.path.getsize(file_path)
    range_header = request.headers.get('range')
    
    if not range_header:
        # Обычный запрос без Range
        return FileResponse(file_path, media_type="audio/mpeg")
    
    start, end = parse_range_header(range_header, file_size)
    if start is None or end is None:
        # Некорректный Range заголовок
        return FileResponse(file_path, media_type="audio/mpeg")
    
    content_length = end - start + 1
    
    def iterfile():
        with open(file_path, "rb") as file:
            file.seek(start)
            remaining = content_length
            while remaining:
                chunk_size = min(8192, remaining)
                chunk = file.read(chunk_size)
                if not chunk:
                    break
                remaining -= len(chunk)
                yield chunk
    
    headers = {
        'Content-Range': f'bytes {start}-{end}/{file_size}',
        'Accept-Ranges': 'bytes',
        'Content-Length': str(content_length),
        'Content-Type': 'audio/mpeg'
    }
    
    return StreamingResponse(
        iterfile(),
        status_code=206,
        headers=headers
    )

# Эндпоинт для аудио файлов с поддержкой Range
@app.get("/static/demos/{filename}")
async def serve_demo_audio(filename: str, request: Request):
    """Обслуживает демо аудио файлы с поддержкой Range запросов"""
    file_path = f"static/demos/{filename}"
    return serve_audio_with_range(file_path, request)

@app.get("/static/audio/{filename}")
async def serve_full_audio(filename: str, request: Request):
    """Обслуживает полные аудио файлы с поддержкой Range запросов"""
    file_path = f"static/audio/{filename}"
    return serve_audio_with_range(file_path, request)

@app.get("/static/course_previews/{filename}")
async def serve_course_preview(filename: str, request: Request):
    """Обслуживает превью видео курсов"""
    file_path = f"static/course_previews/{filename}"
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path, media_type="video/mp4")

@app.get("/static/course_videos/{filename}")
async def serve_course_video(filename: str, request: Request):
    """Обслуживает полные видео курсов (только для купленных)"""
    file_path = f"static/course_videos/{filename}"
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path, media_type="video/mp4")

# Статические файлы для остальных типов (обложки и т.д.)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Подключаем статические файлы фронтенда (только если директория существует)
if os.path.exists("static/frontend/assets"):
    app.mount("/assets", StaticFiles(directory="static/frontend/assets"), name="frontend_assets")
else:
    print("Директория static/frontend/assets не найдена, пропускаем монтирование")

# Тестовый эндпоинт для проверки работы API
@app.get("/health")
def health_check():
    """Проверка работоспособности API"""
    return {"status": "ok", "message": "API is running"}

# Эндпоинт для главной страницы фронтенда
@app.get("/")
@app.head("/")
async def serve_frontend():
    """Отдает главную страницу фронтенда"""
    index_path = "static/frontend/index.html"
    if os.path.exists(index_path):
        return FileResponse(index_path)
    else:
        return {"message": "Frontend не собран. Используйте http://localhost:3000 для доступа к фронтенду."}

# Настройки безопасности для JWT токенов
import os
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")  # В продакшене должен быть сложный ключ
ALGORITHM = "HS256"  # Алгоритм подписи JWT
ACCESS_TOKEN_EXPIRE_MINUTES = 30  # Время жизни токена

# Контекст для хеширования паролей
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# Схема безопасности для Bearer токенов
security = HTTPBearer()

# Pydantic схемы для валидации данных

class UserCreate(BaseModel):
    """Схема для создания нового пользователя"""
    email: EmailStr
    username: str
    password: str

class UserLogin(BaseModel):
    """Схема для входа пользователя в систему"""
    username: str
    password: str

class Token(BaseModel):
    """Схема JWT токена"""
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    """Схема ответа с информацией о пользователе"""
    id: int
    email: Optional[str] = None
    username: str
    is_active: bool
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    """Схема для обновления пользователя"""
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None

class BeatResponse(BaseModel):
    """Схема ответа с информацией о бите (базовая)"""
    id: int
    title: str
    artist: str
    genre: str
    key: Optional[str]
    bpm: int
    price: float
    description: Optional[str]
    demo_url: Optional[str]
    cover_url: Optional[str]
    is_available: bool
    created_at: datetime

    class Config:
        from_attributes = True

class BeatDetailResponse(BeatResponse):
    """Схема ответа с детальной информацией о бите (включая полные файлы)"""
    full_audio_url: Optional[str] = None
    project_files_url: Optional[str] = None

class CourseResponse(BaseModel):
    """Схема ответа с информацией о курсе"""
    id: int
    title: str
    purpose: Optional[str]
    description: Optional[str]
    tags: Optional[str]
    price: float
    preview_video_url: Optional[str]
    is_available: bool
    created_at: datetime
    is_favorite: Optional[bool] = False
    is_in_cart: Optional[bool] = False

    class Config:
        from_attributes = True

class CourseDetailResponse(CourseResponse):
    """Схема ответа с детальной информацией о курсе (включая полное видео)"""
    full_video_url: Optional[str] = None

class CourseCreate(BaseModel):
    """Схема для создания курса"""
    title: str
    purpose: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[str] = None
    price: float

class ServiceOrderCreate(BaseModel):
    """Схема для создания заказа услуги"""
    service_category: str
    materials_url: Optional[str] = None
    reference_links: Optional[str] = None
    reference_files_url: Optional[str] = None
    description: Optional[str] = None
    deadline_min: Optional[int] = None
    deadline_max: Optional[int] = None
    customer_name: Optional[str] = None  # Имя для неавторизованных
    customer_email: Optional[str] = None  # Email для неавторизованных

class ServiceOrderResponse(BaseModel):
    """Схема ответа с информацией о заказе услуги"""
    id: int
    user_id: Optional[int]
    customer_name: Optional[str]
    customer_email: Optional[str]
    service_category: str
    materials_url: Optional[str]
    reference_links: Optional[str]
    reference_files_url: Optional[str]
    description: Optional[str]
    deadline_min: Optional[int]
    deadline_max: Optional[int]
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Вспомогательные функции для работы с базой данных и аутентификацией

def get_db():
    """
    Dependency для получения сессии базы данных
    Автоматически закрывает соединение после использования
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def verify_password(plain_password, hashed_password):
    """
    Проверка пароля пользователя
    Поддерживает bcrypt и SHA256 для совместимости
    """
    # Обрезаем пароль до 72 байт для bcrypt
    if len(plain_password.encode('utf-8')) > 72:
        plain_password = plain_password.encode('utf-8')[:72].decode('utf-8', errors='ignore')
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except ValueError:
        # Если bcrypt не работает, проверяем SHA256
        import hashlib
        sha256_hash = hashlib.sha256(plain_password.encode()).hexdigest()
        return sha256_hash == hashed_password

def get_password_hash(password):
    """
    Хеширование пароля для безопасного хранения
    Поддерживает bcrypt и SHA256 для совместимости
    """
    # Обрезаем пароль до 72 байт для bcrypt  
    if len(password.encode('utf-8')) > 72:
        password = password.encode('utf-8')[:72].decode('utf-8', errors='ignore')
    try:
        return pwd_context.hash(password)
    except ValueError:
        # Если bcrypt не работает, используем простую альтернативу
        import hashlib
        return hashlib.sha256(password.encode()).hexdigest()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """
    Создание JWT токена для аутентификации
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), 
                    db: Session = Depends(get_db)):
    """
    Dependency для получения текущего авторизованного пользователя
    Выбрасывает исключение 401 если токен недействителен
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось проверить учетные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Декодируем JWT токен
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Получаем пользователя из базы данных
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user


def get_current_user_optional(credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)), 
                             db: Session = Depends(get_db)):
    """
    Dependency для получения текущего пользователя (опционально)
    Возвращает None если токен отсутствует или недействителен
    """
    if credentials is None:
        return None
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return None
        user = db.query(User).filter(User.username == username).first()
        return user
    except JWTError:
        return None

# API эндпоинты для аутентификации
print("Определение эндпоинтов аутентификации...")

@app.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    """
    Регистрация нового пользователя
    Проверяет уникальность email и username
    """
    try:
        print(f"Registration attempt: email={user.email}, username={user.username}")
        
        # Проверяем существующих пользователей по email
        if user.email:
            db_user_email = db.query(User).filter(User.email == user.email).first()
            if db_user_email:
                print(f"Email already exists: {user.email}")
                raise HTTPException(
                    status_code=400, 
                    detail="Пользователь с таким email уже существует"
                )
        
        # Проверяем существующих пользователей по username
        db_user_username = db.query(User).filter(User.username == user.username).first()
        if db_user_username:
            print(f"Username already exists: {user.username}")
            raise HTTPException(
                status_code=400, 
                detail="Пользователь с таким именем уже существует"
            )
        
        # Создаем нового пользователя
        hashed_password = get_password_hash(user.password)
        db_user = User(
            email=user.email,
            username=user.username,
            password_hash=hashed_password
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        print(f"User registered successfully: {db_user.username}")
        return db_user
    except HTTPException:
        raise
    except Exception as e:
        print(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка регистрации: {str(e)}"
        )

@app.post("/login", response_model=Token)
def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Вход пользователя в систему
    Возвращает JWT токен при успешной аутентификации
    """
    try:
        print(f"Login attempt: username={user_credentials.username}")
        
        user = db.query(User).filter(User.username == user_credentials.username).first()
        
        if not user:
            print(f"User not found: {user_credentials.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Неверное имя пользователя или пароль",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Проверяем пароль (для OAuth пользователей password_hash может быть None)
        if not user.password_hash:
            print(f"User has no password hash (OAuth user): {user_credentials.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Этот аккаунт использует OAuth авторизацию",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        password_valid = verify_password(user_credentials.password, user.password_hash)
        print(f"Password verification result: {password_valid}")
        
        if not password_valid:
            print(f"Invalid password for user: {user_credentials.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Неверное имя пользователя или пароль",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Создаем JWT токен
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.username}, expires_delta=access_token_expires
        )
        print(f"Login successful for user: {user_credentials.username}")
        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка входа: {str(e)}"
        )

@app.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@app.put("/me", response_model=UserResponse)
def update_user_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Обновление профиля пользователя"""
    if user_update.username:
        # Проверяем уникальность username
        existing_user = db.query(User).filter(
            User.username == user_update.username,
            User.id != current_user.id
        ).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already taken")
        current_user.username = user_update.username
    
    if user_update.email:
        # Проверяем уникальность email
        existing_user = db.query(User).filter(
            User.email == user_update.email,
            User.id != current_user.id
        ).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already taken")
        current_user.email = user_update.email
    
    if user_update.password:
        current_user.password_hash = get_password_hash(user_update.password)
    
    db.commit()
    db.refresh(current_user)
    return current_user

# Биты
@app.get("/beats", response_model=List[BeatResponse])
def get_beats(
    genre: Optional[str] = None,
    min_bpm: Optional[int] = None,
    max_bpm: Optional[int] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    key: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Beat).filter(Beat.is_available == True)
    
    if genre:
        query = query.filter(Beat.genre.ilike(f"%{genre}%"))
    if min_bpm:
        query = query.filter(Beat.bpm >= min_bpm)
    if max_bpm:
        query = query.filter(Beat.bpm <= max_bpm)
    if min_price:
        query = query.filter(Beat.price >= min_price)
    if max_price:
        query = query.filter(Beat.price <= max_price)
    if key:
        query = query.filter(Beat.key == key)
    
    beats = query.all()
    
    # Принудительно устанавливаем кодировку UTF-8 для ответа
    response_data = []
    for beat in beats:
        beat_dict = {
            "id": beat.id,
            "title": beat.title,
            "artist": beat.artist,
            "genre": beat.genre,
            "key": beat.key,
            "bpm": beat.bpm,
            "price": beat.price,
            "description": beat.description,
            "demo_url": beat.demo_url,
            "cover_url": beat.cover_url,
            "is_available": beat.is_available,
            "created_at": beat.created_at.isoformat() if beat.created_at else None
        }
        response_data.append(beat_dict)
    
    return response_data

@app.get("/beats/{beat_id}", response_model=BeatDetailResponse)
def get_beat(beat_id: int, db: Session = Depends(get_db), 
            current_user: User = Depends(get_current_user_optional)):
    beat = db.query(Beat).filter(Beat.id == beat_id).first()
    if not beat:
        raise HTTPException(status_code=404, detail="Beat not found")
    
    # Проверяем покупку пользователя
    if current_user:
        purchase = db.query(Purchase).filter(
            Purchase.user_id == current_user.id,
            Purchase.beat_id == beat_id
        ).first()
        
        if purchase:
            # Пользователь купил бит, показываем полную информацию
            beat_dict = beat.__dict__.copy()
            beat_dict['full_audio_url'] = beat.full_audio_url
            beat_dict['project_files_url'] = beat.project_files_url
            return BeatDetailResponse(**beat_dict)
    
    # Пользователь не покупал или не авторизован - только демо
    return BeatDetailResponse(**beat.__dict__)

# Избранное
@app.post("/beats/{beat_id}/favorite")
def add_to_favorites(beat_id: int, db: Session = Depends(get_db), 
                    current_user: User = Depends(get_current_user)):
    beat = db.query(Beat).filter(Beat.id == beat_id).first()
    if not beat:
        raise HTTPException(status_code=404, detail="Beat not found")
    
    if beat not in current_user.favorites:
        current_user.favorites.append(beat)
        db.commit()
    
    return {"message": "Added to favorites"}

@app.delete("/beats/{beat_id}/favorite")
def remove_from_favorites(beat_id: int, db: Session = Depends(get_db), 
                         current_user: User = Depends(get_current_user)):
    beat = db.query(Beat).filter(Beat.id == beat_id).first()
    if not beat:
        raise HTTPException(status_code=404, detail="Beat not found")
    
    if beat in current_user.favorites:
        current_user.favorites.remove(beat)
        db.commit()
    
    return {"message": "Removed from favorites"}

@app.get("/favorites", response_model=List[BeatResponse])
def get_favorites(db: Session = Depends(get_db), 
                 current_user: User = Depends(get_current_user)):
    return current_user.favorites

# Корзина
@app.post("/beats/{beat_id}/cart")
def add_to_cart(beat_id: int, db: Session = Depends(get_db), 
               current_user: User = Depends(get_current_user)):
    beat = db.query(Beat).filter(Beat.id == beat_id).first()
    if not beat:
        raise HTTPException(status_code=404, detail="Beat not found")
    
    if beat not in current_user.cart_items:
        current_user.cart_items.append(beat)
        db.commit()
    
    return {"message": "Added to cart"}

@app.delete("/beats/{beat_id}/cart")
def remove_from_cart(beat_id: int, db: Session = Depends(get_db), 
                    current_user: User = Depends(get_current_user)):
    beat = db.query(Beat).filter(Beat.id == beat_id).first()
    if not beat:
        raise HTTPException(status_code=404, detail="Beat not found")
    
    if beat in current_user.cart_items:
        current_user.cart_items.remove(beat)
        db.commit()
    
    return {"message": "Removed from cart"}

@app.get("/cart", response_model=List[BeatResponse])
def get_cart(db: Session = Depends(get_db), 
            current_user: User = Depends(get_current_user)):
    return current_user.cart_items

# Покупки
@app.get("/purchases", response_model=List[BeatResponse])
def get_purchases(db: Session = Depends(get_db), 
                 current_user: User = Depends(get_current_user)):
    purchases = db.query(Purchase).filter(Purchase.user_id == current_user.id).all()
    return [purchase.beat for purchase in purchases]

@app.post("/beats/{beat_id}/purchase")
def purchase_beat(beat_id: int, 
                 db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    # Получаем бит
    beat = db.query(Beat).filter(Beat.id == beat_id).first()
    if not beat:
        raise HTTPException(status_code=404, detail="Beat not found")
    
    # Проверяем что пользователь еще не купил этот бит
    existing_purchase = db.query(Purchase).filter(
        Purchase.user_id == current_user.id,
        Purchase.beat_id == beat_id
    ).first()
    
    if existing_purchase:
        raise HTTPException(status_code=400, detail="Beat already purchased")
    
    # Если бит платный - отклоняем (пока нет системы оплаты)
    if beat.price > 0:
        raise HTTPException(status_code=400, detail="Payment system not implemented yet. Only free beats are available.")
    
    # Создаем бесплатную "покупку"
    purchase = Purchase(
        user_id=current_user.id,
        beat_id=beat_id,
        price_paid=0
    )
    
    db.add(purchase)
    
    # Удаляем из корзины если там был
    db.query(cart_table).filter(
        cart_table.c.user_id == current_user.id,
        cart_table.c.beat_id == beat_id
    ).delete()
    
    db.commit()
    db.refresh(purchase)
    
    return {"message": "Beat acquired successfully!", "purchase_id": purchase.id}

@app.get("/beats/{beat_id}/download")
def download_beat_files(beat_id: int, 
                       db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    # Проверяем что пользователь купил этот бит
    purchase = db.query(Purchase).filter(
        Purchase.user_id == current_user.id,
        Purchase.beat_id == beat_id
    ).first()
    
    if not purchase:
        raise HTTPException(status_code=403, detail="Beat not purchased")
    
    # Получаем бит
    beat = db.query(Beat).filter(Beat.id == beat_id).first()
    if not beat:
        raise HTTPException(status_code=404, detail="Beat not found")
    
    # Определяем путь к файлу
    if beat.full_audio_url:
        # full_audio_url уже содержит /static/, поэтому убираем его
        file_path = beat.full_audio_url.lstrip('/')
        filename = f"{beat.title}_full.mp3"
    else:
        # Fallback на архив с проектом
        file_path = f"static/projects/{beat_id}_project.zip"
        filename = f"{beat.title}_project.zip"
    
    # Проверяем существование файла
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    # Возвращаем файл для скачивания
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type='application/octet-stream'
    )

# Загрузка аудио файлов
@app.post("/upload-audio/{beat_id}")
async def upload_audio(
    beat_id: int,
    demo_file: UploadFile = File(None),
    full_file: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    beat = db.query(Beat).filter(Beat.id == beat_id).first()
    if not beat:
        raise HTTPException(status_code=404, detail="Beat not found")
    
    # Создаем папки если их нет
    os.makedirs("static/demos", exist_ok=True)
    os.makedirs("static/audio", exist_ok=True)
    
    # Загружаем демо файл
    if demo_file:
        demo_filename = f"demo_{beat_id}_{demo_file.filename}"
        demo_path = f"static/demos/{demo_filename}"
        with open(demo_path, "wb") as buffer:
            shutil.copyfileobj(demo_file.file, buffer)
        beat.demo_url = f"/static/demos/{demo_filename}"
        print(f"Demo saved locally: {demo_path}")
    
    # Загружаем полный файл
    if full_file:
        full_filename = f"full_{beat_id}_{full_file.filename}"
        full_path = f"static/audio/{full_filename}"
        with open(full_path, "wb") as buffer:
            shutil.copyfileobj(full_file.file, buffer)
        beat.full_audio_url = f"/static/audio/{full_filename}"
        print(f"Full audio saved locally: {full_path}")
    
    db.commit()
    db.refresh(beat)
    
    return {"message": "Files uploaded successfully", "beat_id": beat_id}

# Курсы
@app.get("/courses", response_model=List[CourseResponse])
def get_courses(
    purpose: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    query = db.query(Course).filter(Course.is_available == True)
    
    if purpose:
        query = query.filter(Course.purpose.ilike(f"%{purpose}%"))
    if min_price:
        query = query.filter(Course.price >= min_price)
    if max_price:
        query = query.filter(Course.price <= max_price)
    
    courses = query.all()
    
    # Добавляем информацию о избранном и корзине для авторизованных пользователей
    if current_user:
        course_ids = [c.id for c in courses]
        favorite_course_ids = {c.id for c in current_user.course_favorites}
        cart_course_ids = {c.id for c in current_user.course_cart_items}
        
        result = []
        for course in courses:
            course_dict = course.__dict__.copy()
            course_dict['is_favorite'] = course.id in favorite_course_ids
            course_dict['is_in_cart'] = course.id in cart_course_ids
            result.append(CourseResponse(**course_dict))
        return result
    
    return courses

print("Определение эндпоинта get_course...")
@app.get("/courses/{course_id}", response_model=CourseDetailResponse)
def get_course(course_id: int, db: Session = Depends(get_db), 
            current_user: User = Depends(get_current_user_optional)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    course_dict = course.__dict__.copy()
    
    # Добавляем информацию о избранном и корзине для авторизованных пользователей
    if current_user:
        course_dict['is_favorite'] = course in current_user.course_favorites
        course_dict['is_in_cart'] = course in current_user.course_cart_items
        
        # Проверяем покупку пользователя
        purchase = db.query(CoursePurchase).filter(
            CoursePurchase.user_id == current_user.id,
            CoursePurchase.course_id == course_id
        ).first()
        
        if purchase:
            # Пользователь купил курс, показываем полную информацию
            course_dict['full_video_url'] = course.full_video_url
    else:
        course_dict['is_favorite'] = False
        course_dict['is_in_cart'] = False
    
    return CourseDetailResponse(**course_dict)

@app.post("/courses/{course_id}/favorite")
def add_course_to_favorites(course_id: int, db: Session = Depends(get_db), 
                    current_user: User = Depends(get_current_user)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if course in current_user.course_favorites:
        raise HTTPException(status_code=400, detail="Course already in favorites")
    
    current_user.course_favorites.append(course)
    db.commit()
    return {"message": "Course added to favorites"}

@app.delete("/courses/{course_id}/favorite")
def remove_course_from_favorites(course_id: int, db: Session = Depends(get_db), 
                    current_user: User = Depends(get_current_user)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if course not in current_user.course_favorites:
        raise HTTPException(status_code=400, detail="Course not in favorites")
    
    current_user.course_favorites.remove(course)
    db.commit()
    return {"message": "Course removed from favorites"}

@app.get("/course-favorites", response_model=List[CourseResponse])
def get_course_favorites(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return current_user.course_favorites

@app.post("/courses/{course_id}/cart")
def add_course_to_cart(course_id: int, db: Session = Depends(get_db), 
                    current_user: User = Depends(get_current_user)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if course in current_user.course_cart_items:
        raise HTTPException(status_code=400, detail="Course already in cart")
    
    current_user.course_cart_items.append(course)
    db.commit()
    return {"message": "Course added to cart"}

@app.delete("/courses/{course_id}/cart")
def remove_course_from_cart(course_id: int, db: Session = Depends(get_db), 
                    current_user: User = Depends(get_current_user)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if course not in current_user.course_cart_items:
        raise HTTPException(status_code=400, detail="Course not in cart")
    
    current_user.course_cart_items.remove(course)
    db.commit()
    return {"message": "Course removed from cart"}

@app.get("/course-cart", response_model=List[CourseResponse])
def get_course_cart(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return current_user.course_cart_items

@app.get("/course-purchases", response_model=List[CourseResponse])
def get_course_purchases(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    purchases = db.query(CoursePurchase).filter(CoursePurchase.user_id == current_user.id).all()
    courses = [db.query(Course).filter(Course.id == p.course_id).first() for p in purchases]
    return [c for c in courses if c]

@app.post("/courses/{course_id}/purchase")
def purchase_course(course_id: int, 
                 db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if not course.is_available:
        raise HTTPException(status_code=400, detail="Course not available")
    
    # Проверяем, не куплен ли уже курс
    existing_purchase = db.query(CoursePurchase).filter(
        CoursePurchase.user_id == current_user.id,
        CoursePurchase.course_id == course_id
    ).first()
    
    if existing_purchase:
        raise HTTPException(status_code=400, detail="Course already purchased")
    
    # Создаем покупку
    purchase = CoursePurchase(
        user_id=current_user.id,
        course_id=course_id,
        price_paid=course.price
    )
    db.add(purchase)
    
    # Удаляем из корзины
    if course in current_user.course_cart_items:
        current_user.course_cart_items.remove(course)
    
    db.commit()
    db.refresh(purchase)
    
    return {"message": "Course acquired successfully!", "purchase_id": purchase.id}

@app.get("/courses/{course_id}/download")
def download_course_video(course_id: int, 
                       db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    # Проверяем что пользователь купил этот курс
    purchase = db.query(CoursePurchase).filter(
        CoursePurchase.user_id == current_user.id,
        CoursePurchase.course_id == course_id
    ).first()
    
    if not purchase:
        raise HTTPException(status_code=403, detail="Course not purchased")
    
    # Получаем курс
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Определяем путь к файлу
    if course.full_video_url:
        file_path = course.full_video_url.lstrip('/')
        filename = f"{course.title}_full.mp4"
    else:
        raise HTTPException(status_code=404, detail="Video file not found")
    
    # Проверяем существование файла
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    # Возвращаем файл для скачивания
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type='video/mp4'
    )

# Заказы услуг
@app.post("/service-orders", response_model=ServiceOrderResponse)
def create_service_order(order: ServiceOrderCreate, 
                        db: Session = Depends(get_db),
                        current_user: Optional[User] = Depends(get_current_user_optional)):
    try:
        print(f"Creating service order: category={order.service_category}, user={current_user.username if current_user else 'anonymous'}")
        
        # Если пользователь авторизован, используем его данные
        # Если нет, используем переданные имя и email
        user_id = current_user.id if current_user else None
        
        if not current_user and (not order.customer_name or not order.customer_email):
            print("Error: Unauthenticated user must provide name and email")
            raise HTTPException(
                status_code=400,
                detail="Для неавторизованных пользователей необходимо указать имя и email"
            )
        
        print(f"Creating ServiceOrder: user_id={user_id}, customer_name={order.customer_name}, customer_email={order.customer_email}")
        
        service_order = ServiceOrder(
            user_id=user_id,
            customer_name=order.customer_name if not current_user else None,
            customer_email=order.customer_email if not current_user else None,
            service_category=order.service_category,
            materials_url=order.materials_url,
            reference_links=order.reference_links,
            reference_files_url=order.reference_files_url,
            description=order.description,
            deadline_min=order.deadline_min,
            deadline_max=order.deadline_max
        )
        
        db.add(service_order)
        db.commit()
        db.refresh(service_order)
        
        print(f"Service order created successfully: id={service_order.id}")
        return service_order
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating service order: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка при создании заказа: {str(e)}"
        )

@app.get("/service-orders", response_model=List[ServiceOrderResponse])
def get_service_orders(current_user: Optional[User] = Depends(get_current_user_optional), 
                       db: Session = Depends(get_db)):
    if current_user:
        orders = db.query(ServiceOrder).filter(ServiceOrder.user_id == current_user.id).all()
    else:
        # Для неавторизованных возвращаем пустой список
        orders = []
    return orders

@app.get("/service-orders/{order_id}", response_model=ServiceOrderResponse)
def get_service_order(order_id: int,
                     current_user: User = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    order = db.query(ServiceOrder).filter(
        ServiceOrder.id == order_id,
        ServiceOrder.user_id == current_user.id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@app.post("/upload-materials")
async def upload_materials(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Загрузка материалов для заказа"""
    os.makedirs("static/materials", exist_ok=True)
    filename = f"materials_{current_user.id}_{file.filename}"
    file_path = f"static/materials/{filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {"url": f"/static/materials/{filename}"}

@app.post("/upload-reference-files")
async def upload_reference_files(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Загрузка референсов для заказа"""
    os.makedirs("static/references", exist_ok=True)
    filename = f"references_{current_user.id}_{file.filename}"
    file_path = f"static/references/{filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {"url": f"/static/references/{filename}"}

# Быстрый эндпоинт для добавления нового бита с файлом
@app.post("/create-beat-with-audio")
async def create_beat_with_audio(
    title: str = Form(...),
    artist: str = Form(...),
    genre: str = Form(...),
    bpm: int = Form(...),
    price: float = Form(...),
    key: str = Form(None),
    description: str = Form(None),
    demo_file: UploadFile = File(...),
    full_file: UploadFile = File(None),
    cover_file: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    # Создаем новый бит
    new_beat = Beat(
        title=title,
        artist=artist,
        genre=genre,
        bpm=bpm,
        price=price,
        key=key,
        description=description
    )
    db.add(new_beat)
    db.commit()
    db.refresh(new_beat)
    
    try:
        # Загружаем демо файл локально
        demo_filename = f"demo_{new_beat.id}_{demo_file.filename}"
        demo_path = f"static/demos/{demo_filename}"
        os.makedirs(os.path.dirname(demo_path), exist_ok=True)
        
        with open(demo_path, "wb") as buffer:
            shutil.copyfileobj(demo_file.file, buffer)
        new_beat.demo_url = f"/static/demos/{demo_filename}"
        print(f"Demo saved locally: {demo_path}")
        
        # Загружаем полный файл локально (опционально)
        if full_file:
            full_filename = f"full_{new_beat.id}_{full_file.filename}"
            full_path = f"static/audio/{full_filename}"
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            
            with open(full_path, "wb") as buffer:
                shutil.copyfileobj(full_file.file, buffer)
            new_beat.full_audio_url = f"/static/audio/{full_filename}"
            print(f"Full audio saved locally: {full_path}")
        
        # Загружаем обложку локально (опционально)
        if cover_file:
            cover_filename = f"cover_{new_beat.id}_{cover_file.filename}"
            cover_path = f"static/covers/{cover_filename}"
            os.makedirs(os.path.dirname(cover_path), exist_ok=True)
            
            with open(cover_path, "wb") as buffer:
                shutil.copyfileobj(cover_file.file, buffer)
            new_beat.cover_url = f"/static/covers/{cover_filename}"
            print(f"Cover saved locally: {cover_path}")
        
        db.commit()
        db.refresh(new_beat)
        
        return {
            "message": "Beat created successfully",
            "beat_id": new_beat.id,
            "demo_url": new_beat.demo_url,
            "full_url": new_beat.full_audio_url,
            "cover_url": new_beat.cover_url
        }
    except Exception as e:
        print(f"Error saving files: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error saving files: {str(e)}")

# Админские эндпоинты
@app.post("/api/admin/login", response_model=Token)
def admin_login(login_data: UserLogin, db: Session = Depends(get_db)):
    print(f"Admin login attempt: username={login_data.username}")
    
    # Проверяем пользователя
    user = db.query(User).filter(User.username == login_data.username).first()
    
    if not user:
        print(f"User not found: {login_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    print(f"User found: {user.username}, is_admin: {user.is_admin}")
    
    if not verify_password(login_data.password, user.password_hash):
        print(f"Password verification failed for user: {login_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    # Проверяем права админа
    if not user.is_admin:
        print(f"User {login_data.username} is not admin")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    # Создаем токен
    access_token_expires = timedelta(minutes=480)  # 8 часов для админа
    access_token = create_access_token(
        data={"sub": user.username, "type": "admin"}, expires_delta=access_token_expires
    )
    
    print(f"Admin login successful for: {login_data.username}")
    return {"access_token": access_token, "token_type": "bearer"}

def get_current_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if username is None or token_type != "admin":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Admin access required",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(User).filter(User.username == username).first()
    if user is None or not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin access required"
        )
    return user

@app.get("/api/admin/analytics")
def get_analytics(current_admin: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    from datetime import datetime, timedelta
    
    # Статистика за последние 30 дней
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
    # Регистрации по дням
    registrations = db.query(User).filter(User.created_at >= thirty_days_ago).all()
    reg_by_day = {}
    for user in registrations:
        day = user.created_at.date().isoformat()
        reg_by_day[day] = reg_by_day.get(day, 0) + 1
    
    # Покупки по дням
    purchases = db.query(Purchase).join(Beat).filter(Purchase.purchase_date >= thirty_days_ago).all()
    purchases_by_day = {}
    total_revenue = 0
    for purchase in purchases:
        day = purchase.purchase_date.date().isoformat()
        purchases_by_day[day] = purchases_by_day.get(day, 0) + 1
        total_revenue += purchase.price_paid
    
    # Общая статистика
    total_users = db.query(User).count()
    total_beats = db.query(Beat).count()
    total_purchases = db.query(Purchase).count()
    
    # Статистика по типам покупок
    paid_purchases = db.query(Purchase).filter(Purchase.price_paid > 0).count()
    free_purchases = db.query(Purchase).filter(Purchase.price_paid == 0).count()
    
    return {
        "registrations_by_day": reg_by_day,
        "purchases_by_day": purchases_by_day,
        "total_users": total_users,
        "total_beats": total_beats,
        "total_purchases": total_purchases,
        "paid_purchases": paid_purchases,
        "free_purchases": free_purchases,
        "total_revenue": total_revenue
    }

@app.get("/api/admin/purchases")
def get_purchases_admin(current_admin: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    purchases = db.query(Purchase).join(Beat).join(User).all()
    
    result = []
    for purchase in purchases:
        result.append({
            "id": purchase.id,
            "user_email": purchase.user.email,
            "user_username": purchase.user.username,
            "beat_title": purchase.beat.title,
            "beat_price": purchase.beat.price,
            "price_paid": purchase.price_paid,
            "created_at": purchase.purchase_date
        })
    
    return result

@app.get("/api/admin/beats")
def get_beats_admin(current_admin: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    beats = db.query(Beat).all()
    return beats

@app.get("/api/admin/genres")
def get_genres_admin(current_admin: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    genres = db.query(Beat.genre).distinct().all()
    return [genre[0] for genre in genres if genre[0]]

@app.put("/api/admin/beats/{beat_id}")
def update_beat_admin(beat_id: int, beat_data: dict, current_admin: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    beat = db.query(Beat).filter(Beat.id == beat_id).first()
    if not beat:
        raise HTTPException(status_code=404, detail="Beat not found")
    
    # Обновляем поля
    for key, value in beat_data.items():
        if hasattr(beat, key):
            setattr(beat, key, value)
    
    db.commit()
    db.refresh(beat)
    return {"message": "Beat updated successfully"}

@app.delete("/api/admin/beats/{beat_id}")
def delete_beat_admin(beat_id: int, current_admin: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    beat = db.query(Beat).filter(Beat.id == beat_id).first()
    if not beat:
        raise HTTPException(status_code=404, detail="Beat not found")
    
    # Удаляем файлы
    try:
        if beat.demo_url and os.path.exists(f"static/{beat.demo_url}"):
            os.remove(f"static/{beat.demo_url}")
        if beat.full_audio_url and os.path.exists(f"static/{beat.full_audio_url}"):
            os.remove(f"static/{beat.full_audio_url}")
        if beat.cover_url and os.path.exists(f"static/{beat.cover_url}"):
            os.remove(f"static/{beat.cover_url}")
    except Exception as e:
        print(f"Error deleting files: {e}")
    
    db.delete(beat)
    db.commit()
    return {"message": "Beat deleted successfully"}

@app.post("/api/admin/upload-beat")
async def upload_beat_admin(
    title: str = Form(...),
    artist: str = Form(...),
    genre: str = Form(...),
    bpm: int = Form(...),
    price: float = Form(...),
    key: str = Form(None),
    description: str = Form(None),
    demo_file: UploadFile = File(...),
    full_file: UploadFile = File(None),
    cover_file: UploadFile = File(None),
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    # Создаем новый бит
    beat = Beat(
        title=title,
        artist=artist,
        genre=genre,
        key=key,
        bpm=bpm,
        price=price,
        description=description
    )
    
    db.add(beat)
    db.commit()
    db.refresh(beat)
    
    try:
        # Загружаем демо файл локально
        if demo_file:
            demo_filename = f"demo_{beat.id}_{demo_file.filename}"
            demo_path = f"static/demos/{demo_filename}"
            os.makedirs(os.path.dirname(demo_path), exist_ok=True)
            
            with open(demo_path, "wb") as buffer:
                shutil.copyfileobj(demo_file.file, buffer)
            
            beat.demo_url = f"/static/demos/{demo_filename}"
            print(f"Demo saved locally: {demo_path}")
        
        # Загружаем полный файл локально
        if full_file:
            full_filename = f"full_{beat.id}_{full_file.filename}"
            full_path = f"static/audio/{full_filename}"
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            
            with open(full_path, "wb") as buffer:
                shutil.copyfileobj(full_file.file, buffer)
            
            beat.full_audio_url = f"/static/audio/{full_filename}"
            print(f"Full audio saved locally: {full_path}")
        
        # Загружаем обложку локально
        if cover_file:
            cover_filename = f"cover_{beat.id}_{cover_file.filename}"
            cover_path = f"static/covers/{cover_filename}"
            os.makedirs(os.path.dirname(cover_path), exist_ok=True)
            
            with open(cover_path, "wb") as buffer:
                shutil.copyfileobj(cover_file.file, buffer)
            
            beat.cover_url = f"/static/covers/{cover_filename}"
            print(f"Cover saved locally: {cover_path}")
        
        db.commit()
        db.refresh(beat)
        
        return {
            "message": "Beat uploaded successfully",
            "beat_id": beat.id,
            "demo_url": beat.demo_url,
            "full_url": beat.full_audio_url,
            "cover_url": beat.cover_url
        }
        
    except Exception as e:
        # В случае ошибки удаляем бит из БД
        db.delete(beat)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Error uploading files: {str(e)}")

@app.post("/api/admin/upload-course")
async def upload_course_admin(
    title: str = Form(...),
    purpose: str = Form(None),
    description: str = Form(None),
    tags: str = Form(None),
    price: float = Form(...),
    preview_video_file: UploadFile = File(...),
    full_video_file: UploadFile = File(...),
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    # Создаем новый курс
    course = Course(
        title=title,
        purpose=purpose,
        description=description,
        tags=tags,
        price=price
    )
    
    db.add(course)
    db.commit()
    db.refresh(course)
    
    try:
        # Создаем папки для видео
        os.makedirs("static/course_previews", exist_ok=True)
        os.makedirs("static/course_videos", exist_ok=True)
        
        # Загружаем превью видео локально
        if preview_video_file:
            preview_filename = f"preview_{course.id}_{preview_video_file.filename}"
            preview_path = f"static/course_previews/{preview_filename}"
            
            with open(preview_path, "wb") as buffer:
                shutil.copyfileobj(preview_video_file.file, buffer)
            
            course.preview_video_url = f"/static/course_previews/{preview_filename}"
            print(f"Preview video saved locally: {preview_path}")
        
        # Загружаем полное видео локально
        if full_video_file:
            full_filename = f"full_{course.id}_{full_video_file.filename}"
            full_path = f"static/course_videos/{full_filename}"
            
            with open(full_path, "wb") as buffer:
                shutil.copyfileobj(full_video_file.file, buffer)
            
            course.full_video_url = f"/static/course_videos/{full_filename}"
            print(f"Full video saved locally: {full_path}")
        
        db.commit()
        db.refresh(course)
        
        return {
            "message": "Course uploaded successfully",
            "course_id": course.id,
            "preview_url": course.preview_video_url,
            "full_url": course.full_video_url
        }
        
    except Exception as e:
        # В случае ошибки удаляем курс из БД
        db.delete(course)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Error uploading files: {str(e)}")

# Админские эндпоинты для заявок на услуги
@app.get("/api/admin/service-orders")
def get_service_orders_admin(current_admin: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    """Получение всех заявок на услуги для админа"""
    orders = db.query(ServiceOrder).join(User).all()
    
    result = []
    for order in orders:
        result.append({
            "id": order.id,
            "user_id": order.user_id,
            "user_email": order.user.email,
            "user_username": order.user.username,
            "service_category": order.service_category,
            "materials_url": order.materials_url,
            "reference_links": order.reference_links,
            "reference_files_url": order.reference_files_url,
            "description": order.description,
            "deadline_min": order.deadline_min,
            "deadline_max": order.deadline_max,
            "status": order.status,
            "created_at": order.created_at,
            "updated_at": order.updated_at
        })
    
    return result

@app.put("/api/admin/service-orders/{order_id}")
def update_service_order_status(
    order_id: int,
    status: str = Form(...),
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Обновление статуса заявки на услугу"""
    order = db.query(ServiceOrder).filter(ServiceOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Service order not found")
    
    if status not in ["pending", "in_progress", "completed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    order.status = status
    order.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(order)
    
    return {"message": "Order status updated successfully", "order": order}

@app.get("/api/admin/courses")
def get_courses_admin(current_admin: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    """Получение всех курсов для админа"""
    courses = db.query(Course).all()
    return courses

@app.put("/api/admin/courses/{course_id}")
def update_course_admin(course_id: int, course_data: dict, current_admin: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    """Обновление курса админом"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Обновляем поля
    for key, value in course_data.items():
        if hasattr(course, key):
            setattr(course, key, value)
    
    db.commit()
    db.refresh(course)
    return {"message": "Course updated successfully"}

@app.delete("/api/admin/courses/{course_id}")
def delete_course_admin(course_id: int, current_admin: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    """Удаление курса админом"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Удаляем файлы
    try:
        if course.preview_video_url and os.path.exists(f"static/{course.preview_video_url.lstrip('/')}"):
            os.remove(f"static/{course.preview_video_url.lstrip('/')}")
        if course.full_video_url and os.path.exists(f"static/{course.full_video_url.lstrip('/')}"):
            os.remove(f"static/{course.full_video_url.lstrip('/')}")
    except Exception as e:
        print(f"Error deleting course files: {e}")
    
    db.delete(course)
    db.commit()
    return {"message": "Course deleted successfully"}

# OAuth авторизация
class OAuthLogin(BaseModel):
    """Схема для OAuth авторизации"""
    provider: str  # google, vk, yandex, telegram
    access_token: str
    email: Optional[str] = None
    username: Optional[str] = None
    provider_user_id: str
    first_name: Optional[str] = None  # Для Telegram
    last_name: Optional[str] = None  # Для Telegram
    photo_url: Optional[str] = None  # URL аватара

@app.post("/oauth/login", response_model=Token)
def oauth_login(oauth_data: OAuthLogin, db: Session = Depends(get_db)):
    """
    Авторизация через OAuth провайдеров (Google, VK, Yandex)
    Создает пользователя, если его нет, или возвращает токен существующему
    """
    # Ищем пользователя по провайдеру и provider_id
    user = db.query(User).filter(
        User.oauth_provider == oauth_data.provider,
        User.oauth_provider_id == oauth_data.provider_user_id
    ).first()
    
    if not user:
        # Создаем нового пользователя
        # Генерируем username, если не предоставлен
        username = oauth_data.username
        if not username:
            # Для Telegram используем имя и фамилию
            if oauth_data.provider == 'telegram' and oauth_data.first_name:
                if oauth_data.last_name:
                    username = f"{oauth_data.first_name}_{oauth_data.last_name}".lower().replace(' ', '_')
                else:
                    username = oauth_data.first_name.lower().replace(' ', '_')
            elif oauth_data.email:
                username = oauth_data.email.split('@')[0]
            else:
                username = f"{oauth_data.provider}_user_{oauth_data.provider_user_id[:8]}"
        
        # Проверяем уникальность username
        base_username = username
        counter = 1
        while db.query(User).filter(User.username == username).first():
            username = f"{base_username}_{counter}"
            counter += 1
        
        user = User(
            email=oauth_data.email,
            username=username,
            password_hash=None,  # OAuth пользователи не имеют пароля
            oauth_provider=oauth_data.provider,
            oauth_provider_id=oauth_data.provider_user_id
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Обновляем email, если он изменился
        if oauth_data.email and user.email != oauth_data.email:
            # Проверяем, не занят ли email другим пользователем
            existing_user = db.query(User).filter(
                User.email == oauth_data.email,
                User.id != user.id
            ).first()
            if not existing_user:
                user.email = oauth_data.email
                db.commit()
    
    # Создаем JWT токен
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/oauth/telegram-auth", response_model=Token)
def telegram_auth_from_bot(
    chat_id: int = Form(...),
    username: Optional[str] = Form(None),
    first_name: Optional[str] = Form(None),
    last_name: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Авторизация через Telegram бота по chat_id
    Используется когда пользователь возвращается на сайт из бота
    """
    try:
        # Используем переданные данные пользователя
        # getChat не работает для пользователей, только для групп/каналов
        tg_username = username or f"tg_user_{chat_id}"
        tg_first_name = first_name or ""
        tg_last_name = last_name or ""
        
        # Ищем или создаем пользователя
        provider_user_id = str(chat_id)
        user = db.query(User).filter(
            User.oauth_provider == "telegram",
            User.oauth_provider_id == provider_user_id
        ).first()
        
        if not user:
            # Создаем нового пользователя
            base_username = tg_username or f"{tg_first_name}_{tg_last_name}".lower().replace(' ', '_') or f"tg_user_{chat_id}"
            # Проверяем уникальность username
            final_username = base_username
            counter = 1
            while db.query(User).filter(User.username == final_username).first():
                final_username = f"{base_username}_{counter}"
                counter += 1
            
            user = User(
                email=None,
                username=final_username,
                password_hash=None,
                oauth_provider="telegram",
                oauth_provider_id=provider_user_id
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # Обновляем username, если изменился
            if tg_username and user.username != tg_username:
                # Проверяем уникальность нового username
                if not db.query(User).filter(User.username == tg_username).first():
                    user.username = tg_username
                    db.commit()
                    db.refresh(user)
        
        # Создаем JWT токен
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.username}, expires_delta=access_token_expires
        )
        
        return {"access_token": access_token, "token_type": "bearer"}
        
    except Exception as e:
        print(f"Ошибка авторизации через Telegram: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Ошибка авторизации: {str(e)}")

@app.get("/oauth/{provider}/callback")
def oauth_callback(provider: str, code: Optional[str] = None, error: Optional[str] = None):
    """
    Callback эндпоинт для OAuth провайдеров
    В реальной реализации здесь будет обмен кода на токен
    """
    if error:
        raise HTTPException(status_code=400, detail=f"OAuth error: {error}")
    
    # В реальной реализации здесь будет:
    # 1. Обмен code на access_token через API провайдера
    # 2. Получение данных пользователя
    # 3. Создание/поиск пользователя в БД
    # 4. Возврат JWT токена
    
    return {"message": f"OAuth callback for {provider}. Implement token exchange."}

# Эндпоинт для всех остальных маршрутов фронтенда (SPA routing)
# Должен быть в самом конце, чтобы не перехватывать API маршруты
@app.get("/{path:path}")
async def serve_frontend_routes(path: str):
    """Отдает фронтенд для всех маршрутов (SPA routing)"""
    # Проверяем, не является ли это API маршрутом или статическим файлом
    if (path.startswith("api/") or 
        path.startswith("static/") or 
        path.startswith("beats/") or 
        path.startswith("login") or 
        path.startswith("register") or 
        path.startswith("me") or 
        path.startswith("favorites") or 
        path.startswith("cart") or 
        path.startswith("purchases") or
        path.startswith("favicon.ico") or
        path.startswith("assets/") or
        path.endswith(".js") or
        path.endswith(".css") or
        path.endswith(".png") or
        path.endswith(".jpg") or
        path.endswith(".jpeg") or
        path.endswith(".gif") or
        path.endswith(".svg")):
        raise HTTPException(status_code=404, detail="Not found")
    
    # Для всех остальных маршрутов отдаем index.html
    index_path = "static/frontend/index.html"
    if os.path.exists(index_path):
        return FileResponse(index_path)
    else:
        raise HTTPException(status_code=404, detail="Frontend не собран. Используйте http://localhost:3000")

# Создание администратора при запуске приложения
print("=" * 50)
print("Инициализация приложения...")
print("=" * 50)
print("ВЫЗОВ create_admin_user()...")
create_admin_user()
print("create_admin_user() завершен")

# Запуск Telegram бота в фоновом потоке
print("=" * 50)
print("Запуск Telegram бота...")
print("=" * 50)
try:
    import threading
    import os
    
    # Проверяем наличие токена
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    if bot_token:
        try:
            from telegram_bot import main as telegram_bot_main
            
            def run_telegram_bot():
                try:
                    print("🤖 Запуск Telegram бота в фоновом потоке...")
                    telegram_bot_main()
                except Exception as e:
                    print(f"❌ Ошибка в Telegram боте: {e}")
                    import traceback
                    traceback.print_exc()
            
            # Запускаем бота в отдельном потоке
            bot_thread = threading.Thread(target=run_telegram_bot, daemon=True)
            bot_thread.start()
            print("✅ Telegram бот запущен в фоновом потоке")
        except ImportError as e:
            print(f"⚠️  Не удалось импортировать telegram_bot: {e}")
        except Exception as e:
            print(f"⚠️  Не удалось запустить Telegram бота: {e}")
            import traceback
            traceback.print_exc()
    else:
        print("⚠️  TELEGRAM_BOT_TOKEN не установлен, бот не запущен")
except Exception as e:
    print(f"⚠️  Ошибка при попытке запуска Telegram бота: {e}")
    import traceback
    traceback.print_exc()

print("=" * 50)
print("Приложение готово к работе!")
print("=" * 50)
print("КОНЕЦ ЗАГРУЗКИ МОДУЛЯ main.py")
print("=" * 50)

if __name__ == "__main__":
    import uvicorn
    print("Запуск сервера на http://0.0.0.0:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")