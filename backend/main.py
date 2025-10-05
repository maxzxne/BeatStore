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

from database import SessionLocal, engine
from models import Base, User, Beat, Purchase, cart_table
# Убираем Cloudinary - используем локальное хранение на Render

# Настройка кодировки для Windows
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
    sys.stderr = codecs.getwriter("utf-8")(sys.stderr.detach())

# Создание таблиц базы данных при запуске
Base.metadata.create_all(bind=engine)

# Создание администратора при первом запуске приложения
def create_admin_user():
    """
    Создает администратора по умолчанию при первом запуске
    Логин: admin, Пароль: admin123
    """
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
            print("Админ создан: username=admin, password=admin123")
        else:
            print(f"Админ уже существует: {admin.username}, is_admin: {admin.is_admin}")
    except Exception as e:
        print(f"Ошибка создания админа: {e}")
    finally:
        db.close()

# Создание экземпляра FastAPI приложения
app = FastAPI(title="BeatStore API", description="API для платформы продажи музыкальных битов")

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

# Статические файлы для остальных типов (обложки и т.д.)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Раздача фронтенда
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Подключаем статические файлы фронтенда
app.mount("/assets", StaticFiles(directory="static/frontend/assets"), name="frontend_assets")

# Эндпоинт для главной страницы фронтенда
@app.get("/")
async def serve_frontend():
    """Отдает главную страницу фронтенда"""
    return FileResponse("static/frontend/index.html")

# Настройка CORS для взаимодействия с frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Для продакшена можно ограничить домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    email: str
    username: str
    is_active: bool
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True

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

# Создание администратора при запуске приложения
create_admin_user()

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

@app.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    """
    Регистрация нового пользователя
    Проверяет уникальность email и username
    """
    # Проверяем существующих пользователей
    db_user = db.query(User).filter(
        or_(User.email == user.email, User.username == user.username)
    ).first()
    if db_user:
        raise HTTPException(
            status_code=400, 
            detail="User with this email or username already exists"
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
    return db_user

@app.post("/login", response_model=Token)
def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Вход пользователя в систему
    Возвращает JWT токен при успешной аутентификации
    """
    user = db.query(User).filter(User.username == user_credentials.username).first()
    
    if not user or not verify_password(user_credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Создаем JWT токен
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
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
        
    except Exception as e:
        print(f"Error saving files: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error saving files: {str(e)}")
    
    return {
        "message": "Beat created successfully",
        "beat_id": new_beat.id,
        "demo_url": new_beat.demo_url,
        "full_url": new_beat.full_audio_url
    }

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
    return FileResponse("static/frontend/index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)