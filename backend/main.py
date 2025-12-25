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
import uuid
from pathlib import Path

print("Импорт database и models...")
from database import SessionLocal, engine
from models import Base, User, Beat, Purchase, Course, CoursePurchase, ServiceOrder, OAuthSettings, ErrorLog, cart_table, course_cart_table, course_favorites_table
print("Импорт database и models завершен")

# Импорт функции отправки сообщений в Telegram
try:
    from telegram_bot import send_message
    TELEGRAM_BOT_AVAILABLE = True
except ImportError:
    print("⚠️  Telegram bot module not available")
    TELEGRAM_BOT_AVAILABLE = False
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
            new_columns = {
                'customer_name': 'VARCHAR',
                'customer_email': 'VARCHAR',
                'order_type': 'VARCHAR DEFAULT "know"',
                'service_categories': 'TEXT',
                'deadline_days': 'INTEGER',
                'price': 'FLOAT',
                'prepayment_percent': 'INTEGER',
                'contact_info': 'VARCHAR',
                'result_wav_url': 'VARCHAR',
                'result_mp3_url': 'VARCHAR',
                'result_zip_url': 'VARCHAR'
            }
            
            for col_name, col_type in new_columns.items():
                if col_name not in columns:
                    print(f"Добавление колонки {col_name} в service_orders...")
                    with engine.connect() as conn:
                        conn.execute(text(f"ALTER TABLE service_orders ADD COLUMN {col_name} {col_type}"))
                        conn.commit()
                    print(f"Колонка {col_name} добавлена")
        
        # Проверяем таблицу beats
        if 'beats' in inspector.get_table_names():
            columns = [col['name'] for col in inspector.get_columns('beats')]
            
            new_columns = {
                'wav_url': 'VARCHAR',
                'mp3_url': 'VARCHAR',
                'exclusive_url': 'VARCHAR',
                'allow_multiple_purchases': 'BOOLEAN DEFAULT 0',
                'price_mp3': 'FLOAT',
                'price_wav': 'FLOAT',
                'price_exclusive': 'FLOAT'
            }
            
            for col_name, col_type in new_columns.items():
                if col_name not in columns:
                    print(f"Добавление колонки {col_name} в beats...")
                    with engine.connect() as conn:
                        conn.execute(text(f"ALTER TABLE beats ADD COLUMN {col_name} {col_type}"))
                        conn.commit()
                    print(f"Колонка {col_name} добавлена")
        
        # Проверяем таблицу purchases
        if 'purchases' in inspector.get_table_names():
            columns = [col['name'] for col in inspector.get_columns('purchases')]
            
            if 'purchase_type' not in columns:
                print("Добавление колонки purchase_type в purchases...")
                with engine.connect() as conn:
                    conn.execute(text("ALTER TABLE purchases ADD COLUMN purchase_type VARCHAR DEFAULT 'mp3'"))
                    conn.commit()
                print("Колонка purchase_type добавлена")
        
        # Проверяем таблицу users
        if 'users' in inspector.get_table_names():
            columns = [col['name'] for col in inspector.get_columns('users')]
            
            if 'additional_contact' not in columns:
                print("Добавление колонки additional_contact в users...")
                with engine.connect() as conn:
                    conn.execute(text("ALTER TABLE users ADD COLUMN additional_contact VARCHAR"))
                    conn.commit()
                print("Колонка additional_contact добавлена")
        
        # Проверяем таблицу oauth_settings
        if 'oauth_settings' not in inspector.get_table_names():
            print("Создание таблицы oauth_settings...")
            Base.metadata.create_all(bind=engine)
            # Создаем настройки по умолчанию
            from models import OAuthSettings
            db = SessionLocal()
            try:
                providers = ['google', 'vk', 'yandex', 'telegram']
                for provider in providers:
                    existing = db.query(OAuthSettings).filter(OAuthSettings.provider == provider).first()
                    if not existing:
                        oauth_setting = OAuthSettings(
                            provider=provider,
                            is_hidden=(provider in ['google', 'vk', 'yandex']),  # По умолчанию Google, VK, Yandex скрыты
                            is_disabled=False
                        )
                        db.add(oauth_setting)
                db.commit()
                print("Настройки OAuth созданы")
            except Exception as e:
                print(f"Ошибка создания настроек OAuth: {e}")
                db.rollback()
            finally:
                db.close()
        else:
            # Проверяем, что все провайдеры есть
            from models import OAuthSettings
            db = SessionLocal()
            try:
                providers = ['google', 'vk', 'yandex', 'telegram']
                for provider in providers:
                    existing = db.query(OAuthSettings).filter(OAuthSettings.provider == provider).first()
                    if not existing:
                        oauth_setting = OAuthSettings(
                            provider=provider,
                            is_hidden=(provider in ['google', 'vk', 'yandex']),  # По умолчанию Google, VK, Yandex скрыты
                            is_disabled=False
                        )
                        db.add(oauth_setting)
                db.commit()
            except Exception as e:
                print(f"Ошибка проверки настроек OAuth: {e}")
                db.rollback()
            finally:
                db.close()
        
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
# CORS настройки - для продакшена указать конкретные домены
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",") if os.getenv("CORS_ORIGINS") else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    max_age=3600,  # Кеш preflight запросов на 1 час
)

# Middleware для логирования ошибок
@app.middleware("http")
async def log_errors_middleware(request: Request, call_next):
    """Логирует ошибки в базу данных"""
    try:
        response = await call_next(request)
        # Логируем только ошибки (4xx и 5xx)
        if response.status_code >= 400:
            try:
                db = SessionLocal()
                # Определяем тип ошибки по endpoint
                error_type = "unknown"
                endpoint = request.url.path
                if "/register" in endpoint:
                    error_type = "registration"
                elif "/login" in endpoint:
                    error_type = "auth"
                elif "/purchase" in endpoint or ("/beats" in endpoint and "/purchase" in endpoint):
                    error_type = "purchase"
                elif "/payment" in endpoint or "/test-payment" in endpoint:
                    error_type = "payment"
                
                # Получаем тело ответа для деталей ошибки
                error_message = f"HTTP {response.status_code}"
                
                # Получаем информацию о пользователе
                user_id = None
                try:
                    token = request.headers.get("Authorization", "").replace("Bearer ", "")
                    if token:
                        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                        user_id = payload.get("sub")
                except:
                    pass
                
                # Создаем запись об ошибке
                error_log = ErrorLog(
                    error_type=error_type,
                    error_message=error_message,
                    endpoint=endpoint,
                    user_id=user_id,
                    ip_address=request.client.host if request.client else None,
                    user_agent=request.headers.get("user-agent")
                )
                db.add(error_log)
                db.commit()
            except Exception as e:
                print(f"Ошибка при логировании ошибки: {e}")
                try:
                    if db:
                        db.rollback()
                except:
                    pass
            finally:
                if db:
                    db.close()
        
        return response
    except Exception as e:
        # Логируем необработанные исключения
        try:
            db = SessionLocal()
            import traceback
            error_type = "unknown"
            endpoint = request.url.path
            if "/register" in endpoint:
                error_type = "registration"
            elif "/login" in endpoint:
                error_type = "auth"
            elif "/purchase" in endpoint:
                error_type = "purchase"
            elif "/payment" in endpoint:
                error_type = "payment"
            
            error_log = ErrorLog(
                error_type=error_type,
                error_message=str(e),
                error_details=traceback.format_exc(),
                endpoint=endpoint,
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent")
            )
            db.add(error_log)
            db.commit()
            db.close()
        except:
            pass
        
        raise

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
async def health_check():
    """Проверка работоспособности API - быстрый ответ для Render"""
    return {"status": "ok", "message": "API is running", "timestamp": datetime.utcnow().isoformat()}

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

# Настройки безопасности для загрузки файлов
ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/wave"]
ALLOWED_VIDEO_TYPES = ["video/mp4", "video/mpeg", "video/quicktime"]
ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
ALLOWED_ARCHIVE_TYPES = ["application/zip", "application/x-zip-compressed"]
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500 MB
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB

def validate_file(file: UploadFile, allowed_types: list, max_size: int, file_type: str) -> tuple[bool, str]:
    """Валидация загружаемого файла"""
    if not file:
        return True, ""
    
    # Проверка типа файла
    if file.content_type not in allowed_types:
        return False, f"Недопустимый тип файла. Разрешены: {', '.join(allowed_types)}"
    
    # Проверка расширения
    filename = file.filename or ""
    ext = Path(filename).suffix.lower()
    allowed_extensions = {
        "audio": [".mp3", ".wav"],
        "video": [".mp4", ".mov"],
        "image": [".jpg", ".jpeg", ".png", ".webp"],
        "archive": [".zip"]
    }
    
    if file_type in allowed_extensions and ext not in allowed_extensions[file_type]:
        return False, f"Недопустимое расширение файла. Разрешены: {', '.join(allowed_extensions[file_type])}"
    
    # Проверка размера (нужно прочитать файл)
    # В FastAPI размер файла проверяется при чтении
    return True, ""

def sanitize_filename(filename: str) -> str:
    """Санитизация имени файла для безопасности"""
    if not filename:
        return ""
    # Удаляем опасные символы
    filename = re.sub(r'[<>:"/\\|?*]', '', filename)
    # Ограничиваем длину
    filename = filename[:200]
    return filename

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
    additional_contact: Optional[str] = None
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
    price_mp3: Optional[float] = None
    price_wav: Optional[float] = None
    price_exclusive: Optional[float] = None
    description: Optional[str]
    demo_url: Optional[str]
    cover_url: Optional[str]
    is_available: bool
    allow_multiple_purchases: bool = False
    created_at: datetime

    class Config:
        from_attributes = True

class BeatDetailResponse(BeatResponse):
    """Схема ответа с детальной информацией о бите (включая полные файлы)"""
    full_audio_url: Optional[str] = None  # Старое поле для обратной совместимости
    project_files_url: Optional[str] = None  # Старое поле
    wav_url: Optional[str] = None
    mp3_url: Optional[str] = None
    exclusive_url: Optional[str] = None

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
    order_type: str = "know"  # "know" или "dont_know"
    service_category: Optional[str] = None  # Старое поле для обратной совместимости
    service_categories: Optional[List[str]] = None  # Массив выбранных категорий
    materials_url: Optional[str] = None  # Может быть JSON массив URL
    reference_links: Optional[str] = None
    reference_files_url: Optional[str] = None  # Может быть JSON массив URL
    description: Optional[str] = None
    deadline_min: Optional[int] = None  # Старое поле
    deadline_max: Optional[int] = None  # Старое поле
    deadline_days: Optional[int] = None  # Количество дней дедлайна
    prepayment_percent: Optional[int] = None  # Процент предоплаты (50 или 100)
    contact_info: Optional[str] = None  # Дополнительная информация для обратной связи
    customer_name: Optional[str] = None  # Имя для неавторизованных
    customer_email: Optional[str] = None  # Email для неавторизованных

class ServiceOrderResponse(BaseModel):
    """Схема ответа с информацией о заказе услуги"""
    id: int
    user_id: Optional[int]
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    order_type: str = "know"
    service_category: Optional[str] = None
    service_categories: Optional[List[str]] = None
    materials_url: Optional[str] = None
    reference_links: Optional[str] = None
    reference_files_url: Optional[str] = None
    description: Optional[str] = None
    deadline_min: Optional[int] = None
    deadline_max: Optional[int] = None
    deadline_days: Optional[int] = None
    price: Optional[float] = None
    prepayment_percent: Optional[int] = None
    contact_info: Optional[str] = None
    status: str = "pending"
    created_at: datetime
    updated_at: Optional[datetime] = None

    @classmethod
    def from_orm(cls, obj):
        """Преобразует объект БД в ответ, парся service_categories из JSON"""
        import json
        data = {
            "id": obj.id,
            "user_id": obj.user_id,
            "customer_name": obj.customer_name,
            "customer_email": obj.customer_email,
            "order_type": obj.order_type or "know",
            "service_category": obj.service_category,
            "service_categories": None,
            "materials_url": obj.materials_url,
            "reference_links": obj.reference_links,
            "reference_files_url": obj.reference_files_url,
            "description": obj.description,
            "deadline_min": obj.deadline_min,
            "deadline_max": obj.deadline_max,
            "deadline_days": obj.deadline_days,
            "price": obj.price,
            "prepayment_percent": obj.prepayment_percent,
            "contact_info": obj.contact_info,
            "status": obj.status or "pending",
            "created_at": obj.created_at,
            "updated_at": obj.updated_at
        }
        
        # Парсим service_categories из JSON
        if obj.service_categories:
            try:
                data["service_categories"] = json.loads(obj.service_categories)
            except:
                data["service_categories"] = []
        elif obj.service_category:
            # Для обратной совместимости
            data["service_categories"] = [obj.service_category]
        
        return cls(**data)

    class Config:
        from_attributes = True

class OAuthSettingUpdate(BaseModel):
    """Схема для обновления настроек OAuth провайдера"""
    is_hidden: Optional[bool] = None
    is_disabled: Optional[bool] = None

class ServiceOrderResponseFull(BaseModel):
    """Схема ответа с полной информацией о заказе услуги"""
    id: int
    user_id: Optional[int]
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    order_type: str = "know"
    service_category: Optional[str] = None
    service_categories: Optional[List[str]] = None
    materials_url: Optional[str] = None
    reference_links: Optional[str] = None
    reference_files_url: Optional[str] = None
    description: Optional[str] = None
    deadline_min: Optional[int] = None
    deadline_max: Optional[int] = None
    deadline_days: Optional[int] = None
    price: Optional[float] = None
    prepayment_percent: Optional[int] = None
    contact_info: Optional[str] = None
    result_wav_url: Optional[str] = None
    result_mp3_url: Optional[str] = None
    result_zip_url: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_orm(cls, obj):
        """Преобразует объект БД в ответ, парся service_categories из JSON"""
        import json
        data = {
            "id": obj.id,
            "user_id": obj.user_id,
            "customer_name": obj.customer_name,
            "customer_email": obj.customer_email,
            "order_type": obj.order_type or "know",
            "service_category": obj.service_category,
            "service_categories": None,
            "materials_url": obj.materials_url,
            "reference_links": obj.reference_links,
            "reference_files_url": obj.reference_files_url,
            "description": obj.description,
            "deadline_min": obj.deadline_min,
            "deadline_max": obj.deadline_max,
            "deadline_days": obj.deadline_days,
            "price": obj.price,
            "prepayment_percent": obj.prepayment_percent,
            "contact_info": obj.contact_info,
            "result_wav_url": obj.result_wav_url,
            "result_mp3_url": obj.result_mp3_url,
            "result_zip_url": obj.result_zip_url,
            "status": obj.status,
            "created_at": obj.created_at,
            "updated_at": obj.updated_at
        }
        
        # Парсим service_categories из JSON
        if obj.service_categories:
            try:
                data["service_categories"] = json.loads(obj.service_categories)
            except:
                data["service_categories"] = []
        elif obj.service_category:
            # Для обратной совместимости
            data["service_categories"] = [obj.service_category]
        
        return cls(**data)

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
    
    if user_update.additional_contact is not None:
        current_user.additional_contact = user_update.additional_contact
    
    db.commit()
    db.refresh(current_user)
    return current_user

@app.put("/me/change-password")
def change_password(
    current_password: str = Form(...),
    new_password: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Изменение пароля пользователя"""
    # Проверяем текущий пароль
    if not verify_password(current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Неверный текущий пароль")
    
    # Проверяем длину нового пароля
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Пароль должен быть не менее 6 символов")
    
    # Устанавливаем новый пароль
    current_user.password_hash = get_password_hash(new_password)
    db.commit()
    db.refresh(current_user)
    
    return {"message": "Пароль успешно изменен"}

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
    # Сначала проверяем и скрываем одноразовые биты, которые уже куплены
    # Это нужно для случаев, когда биты были куплены до добавления логики скрытия
    exclusive_beats = db.query(Beat).filter(
        Beat.is_available == True,
        Beat.allow_multiple_purchases == False
    ).all()
    
    for beat in exclusive_beats:
        purchase_exists = db.query(Purchase).filter(Purchase.beat_id == beat.id).first()
        if purchase_exists:
            beat.is_available = False
    
    if exclusive_beats:
        db.commit()
    
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

@app.get("/beats/{beat_id}/purchases")
def get_beat_purchases(beat_id: int,
                      db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    """Получить типы покупок бита текущим пользователем"""
    beat = db.query(Beat).filter(Beat.id == beat_id).first()
    if not beat:
        raise HTTPException(status_code=404, detail="Beat not found")
    
    purchases = db.query(Purchase).filter(
        Purchase.user_id == current_user.id,
        Purchase.beat_id == beat_id
    ).all()
    
    return {
        "purchased_types": [p.purchase_type for p in purchases],
        "is_exclusive_beat": not getattr(beat, 'allow_multiple_purchases', False)
    }

@app.post("/beats/{beat_id}/purchase")
def purchase_beat(beat_id: int, 
                 purchase_type: str = Form("mp3"),  # 'wav', 'mp3', 'exclusive'
                 payment_success: Optional[str] = Form(None),  # 'true' если оплата успешна
                 db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    # Получаем бит
    beat = db.query(Beat).filter(Beat.id == beat_id).first()
    if not beat:
        raise HTTPException(status_code=404, detail="Beat not found")
    
    if not beat.is_available:
        raise HTTPException(status_code=400, detail="Beat is not available")
    
    # Проверяем тип покупки
    if purchase_type not in ['wav', 'mp3', 'exclusive']:
        raise HTTPException(status_code=400, detail="Invalid purchase type. Must be 'wav', 'mp3', or 'exclusive'")
    
    # Проверяем наличие соответствующего файла
    if purchase_type == 'wav' and not getattr(beat, 'wav_url', None):
        raise HTTPException(status_code=400, detail="WAV file not available for this beat")
    elif purchase_type == 'mp3' and not getattr(beat, 'mp3_url', None):
        raise HTTPException(status_code=400, detail="MP3 file not available for this beat")
    elif purchase_type == 'exclusive' and not getattr(beat, 'exclusive_url', None):
        raise HTTPException(status_code=400, detail="Exclusive file not available for this beat")
    
    # Проверяем доступность бита для покупки
    allow_multiple = getattr(beat, 'allow_multiple_purchases', False)
    
    if not allow_multiple:
        # Эксклюзивный бит - проверяем, не куплен ли уже
        existing_purchase = db.query(Purchase).filter(
            Purchase.user_id == current_user.id,
            Purchase.beat_id == beat_id
        ).first()
        
        if existing_purchase:
            raise HTTPException(status_code=400, detail="Beat already purchased. This is an exclusive beat.")
        
        # Проверяем, не куплен ли бит кем-то другим
        any_purchase = db.query(Purchase).filter(
            Purchase.beat_id == beat_id
        ).first()
        
        if any_purchase:
            # Если бит уже куплен, скрываем его из каталога (на случай если это не было сделано ранее)
            beat.is_available = False
            db.commit()
            db.refresh(beat)
            raise HTTPException(status_code=400, detail="Beat already purchased by another user. This is an exclusive beat.")
    else:
        # Множественные покупки разрешены - проверяем только, не купил ли этот пользователь уже этот тип
        existing_purchase = db.query(Purchase).filter(
            Purchase.user_id == current_user.id,
            Purchase.beat_id == beat_id,
            Purchase.purchase_type == purchase_type
        ).first()
        
        if existing_purchase:
            raise HTTPException(status_code=400, detail=f"You already purchased this beat as {purchase_type}")
    
    # Определяем цену в зависимости от типа покупки
    if purchase_type == 'mp3':
        actual_price = getattr(beat, 'price_mp3', None) or beat.price
    elif purchase_type == 'wav':
        actual_price = getattr(beat, 'price_wav', None) or beat.price
    elif purchase_type == 'exclusive':
        actual_price = getattr(beat, 'price_exclusive', None) or beat.price
    else:
        actual_price = beat.price
    
    # Если бит платный - проверяем успешность оплаты
    if actual_price > 0:
        if payment_success != 'true':
            raise HTTPException(status_code=400, detail="Payment required. Please complete payment first.")
    
    # Создаем покупку
    purchase = Purchase(
        user_id=current_user.id,
        beat_id=beat_id,
        price_paid=actual_price,  # Сохраняем реальную цену в зависимости от типа
        purchase_type=purchase_type
    )
    
    db.add(purchase)
    
    # Если бит эксклюзивный (одноразовый), делаем его недоступным
    if not allow_multiple:
        beat.is_available = False
        print(f"⚠️ Бит {beat_id} ({beat.title}) помечен как недоступный (одноразовый бит)")
    
    # Удаляем из корзины если там был
    db.query(cart_table).filter(
        cart_table.c.user_id == current_user.id,
        cart_table.c.beat_id == beat_id
    ).delete()
    
    db.commit()
    db.refresh(purchase)
    db.refresh(beat)  # Обновляем бит чтобы убедиться что изменения сохранены
    
    # Проверяем что бит действительно скрыт
    if not allow_multiple and beat.is_available:
        print(f"❌ ОШИБКА: Бит {beat_id} не был скрыт после покупки!")
    
    return {"message": f"Beat acquired successfully as {purchase_type}!", "purchase_id": purchase.id, "purchase_type": purchase_type}

@app.get("/beats/{beat_id}/download")
def download_beat_files(beat_id: int, 
                       purchase_type: Optional[str] = None,  # Если не указан, используем из покупки
                       db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    # Проверяем что пользователь купил этот бит
    purchase = db.query(Purchase).filter(
        Purchase.user_id == current_user.id,
        Purchase.beat_id == beat_id
    )
    
    # Если указан тип покупки, фильтруем по нему
    if purchase_type:
        purchase = purchase.filter(Purchase.purchase_type == purchase_type)
    
    purchase = purchase.first()
    
    if not purchase:
        raise HTTPException(status_code=403, detail="Beat not purchased")
    
    # Получаем бит
    beat = db.query(Beat).filter(Beat.id == beat_id).first()
    if not beat:
        raise HTTPException(status_code=404, detail="Beat not found")
    
    # Определяем путь к файлу в зависимости от типа покупки
    file_path = None
    filename = None
    media_type = 'application/octet-stream'
    
    purchase_type_to_use = purchase_type or purchase.purchase_type
    
    if purchase_type_to_use == 'wav' and beat.wav_url:
        file_path = beat.wav_url.lstrip('/')
        filename = f"{beat.title}.wav"
        media_type = 'audio/wav'
    elif purchase_type_to_use == 'mp3' and getattr(beat, 'mp3_url', None):
        file_path = beat.mp3_url.lstrip('/')
        filename = f"{beat.title}.mp3"
        media_type = 'audio/mpeg'
    elif purchase_type_to_use == 'exclusive' and getattr(beat, 'exclusive_url', None):
        file_path = beat.exclusive_url.lstrip('/')
        filename = f"{beat.title}_exclusive.zip"
        media_type = 'application/zip'
    elif beat.full_audio_url:
        # Fallback на старое поле для обратной совместимости
        file_path = beat.full_audio_url.lstrip('/')
        filename = f"{beat.title}_full.mp3"
        media_type = 'audio/mpeg'
    elif beat.project_files_url:
        # Fallback на архив с проектом
        file_path = beat.project_files_url.lstrip('/')
        filename = f"{beat.title}_project.zip"
        media_type = 'application/zip'
    
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    # Возвращаем файл для скачивания
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type=media_type
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
                    payment_success: Optional[str] = Form(None),  # 'true' если оплата успешна
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
    
    # Если курс платный - проверяем успешность оплаты
    if course.price > 0:
        if payment_success != 'true':
            raise HTTPException(status_code=400, detail="Payment required. Please complete payment first.")
    
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

class ProcessCartPaymentRequest(BaseModel):
    success: bool

@app.post("/payment/process-cart")
def process_cart_payment(
    request: ProcessCartPaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Обработка оплаты всех товаров из корзины"""
    if not request.success:
        raise HTTPException(status_code=400, detail="Payment was not successful")
    
    # Получаем все товары из корзины
    beats_in_cart = current_user.cart_items
    courses_in_cart = current_user.course_cart_items
    
    total_price = sum(beat.price for beat in beats_in_cart) + sum(course.price for course in courses_in_cart)
    
    if total_price == 0:
        raise HTTPException(status_code=400, detail="Cart is empty or contains only free items")
    
    # Покупаем все биты из корзины
    for beat in beats_in_cart:
        if beat.price > 0:
            # Проверяем, не куплен ли уже
            existing = db.query(Purchase).filter(
                Purchase.user_id == current_user.id,
                Purchase.beat_id == beat.id
            ).first()
            
            if not existing:
                purchase = Purchase(
                    user_id=current_user.id,
                    beat_id=beat.id,
                    price_paid=beat.price,
                    purchase_type="mp3"  # По умолчанию MP3
                )
                db.add(purchase)
    
    # Покупаем все курсы из корзины
    for course in courses_in_cart:
        if course.price > 0:
            # Проверяем, не куплен ли уже
            existing = db.query(CoursePurchase).filter(
                CoursePurchase.user_id == current_user.id,
                CoursePurchase.course_id == course.id
            ).first()
            
            if not existing:
                course_purchase = CoursePurchase(
                    user_id=current_user.id,
                    course_id=course.id,
                    price_paid=course.price
                )
                db.add(course_purchase)
    
    # Очищаем корзину
    db.query(cart_table).filter(cart_table.c.user_id == current_user.id).delete()
    db.query(course_cart_table).filter(course_cart_table.c.user_id == current_user.id).delete()
    
    db.commit()
    
    return {"message": "Cart payment processed successfully", "total_price": total_price}

# Заказы услуг
@app.post("/service-orders", response_model=ServiceOrderResponse)
def create_service_order(order: ServiceOrderCreate, 
                        db: Session = Depends(get_db),
                        current_user: Optional[User] = Depends(get_current_user_optional)):
    try:
        import json
        
        print(f"Creating service order: type={order.order_type}, user={current_user.username if current_user else 'anonymous'}")
        
        # Если пользователь авторизован, используем его данные
        # Если нет, используем переданные имя и email
        user_id = current_user.id if current_user else None
        
        # Для неавторизованных пользователей проверяем наличие имени и email
        if not current_user and order.order_type == "know" and (not order.customer_name or not order.customer_email):
            print("Error: Unauthenticated user must provide name and email")
            raise HTTPException(
                status_code=400,
                detail="Для неавторизованных пользователей необходимо указать имя и email"
            )
        
        # Преобразуем service_categories в JSON строку
        service_categories_json = None
        if order.service_categories:
            service_categories_json = json.dumps(order.service_categories, ensure_ascii=False)
        elif order.service_category:
            # Для обратной совместимости
            service_categories_json = json.dumps([order.service_category], ensure_ascii=False)
        
        print(f"Creating ServiceOrder: user_id={user_id}, order_type={order.order_type}, categories={service_categories_json}")
        
        service_order = ServiceOrder(
            user_id=user_id,
            customer_name=order.customer_name if not current_user else None,
            customer_email=order.customer_email if not current_user else None,
            order_type=order.order_type,
            service_category=order.service_category,  # Для обратной совместимости
            service_categories=service_categories_json,
            materials_url=order.materials_url,
            reference_links=order.reference_links,
            reference_files_url=order.reference_files_url,
            description=order.description,
            deadline_min=order.deadline_min,  # Для обратной совместимости
            deadline_max=order.deadline_max,  # Для обратной совместимости
            deadline_days=order.deadline_days,
            prepayment_percent=order.prepayment_percent,
            contact_info=order.contact_info
        )
        
        db.add(service_order)
        db.commit()
        db.refresh(service_order)
        
        print(f"Service order created successfully: id={service_order.id}")
        
        # Отправляем уведомление админу в Telegram
        if TELEGRAM_BOT_AVAILABLE:
            try:
                admin_chat_id = os.getenv("ADMIN_TELEGRAM_CHAT_ID")
                if admin_chat_id:
                    import json
                    categories = json.loads(service_categories_json) if service_categories_json else []
                    categories_text = ", ".join(categories) if categories else "Не указано"
                    
                    customer_info = ""
                    if current_user:
                        customer_info = f"👤 Пользователь: {current_user.username} ({current_user.email or 'без email'})"
                    else:
                        customer_info = f"👤 Гость: {order.customer_name or 'не указано'} ({order.customer_email or 'не указано'})"
                    
                    message = f"""🔔 <b>Новая заявка на заказ услуги</b>

📋 Заявка #{service_order.id}
{customer_info}
📂 Категории: {categories_text}
📅 Дедлайн: {order.deadline_days or 'не указан'} дней
💰 Предоплата: {order.prepayment_percent or 'не указано'}%
📝 Описание: {order.description[:200] if order.description else 'нет описания'}...

🔗 Проверьте заявку в админ-панели"""
                    
                    send_message(int(admin_chat_id), message)
                    print(f"Telegram notification sent to admin (chat_id={admin_chat_id})")
            except Exception as e:
                print(f"Error sending Telegram notification: {e}")
        
        return ServiceOrderResponse.from_orm(service_order)
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
        # Преобразуем каждый заказ через from_orm
        return [ServiceOrderResponse.from_orm(order) for order in orders]
    else:
        # Для неавторизованных возвращаем пустой список
        return []

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
    return ServiceOrderResponse.from_orm(order)

@app.post("/upload-materials")
async def upload_materials(
    file: UploadFile = File(...),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Загрузка материалов для заказа (доступна для неавторизованных)"""
    import uuid
    os.makedirs("static/materials", exist_ok=True)
    user_id = current_user.id if current_user else f"anon_{uuid.uuid4().hex[:8]}"
    filename = f"materials_{user_id}_{file.filename}"
    file_path = f"static/materials/{filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {"url": f"/static/materials/{filename}"}

@app.post("/upload-reference-files")
async def upload_reference_files(
    file: UploadFile = File(...),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Загрузка референсов для заказа (доступна для неавторизованных)"""
    import uuid
    os.makedirs("static/references", exist_ok=True)
    user_id = current_user.id if current_user else f"anon_{uuid.uuid4().hex[:8]}"
    filename = f"references_{user_id}_{file.filename}"
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

@app.get("/api/admin/revenue")
def get_revenue_stats(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Получение статистики доходов с фильтрацией по датам"""
    from datetime import datetime
    
    # Парсим даты, если указаны
    start_dt = None
    end_dt = None
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        except:
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            # Добавляем 23:59:59 к конечной дате
            end_dt = end_dt.replace(hour=23, minute=59, second=59)
        except:
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
            end_dt = end_dt.replace(hour=23, minute=59, second=59)
    
    # Запросы с фильтрацией по датам
    purchases_query = db.query(Purchase)
    course_purchases_query = db.query(CoursePurchase)
    orders_query = db.query(ServiceOrder).filter(ServiceOrder.status.in_(['paid', 'completed']))
    
    if start_dt:
        purchases_query = purchases_query.filter(Purchase.purchase_date >= start_dt)
        course_purchases_query = course_purchases_query.filter(CoursePurchase.purchase_date >= start_dt)
        orders_query = orders_query.filter(ServiceOrder.created_at >= start_dt)
    
    if end_dt:
        purchases_query = purchases_query.filter(Purchase.purchase_date <= end_dt)
        course_purchases_query = course_purchases_query.filter(CoursePurchase.purchase_date <= end_dt)
        orders_query = orders_query.filter(ServiceOrder.created_at <= end_dt)
    
    purchases = purchases_query.all()
    course_purchases = course_purchases_query.all()
    orders = orders_query.all()
    
    # Доходы по битам
    beat_revenue = sum(p.price_paid for p in purchases)
    beat_count = len(purchases)
    
    # Доходы по курсам
    course_revenue = sum(cp.price_paid for cp in course_purchases)
    course_count = len(course_purchases)
    
    # Доходы по заказам услуг
    order_revenue = sum(o.price for o in orders if o.price)
    order_count = len(orders)
    
    total_revenue = beat_revenue + course_revenue + order_revenue
    
    # Данные для графика (по дням)
    revenue_by_day = {}
    
    for purchase in purchases:
        day = purchase.purchase_date.date().isoformat()
        revenue_by_day[day] = revenue_by_day.get(day, 0) + purchase.price_paid
    
    for cp in course_purchases:
        day = cp.purchase_date.date().isoformat()
        revenue_by_day[day] = revenue_by_day.get(day, 0) + cp.price_paid
    
    for order in orders:
        if order.price:
            day = order.created_at.date().isoformat()
            revenue_by_day[day] = revenue_by_day.get(day, 0) + order.price
    
    return {
        "total_revenue": total_revenue,
        "beat_revenue": beat_revenue,
        "beat_count": beat_count,
        "course_revenue": course_revenue,
        "course_count": course_count,
        "order_revenue": order_revenue,
        "order_count": order_count,
        "revenue_by_day": revenue_by_day,
        "start_date": start_date,
        "end_date": end_date
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

@app.put("/api/admin/beats/{beat_id}/files")
async def replace_beat_files(
    beat_id: int,
    demo_file: UploadFile = File(None),
    wav_file: UploadFile = File(None),
    mp3_file: UploadFile = File(None),
    exclusive_file: UploadFile = File(None),
    cover_file: UploadFile = File(None),
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Замена файлов бита"""
    beat = db.query(Beat).filter(Beat.id == beat_id).first()
    if not beat:
        raise HTTPException(status_code=404, detail="Beat not found")
    
    try:
        # Заменяем демо файл
        if demo_file:
            # Удаляем старый файл
            if beat.demo_url:
                old_path = beat.demo_url.lstrip("/")
                if os.path.exists(old_path):
                    try:
                        os.remove(old_path)
                    except:
                        pass
            
            # Валидация и загрузка нового файла
            is_valid, error_msg = validate_file(demo_file, ALLOWED_AUDIO_TYPES, MAX_FILE_SIZE, "audio")
            if not is_valid:
                raise HTTPException(status_code=400, detail=error_msg)
            
            safe_filename = sanitize_filename(demo_file.filename or "")
            demo_filename = f"demo_{beat.id}_{uuid.uuid4().hex[:8]}_{safe_filename}"
            demo_path = f"static/demos/{demo_filename}"
            os.makedirs(os.path.dirname(demo_path), exist_ok=True)
            
            with open(demo_path, "wb") as buffer:
                shutil.copyfileobj(demo_file.file, buffer)
            
            beat.demo_url = f"/static/demos/{demo_filename}"
        
        # Заменяем WAV файл
        if wav_file:
            if beat.wav_url:
                old_path = beat.wav_url.lstrip("/")
                if os.path.exists(old_path):
                    try:
                        os.remove(old_path)
                    except:
                        pass
            
            is_valid, error_msg = validate_file(wav_file, ALLOWED_AUDIO_TYPES, MAX_FILE_SIZE, "audio")
            if not is_valid:
                raise HTTPException(status_code=400, detail=error_msg)
            
            safe_filename = sanitize_filename(wav_file.filename or "")
            wav_filename = f"wav_{beat.id}_{uuid.uuid4().hex[:8]}_{safe_filename}"
            wav_path = f"static/audio/{wav_filename}"
            os.makedirs(os.path.dirname(wav_path), exist_ok=True)
            
            with open(wav_path, "wb") as buffer:
                shutil.copyfileobj(wav_file.file, buffer)
            
            beat.wav_url = f"/static/audio/{wav_filename}"
        
        # Заменяем MP3 файл
        if mp3_file:
            if beat.mp3_url:
                old_path = beat.mp3_url.lstrip("/")
                if os.path.exists(old_path):
                    try:
                        os.remove(old_path)
                    except:
                        pass
            
            is_valid, error_msg = validate_file(mp3_file, ALLOWED_AUDIO_TYPES, MAX_FILE_SIZE, "audio")
            if not is_valid:
                raise HTTPException(status_code=400, detail=error_msg)
            
            safe_filename = sanitize_filename(mp3_file.filename or "")
            mp3_filename = f"mp3_{beat.id}_{uuid.uuid4().hex[:8]}_{safe_filename}"
            mp3_path = f"static/audio/{mp3_filename}"
            os.makedirs(os.path.dirname(mp3_path), exist_ok=True)
            
            with open(mp3_path, "wb") as buffer:
                shutil.copyfileobj(mp3_file.file, buffer)
            
            beat.mp3_url = f"/static/audio/{mp3_filename}"
        
        # Заменяем эксклюзивный файл
        if exclusive_file:
            if beat.exclusive_url:
                old_path = beat.exclusive_url.lstrip("/")
                if os.path.exists(old_path):
                    try:
                        os.remove(old_path)
                    except:
                        pass
            
            is_valid, error_msg = validate_file(exclusive_file, ALLOWED_ARCHIVE_TYPES, MAX_FILE_SIZE, "archive")
            if not is_valid:
                raise HTTPException(status_code=400, detail=error_msg)
            
            safe_filename = sanitize_filename(exclusive_file.filename or "")
            exclusive_filename = f"exclusive_{beat.id}_{uuid.uuid4().hex[:8]}_{safe_filename}"
            exclusive_path = f"static/audio/{exclusive_filename}"
            os.makedirs(os.path.dirname(exclusive_path), exist_ok=True)
            
            with open(exclusive_path, "wb") as buffer:
                shutil.copyfileobj(exclusive_file.file, buffer)
            
            beat.exclusive_url = f"/static/audio/{exclusive_filename}"
        
        # Заменяем обложку
        if cover_file:
            if beat.cover_url:
                old_path = beat.cover_url.lstrip("/")
                if os.path.exists(old_path):
                    try:
                        os.remove(old_path)
                    except:
                        pass
            
            is_valid, error_msg = validate_file(cover_file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE, "image")
            if not is_valid:
                raise HTTPException(status_code=400, detail=error_msg)
            
            safe_filename = sanitize_filename(cover_file.filename or "")
            cover_filename = f"cover_{beat.id}_{uuid.uuid4().hex[:8]}_{safe_filename}"
            cover_path = f"static/covers/{cover_filename}"
            os.makedirs(os.path.dirname(cover_path), exist_ok=True)
            
            with open(cover_path, "wb") as buffer:
                shutil.copyfileobj(cover_file.file, buffer)
            
            beat.cover_url = f"/static/covers/{cover_filename}"
        
        db.commit()
        db.refresh(beat)
        
        return {
            "message": "Files replaced successfully",
            "beat_id": beat.id,
            "demo_url": beat.demo_url,
            "wav_url": beat.wav_url,
            "mp3_url": beat.mp3_url,
            "exclusive_url": beat.exclusive_url,
            "cover_url": beat.cover_url
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error replacing files: {str(e)}")

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
    price_mp3: Optional[float] = Form(None),
    price_wav: Optional[float] = Form(None),
    price_exclusive: Optional[float] = Form(None),
    key: str = Form(None),
    description: str = Form(None),
    demo_file: UploadFile = File(...),
    wav_file: UploadFile = File(...),
    mp3_file: UploadFile = File(...),
    exclusive_file: UploadFile = File(...),
    cover_file: UploadFile = File(None),
    allow_multiple_purchases: str = Form("false"),
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    # Создаем новый бит
    allow_multiple = allow_multiple_purchases.lower() == 'true'
    beat = Beat(
        title=title,
        artist=artist,
        genre=genre,
        key=key,
        bpm=bpm,
        price=price,
        price_mp3=price_mp3,
        price_wav=price_wav,
        price_exclusive=price_exclusive,
        description=description,
        allow_multiple_purchases=allow_multiple
    )
    
    db.add(beat)
    db.commit()
    db.refresh(beat)
    
    try:
        # Загружаем демо файл локально
        if demo_file:
            is_valid, error_msg = validate_file(demo_file, ALLOWED_AUDIO_TYPES, MAX_FILE_SIZE, "audio")
            if not is_valid:
                raise HTTPException(status_code=400, detail=error_msg)
            
            safe_filename = sanitize_filename(demo_file.filename or "")
            demo_filename = f"demo_{beat.id}_{uuid.uuid4().hex[:8]}_{safe_filename}"
            demo_path = f"static/demos/{demo_filename}"
            os.makedirs(os.path.dirname(demo_path), exist_ok=True)
            
            with open(demo_path, "wb") as buffer:
                shutil.copyfileobj(demo_file.file, buffer)
            
            beat.demo_url = f"/static/demos/{demo_filename}"
            print(f"Demo saved locally: {demo_path}")
        
        # Загружаем WAV файл
        if wav_file:
            is_valid, error_msg = validate_file(wav_file, ALLOWED_AUDIO_TYPES, MAX_FILE_SIZE, "audio")
            if not is_valid:
                raise HTTPException(status_code=400, detail=error_msg)
            
            safe_filename = sanitize_filename(wav_file.filename or "")
            wav_filename = f"wav_{beat.id}_{uuid.uuid4().hex[:8]}_{safe_filename}"
            wav_path = f"static/audio/{wav_filename}"
            os.makedirs(os.path.dirname(wav_path), exist_ok=True)
            
            with open(wav_path, "wb") as buffer:
                shutil.copyfileobj(wav_file.file, buffer)
            
            beat.wav_url = f"/static/audio/{wav_filename}"
            print(f"WAV saved locally: {wav_path}")
        
        # Загружаем MP3 файл
        if mp3_file:
            is_valid, error_msg = validate_file(mp3_file, ALLOWED_AUDIO_TYPES, MAX_FILE_SIZE, "audio")
            if not is_valid:
                raise HTTPException(status_code=400, detail=error_msg)
            
            safe_filename = sanitize_filename(mp3_file.filename or "")
            mp3_filename = f"mp3_{beat.id}_{uuid.uuid4().hex[:8]}_{safe_filename}"
            mp3_path = f"static/audio/{mp3_filename}"
            os.makedirs(os.path.dirname(mp3_path), exist_ok=True)
            
            with open(mp3_path, "wb") as buffer:
                shutil.copyfileobj(mp3_file.file, buffer)
            
            beat.mp3_url = f"/static/audio/{mp3_filename}"
            print(f"MP3 saved locally: {mp3_path}")
        
        # Загружаем эксклюзивный ZIP файл
        if exclusive_file:
            is_valid, error_msg = validate_file(exclusive_file, ALLOWED_ARCHIVE_TYPES, MAX_FILE_SIZE, "archive")
            if not is_valid:
                raise HTTPException(status_code=400, detail=error_msg)
            
            safe_filename = sanitize_filename(exclusive_file.filename or "")
            exclusive_filename = f"exclusive_{beat.id}_{uuid.uuid4().hex[:8]}_{safe_filename}"
            exclusive_path = f"static/audio/{exclusive_filename}"
            os.makedirs(os.path.dirname(exclusive_path), exist_ok=True)
            
            with open(exclusive_path, "wb") as buffer:
                shutil.copyfileobj(exclusive_file.file, buffer)
            
            beat.exclusive_url = f"/static/audio/{exclusive_filename}"
            print(f"Exclusive ZIP saved locally: {exclusive_path}")
        
        # Загружаем обложку локально
        if cover_file:
            is_valid, error_msg = validate_file(cover_file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE, "image")
            if not is_valid:
                raise HTTPException(status_code=400, detail=error_msg)
            
            safe_filename = sanitize_filename(cover_file.filename or "")
            cover_filename = f"cover_{beat.id}_{uuid.uuid4().hex[:8]}_{safe_filename}"
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
            "wav_url": beat.wav_url,
            "mp3_url": beat.mp3_url,
            "exclusive_url": beat.exclusive_url,
            "cover_url": beat.cover_url,
            "allow_multiple_purchases": beat.allow_multiple_purchases
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
            is_valid, error_msg = validate_file(preview_video_file, ALLOWED_VIDEO_TYPES, MAX_FILE_SIZE, "video")
            if not is_valid:
                raise HTTPException(status_code=400, detail=error_msg)
            
            safe_filename = sanitize_filename(preview_video_file.filename or "")
            preview_filename = f"preview_{course.id}_{uuid.uuid4().hex[:8]}_{safe_filename}"
            preview_path = f"static/course_previews/{preview_filename}"
            
            with open(preview_path, "wb") as buffer:
                shutil.copyfileobj(preview_video_file.file, buffer)
            
            course.preview_video_url = f"/static/course_previews/{preview_filename}"
            print(f"Preview video saved locally: {preview_path}")
        
        # Загружаем полное видео локально
        if full_video_file:
            is_valid, error_msg = validate_file(full_video_file, ALLOWED_VIDEO_TYPES, MAX_FILE_SIZE, "video")
            if not is_valid:
                raise HTTPException(status_code=400, detail=error_msg)
            
            safe_filename = sanitize_filename(full_video_file.filename or "")
            full_filename = f"full_{course.id}_{uuid.uuid4().hex[:8]}_{safe_filename}"
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
    import json
    orders = db.query(ServiceOrder).all()
    
    result = []
    for order in orders:
        # Парсим service_categories из JSON
        service_categories = []
        if order.service_categories:
            try:
                service_categories = json.loads(order.service_categories)
            except:
                pass
        elif order.service_category:
            service_categories = [order.service_category]
        
        order_data = {
            "id": order.id,
            "user_id": order.user_id,
            "customer_name": order.customer_name,
            "customer_email": order.customer_email,
            "order_type": order.order_type or "know",
            "service_category": order.service_category,
            "service_categories": service_categories,
            "materials_url": order.materials_url,
            "reference_links": order.reference_links,
            "reference_files_url": order.reference_files_url,
            "description": order.description,
            "deadline_min": order.deadline_min,
            "deadline_max": order.deadline_max,
            "deadline_days": order.deadline_days,
            "price": order.price,
            "prepayment_percent": order.prepayment_percent,
            "status": order.status,
            "created_at": order.created_at,
            "updated_at": order.updated_at
        }
        
        # Добавляем данные пользователя, если заказ от авторизованного пользователя
        if order.user_id:
            user = db.query(User).filter(User.id == order.user_id).first()
            if user:
                order_data["user_email"] = user.email
                order_data["user_username"] = user.username
        
        result.append(order_data)
    
    return result

@app.put("/api/admin/service-orders/{order_id}")
def update_service_order_status(
    order_id: int,
    status: Optional[str] = Form(None),
    price: Optional[float] = Form(None),
    prepayment_percent: Optional[int] = Form(None),
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Обновление статуса, цены и процента предоплаты заявки на услугу"""
    order = db.query(ServiceOrder).filter(ServiceOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Service order not found")
    
    if status:
        if status not in ["pending", "confirmed", "paid", "in_progress", "completed", "cancelled"]:
            raise HTTPException(status_code=400, detail="Invalid status")
        order.status = status
    
    if price is not None:
        order.price = price
    
    if prepayment_percent is not None:
        if prepayment_percent not in [50, 100]:
            raise HTTPException(status_code=400, detail="prepayment_percent must be 50 or 100")
        order.prepayment_percent = prepayment_percent
    
    order.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(order)
    
    return {"message": "Order updated successfully", "order": ServiceOrderResponse.from_orm(order)}

@app.post("/api/admin/service-orders/{order_id}/upload-result")
async def upload_order_result_files(
    order_id: int,
    wav_file: UploadFile = File(None),
    mp3_file: UploadFile = File(None),
    zip_file: UploadFile = File(None),
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Загрузка файлов результата для заказа (можно заменить существующие)"""
    order = db.query(ServiceOrder).filter(ServiceOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    os.makedirs("static/order_results", exist_ok=True)
    
    # Загружаем WAV файл
    if wav_file:
        # Удаляем старый файл, если есть
        if order.result_wav_url and os.path.exists(f"static/{order.result_wav_url.lstrip('/')}"):
            try:
                os.remove(f"static/{order.result_wav_url.lstrip('/')}")
            except:
                pass
        
        wav_filename = f"result_wav_{order_id}_{uuid.uuid4().hex}_{wav_file.filename}"
        wav_path = f"static/order_results/{wav_filename}"
        with open(wav_path, "wb") as buffer:
            shutil.copyfileobj(wav_file.file, buffer)
        order.result_wav_url = f"/static/order_results/{wav_filename}"
    
    # Загружаем MP3 файл
    if mp3_file:
        # Удаляем старый файл, если есть
        if order.result_mp3_url and os.path.exists(f"static/{order.result_mp3_url.lstrip('/')}"):
            try:
                os.remove(f"static/{order.result_mp3_url.lstrip('/')}")
            except:
                pass
        
        mp3_filename = f"result_mp3_{order_id}_{uuid.uuid4().hex}_{mp3_file.filename}"
        mp3_path = f"static/order_results/{mp3_filename}"
        with open(mp3_path, "wb") as buffer:
            shutil.copyfileobj(mp3_file.file, buffer)
        order.result_mp3_url = f"/static/order_results/{mp3_filename}"
    
    # Загружаем ZIP файл
    if zip_file:
        # Удаляем старый файл, если есть
        if order.result_zip_url and os.path.exists(f"static/{order.result_zip_url.lstrip('/')}"):
            try:
                os.remove(f"static/{order.result_zip_url.lstrip('/')}")
            except:
                pass
        
        zip_filename = f"result_zip_{order_id}_{uuid.uuid4().hex}_{zip_file.filename}"
        zip_path = f"static/order_results/{zip_filename}"
        with open(zip_path, "wb") as buffer:
            shutil.copyfileobj(zip_file.file, buffer)
        order.result_zip_url = f"/static/order_results/{zip_filename}"
    
    order.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(order)
    
    return {
        "message": "Files uploaded successfully",
        "order": ServiceOrderResponse.from_orm(order)
    }

# OAuth Settings Management
@app.get("/api/admin/oauth-settings")
def get_oauth_settings(current_admin: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    """Получение всех настроек OAuth провайдеров"""
    settings = db.query(OAuthSettings).all()
    return [{"id": s.id, "provider": s.provider, "is_hidden": s.is_hidden, "is_disabled": s.is_disabled} for s in settings]

@app.put("/api/admin/oauth-settings/{provider}")
def update_oauth_setting(
    provider: str,
    update_data: OAuthSettingUpdate,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Обновление настройки OAuth провайдера"""
    setting = db.query(OAuthSettings).filter(OAuthSettings.provider == provider).first()
    if not setting:
        raise HTTPException(status_code=404, detail="OAuth provider not found")
    
    if update_data.is_hidden is not None:
        setting.is_hidden = update_data.is_hidden
    if update_data.is_disabled is not None:
        setting.is_disabled = update_data.is_disabled
    
    setting.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(setting)
    
    return {"message": "OAuth setting updated successfully", "setting": {"id": setting.id, "provider": setting.provider, "is_hidden": setting.is_hidden, "is_disabled": setting.is_disabled}}

@app.get("/oauth-settings")
def get_public_oauth_settings(db: Session = Depends(get_db)):
    """Получение настроек OAuth для публичного использования (без авторизации)"""
    settings = db.query(OAuthSettings).all()
    return {s.provider: {"is_hidden": s.is_hidden, "is_disabled": s.is_disabled} for s in settings}

# Error Logs Management
@app.get("/api/admin/errors")
def get_error_logs(
    error_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 100,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Получение логов ошибок для админа"""
    query = db.query(ErrorLog)
    
    # Фильтр по типу ошибки
    if error_type:
        query = query.filter(ErrorLog.error_type == error_type)
    
    # Фильтр по дате
    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(ErrorLog.created_at >= start_dt)
        except:
            pass
    
    if end_date:
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            # Добавляем один день, чтобы включить весь день
            end_dt = end_dt + timedelta(days=1)
            query = query.filter(ErrorLog.created_at < end_dt)
        except:
            pass
    
    # Сортировка по дате (новые сначала)
    query = query.order_by(ErrorLog.created_at.desc())
    
    # Лимит
    errors = query.limit(limit).all()
    
    return [{
        "id": e.id,
        "error_type": e.error_type,
        "error_message": e.error_message,
        "error_details": e.error_details,
        "endpoint": e.endpoint,
        "user_id": e.user_id,
        "ip_address": e.ip_address,
        "user_agent": e.user_agent,
        "created_at": e.created_at.isoformat() if e.created_at else None
    } for e in errors]

@app.get("/api/admin/errors/stats")
def get_error_stats(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Получение статистики ошибок для графика"""
    query = db.query(ErrorLog)
    
    # Фильтр по дате
    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(ErrorLog.created_at >= start_dt)
        except:
            pass
    
    if end_date:
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            end_dt = end_dt + timedelta(days=1)
            query = query.filter(ErrorLog.created_at < end_dt)
        except:
            pass
    
    errors = query.all()
    
    # Группируем по типу ошибки
    errors_by_type = {}
    errors_by_day = {}
    
    for error in errors:
        # По типам
        if error.error_type not in errors_by_type:
            errors_by_type[error.error_type] = 0
        errors_by_type[error.error_type] += 1
        
        # По дням
        day_key = error.created_at.strftime("%Y-%m-%d") if error.created_at else "unknown"
        if day_key not in errors_by_day:
            errors_by_day[day_key] = 0
        errors_by_day[day_key] += 1
    
    # Общее количество
    total_errors = len(errors)
    
    return {
        "total_errors": total_errors,
        "errors_by_type": errors_by_type,
        "errors_by_day": errors_by_day
    }

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

@app.put("/api/admin/courses/{course_id}/files")
async def replace_course_files(
    course_id: int,
    preview_video_file: UploadFile = File(None),
    full_video_file: UploadFile = File(None),
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Замена файлов курса"""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    try:
        # Заменяем превью видео
        if preview_video_file:
            # Удаляем старый файл
            if course.preview_video_url:
                old_path = course.preview_video_url.lstrip("/")
                if os.path.exists(old_path):
                    try:
                        os.remove(old_path)
                    except:
                        pass
            
            # Валидация и загрузка нового файла
            is_valid, error_msg = validate_file(preview_video_file, ALLOWED_VIDEO_TYPES, MAX_FILE_SIZE, "video")
            if not is_valid:
                raise HTTPException(status_code=400, detail=error_msg)
            
            safe_filename = sanitize_filename(preview_video_file.filename or "")
            preview_filename = f"preview_{course.id}_{uuid.uuid4().hex[:8]}_{safe_filename}"
            preview_path = f"static/course_previews/{preview_filename}"
            os.makedirs(os.path.dirname(preview_path), exist_ok=True)
            
            with open(preview_path, "wb") as buffer:
                shutil.copyfileobj(preview_video_file.file, buffer)
            
            course.preview_video_url = f"/static/course_previews/{preview_filename}"
        
        # Заменяем полное видео
        if full_video_file:
            if course.full_video_url:
                old_path = course.full_video_url.lstrip("/")
                if os.path.exists(old_path):
                    try:
                        os.remove(old_path)
                    except:
                        pass
            
            is_valid, error_msg = validate_file(full_video_file, ALLOWED_VIDEO_TYPES, MAX_FILE_SIZE, "video")
            if not is_valid:
                raise HTTPException(status_code=400, detail=error_msg)
            
            safe_filename = sanitize_filename(full_video_file.filename or "")
            full_filename = f"full_{course.id}_{uuid.uuid4().hex[:8]}_{safe_filename}"
            full_path = f"static/course_videos/{full_filename}"
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            
            with open(full_path, "wb") as buffer:
                shutil.copyfileobj(full_video_file.file, buffer)
            
            course.full_video_url = f"/static/course_videos/{full_filename}"
        
        db.commit()
        db.refresh(course)
        
        return {
            "message": "Files replaced successfully",
            "course_id": course.id,
            "preview_video_url": course.preview_video_url,
            "full_video_url": course.full_video_url
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error replacing files: {str(e)}")

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
    # НЕ блокируем маршруты фронтенда (login, register, etc.) - они обрабатываются React Router
    if (path.startswith("api/") or 
        path.startswith("static/") or 
        path.startswith("beats/") or 
        path.startswith("favicon.ico") or
        path.startswith("assets/") or
        path.endswith(".js") or
        path.endswith(".css") or
        path.endswith(".png") or
        path.endswith(".jpg") or
        path.endswith(".jpeg") or
        path.endswith(".gif") or
        path.endswith(".svg") or
        path.endswith(".webp") or
        path.endswith(".ico") or
        path.endswith(".woff") or
        path.endswith(".woff2") or
        path.endswith(".ttf") or
        path.endswith(".eot")):
        raise HTTPException(status_code=404, detail="Not found")
    
    # Для всех остальных маршрутов (включая login, register, etc.) отдаем index.html
    # React Router обработает маршрутизацию на клиенте
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

# Заполнение тестовыми данными
print("=" * 50)
print("ПРОВЕРКА ТЕСТОВЫХ ДАННЫХ...")
print("=" * 50)
try:
    from seed_test_data import seed_test_data
    seed_test_data()
except Exception as e:
    print(f"⚠️  Ошибка при заполнении тестовыми данными: {e}")
    import traceback
    traceback.print_exc()

# Запуск Telegram бота в фоновом потоке
# Telegram bot будет запущен в startup event для более быстрого старта сервера
print("=" * 50)
print("Приложение готово к работе!")
print("=" * 50)
print("КОНЕЦ ЗАГРУЗКИ МОДУЛЯ main.py")
print("=" * 50)

# Startup event для запуска Telegram бота после старта сервера
@app.on_event("startup")
async def startup_event():
    """Запускает Telegram бота после старта сервера"""
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

if __name__ == "__main__":
    import uvicorn
    print("Запуск сервера на http://0.0.0.0:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")