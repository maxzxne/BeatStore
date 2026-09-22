"""
Backend API для XWinner.beats.please - платформы продажи музыкальных битов

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
from fastapi.responses import FileResponse, PlainTextResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr
from typing import Any, List, Optional
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
import shutil
import os
import sys
import re
import uuid
import json
from pathlib import Path

print("Импорт database и models...")
from database import SessionLocal, engine
from models import Base, User, Beat, Purchase, Course, CoursePurchase, ServiceOrder, OAuthSettings, SiteSetting, PromoBanner, PromoCode, SaleCampaign, FooterPage, ErrorLog, PaymentIntent, SupportThread, SupportMessage, Contributor, AdOrder, cart_table, course_cart_table, course_favorites_table, favorites_table
from footer_pages import (
    ensure_default_footer_pages,
    footer_page_public_detail,
    footer_page_to_dict,
    normalize_slug,
    validate_slug,
)
from footer_templates_loader import default_body_for_slug
from payments import config as payment_config
from payments.fulfill import fulfill_intent, mark_failed
import media_access
from payments.discounts import DISCOUNT_KINDS, SALE_SCOPES, pick_best_sale
from payments.pricing import generate_promo_code, load_active_sales, overlay_sale_on_mapping
from payments.quote import payload_dict, service_order_amount, service_order_full_price, service_order_queue
from payments.robokassa import format_out_sum, verify_result
from payments.service import (
    PaymentError,
    create_checkout,
    intent_view,
    preview_checkout,
    public_config as payment_public_config,
)
from cart_rules import drop_owned_cart_items, user_owns_beat, user_owns_course
from submit_rules import STORE_BENEFICIARY_NAME
from contacts import parse_contacts, serialize_contacts
from totp_auth import (
    generate_backup_codes,
    generate_totp_secret,
    provisioning_uri,
    qr_svg_data_url,
    serialize_backup_hashes,
    verify_user_second_factor,
)
from smartcaptcha import (
    captcha_client_key,
    captcha_keys_configured,
    is_testing as captcha_is_testing,
    verify_smartcaptcha_token,
)
print("Импорт database и models завершен")

# Импорт функций отправки сообщений и файлов в Telegram
try:
    from telegram_bot import send_message, send_document, send_audio
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
                'result_zip_url': 'VARCHAR',
                'consent_personal_data': 'BOOLEAN DEFAULT 1',
                'consent_personal_data_at': 'DATETIME',
                'consent_personal_data_version': 'VARCHAR',
                'consent_ip': 'VARCHAR',
                'admin_note': 'TEXT'
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
                'price_exclusive': 'FLOAT',
                'beneficiary_id': 'INTEGER',
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
            
            # Колонки согласия на обработку персональных данных
            user_new_columns = {
                'consent_personal_data': 'BOOLEAN DEFAULT 1',
                'consent_personal_data_at': 'DATETIME',
                'consent_personal_data_version': 'VARCHAR',
                'totp_secret': 'VARCHAR',
                'totp_enabled': 'BOOLEAN DEFAULT 0',
                'totp_backup_codes': 'TEXT',
            }
            for col_name, col_type in user_new_columns.items():
                if col_name not in columns:
                    print(f"Добавление колонки {col_name} в users...")
                    with engine.connect() as conn:
                        conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
                        conn.commit()
                    print(f"Колонка {col_name} добавлена")
        
        if 'contributors' in inspector.get_table_names():
            contributor_columns = [col['name'] for col in inspector.get_columns('contributors')]
            if 'quota_reset_at' not in contributor_columns:
                print("Добавление колонки quota_reset_at в contributors...")
                with engine.connect() as conn:
                    conn.execute(text("ALTER TABLE contributors ADD COLUMN quota_reset_at DATETIME"))
                    conn.commit()
                print("Колонка quota_reset_at добавлена")
        
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

        # Настройки сайта (видимость разделов)
        if 'site_settings' not in inspector.get_table_names():
            print("Создание таблицы site_settings...")
            Base.metadata.create_all(bind=engine)

        db = SessionLocal()
        try:
            courses_visibility = db.query(SiteSetting).filter(SiteSetting.key == "courses_visibility").first()
            if not courses_visibility:
                db.add(SiteSetting(key="courses_visibility", value="all"))
                db.commit()
                print("Настройка courses_visibility создана (all)")

            ads_orders = db.query(SiteSetting).filter(SiteSetting.key == "ads_orders_enabled").first()
            if not ads_orders:
                db.add(SiteSetting(key="ads_orders_enabled", value="true"))
                db.commit()
                print("Настройка ads_orders_enabled создана (true)")

            if not db.query(SiteSetting).filter(SiteSetting.key == "totp_enabled").first():
                db.add(SiteSetting(key="totp_enabled", value="false"))
                db.commit()
                print("Настройка totp_enabled создана (false)")

            if not db.query(SiteSetting).filter(SiteSetting.key == "captcha_enabled").first():
                db.add(SiteSetting(key="captcha_enabled", value="false"))
                db.commit()
                print("Настройка captcha_enabled создана (false)")

            home_hero = db.query(SiteSetting).filter(SiteSetting.key == "home_hero").first()
            if not home_hero:
                default_hero = {
                    "enabled": True,
                    "eyebrow": "XWinner",
                    "title": "Инструменталы.\nЧёрный экран.\nЗелёный удар.",
                    "subtitle": "Каталог битов, заказы под ключ и курсы по битмейкингу. Слушай демо, бери лицензию, работай дальше.",
                    "image_url": None,
                    "image_position": "left",
                    "cta_label": None,
                    "cta_href": None,
                    "show_search": True,
                    "show_filters": True,
                    "search_placeholder": "Поиск по названию, артисту, жанру",
                }
                db.add(SiteSetting(key="home_hero", value=json.dumps(default_hero, ensure_ascii=False)))
                db.commit()
                print("Настройка home_hero создана (default)")
        except Exception as e:
            print(f"Ошибка создания site_settings: {e}")
            db.rollback()
        finally:
            db.close()

        # Промо-баннеры / footer CMS (таблицы через create_all ниже)
        if 'promo_banners' not in inspector.get_table_names():
            print("Создание таблицы promo_banners...")
        if 'footer_pages' not in inspector.get_table_names():
            print("Создание таблицы footer_pages...")
        
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

try:
    _footer_db = SessionLocal()
    try:
        ensure_default_footer_pages(_footer_db)
    finally:
        _footer_db.close()
except Exception as e:
    print(f"Ошибка сида footer_pages: {e}")

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
                    email="admin@XWinner.beats.please.com",
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
app = FastAPI(title="XWinner.beats.please API", description="API для платформы продажи музыкальных битов")
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

FRONTEND_INDEX = "static/frontend/index.html"
# Страницы SPA, которые совпадают с GET API. Браузер (Accept: text/html) должен
# получить index.html, axios (Accept: application/json) — JSON.
SPA_HTML_PATHS = {"/courses", "/favorites", "/cart", "/purchases"}


def wants_browser_document(request: Request) -> bool:
    accept = (request.headers.get("accept") or "").lower()
    html_pos = accept.find("text/html")
    if html_pos == -1:
        return False
    json_pos = accept.find("application/json")
    return json_pos == -1 or html_pos < json_pos


def _gate_db_get(key: str, default: str = "") -> str:
    try:
        db = SessionLocal()
        try:
            return get_site_setting_value(db, key, default)
        finally:
            db.close()
    except Exception:
        return default


@app.middleware("http")
async def spa_over_colliding_api(request: Request, call_next):
    if request.method in ("GET", "HEAD"):
        path = request.url.path.rstrip("/") or "/"
        if path in SPA_HTML_PATHS and wants_browser_document(request):
            if os.path.exists(FRONTEND_INDEX):
                return FileResponse(FRONTEND_INDEX, media_type="text/html")
    return await call_next(request)

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

# Outermost gate: Basic Auth + maintenance (must run before SPA / logging shortcuts)
@app.middleware("http")
async def site_gate_middleware(request: Request, call_next):
    """HTTP Basic Auth + maintenance wall (pre-launch / outage)."""
    import hmac as hmac_mod

    from fastapi.responses import HTMLResponse, JSONResponse, Response
    from site_gate import (
        GATE_ALLOW_PREFIXES,
        MAINTENANCE_ALLOW_PREFIXES,
        parse_basic_auth_header,
        path_allowed,
        resolve_gate_config,
        status_page_html,
        verify_gate_password,
    )

    if request.method == "OPTIONS":
        return await call_next(request)

    path = request.url.path or "/"
    cfg = resolve_gate_config(_gate_db_get)

    if cfg["http_basic_enabled"] and not path_allowed(path, GATE_ALLOW_PREFIXES):
        user, password = parse_basic_auth_header(request.headers.get("authorization"))
        ok = False
        if user is not None:
            ok = hmac_mod.compare_digest(user, cfg["http_basic_user"]) and verify_gate_password(
                password or "", cfg
            )
        if not ok:
            return Response(
                content="Authentication required",
                status_code=401,
                headers={"WWW-Authenticate": 'Basic realm="XWinner", charset="UTF-8"'},
                media_type="text/plain",
            )

    if cfg["maintenance_mode"] and not path_allowed(path, MAINTENANCE_ALLOW_PREFIXES):
        accept = (request.headers.get("accept") or "").lower()
        wants_json = "application/json" in accept and "text/html" not in accept
        if wants_json or request.method not in ("GET", "HEAD"):
            return JSONResponse(
                status_code=503,
                content={"detail": "Сайт временно недоступен", "code": "maintenance"},
                headers={"Retry-After": "3600"},
            )
        html = status_page_html(
            kind="maintenance",
            title=cfg.get("maintenance_title") or None,
            message=cfg.get("maintenance_message") or None,
        )
        return HTMLResponse(content=html, status_code=503, headers={"Retry-After": "3600"})

    return await call_next(request)

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

def serve_audio_with_range(file_path: str, request: Request, media_type: str = "audio/mpeg"):
    """Обслуживает медиафайл с поддержкой Range запросов"""
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Файл не найден")
    
    file_size = os.path.getsize(file_path)
    range_header = request.headers.get('range')
    
    if not range_header:
        return FileResponse(file_path, media_type=media_type)
    
    start, end = parse_range_header(range_header, file_size)
    if start is None or end is None:
        return FileResponse(file_path, media_type=media_type)
    
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
        'Content-Type': media_type,
    }
    
    return StreamingResponse(
        iterfile(),
        status_code=206,
        headers=headers
    )


def _bearer_user_from_request(request: Request, db: Session) -> Optional[User]:
    """Parse Authorization Bearer without Depends (routes registered before get_db)."""
    header = request.headers.get("authorization") or request.headers.get("Authorization")
    if not header or not header.lower().startswith("bearer "):
        return None
    token = header.split(" ", 1)[1].strip()
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if not username or payload.get("type") == "2fa_pending":
            return None
        user = db.query(User).filter(User.username == username).first()
        if user is None or not user.is_active:
            return None
        return user
    except JWTError:
        return None


def _authorize_paid_static(
    request: Request,
    *,
    filename: str,
    kind: str,
    access: Optional[str] = None,
    url_prefix: Optional[str] = None,
):
    """Gate paid static deliverables. Returns (db, safe_name) or raises."""
    try:
        safe = media_access.safe_filename(filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if url_prefix:
        prefix = url_prefix.rstrip("/")
    else:
        prefix = "/static/audio" if kind == "audio" else "/static/course_videos"
    expected_path = f"{prefix}/{safe}"

    db = SessionLocal()
    try:
        bearer = _bearer_user_from_request(request, db)
        try:
            user = media_access.resolve_user_from_access(
                db,
                access_token=access,
                bearer_user=bearer,
                expected_path=expected_path,
            )
        except ValueError as exc:
            raise HTTPException(status_code=401, detail=str(exc)) from exc

        if user is None:
            raise HTTPException(status_code=401, detail="Требуется авторизация")

        if kind == "audio":
            beat = media_access.find_beat_by_audio_filename(db, safe)
            if beat is None:
                if not getattr(user, "is_admin", False):
                    raise HTTPException(status_code=403, detail="Нет доступа к файлу")
            elif not media_access.user_may_access_beat_file(db, user, beat, safe):
                raise HTTPException(status_code=403, detail="Нет доступа к файлу")
        else:
            course = media_access.find_course_by_video_filename(db, safe)
            if course is None:
                if not getattr(user, "is_admin", False):
                    raise HTTPException(status_code=403, detail="Нет доступа к файлу")
            elif not media_access.user_may_access_course_file(db, user, course, safe):
                raise HTTPException(status_code=403, detail="Нет доступа к файлу")

        return db, safe
    except HTTPException:
        db.close()
        raise
    except Exception:
        db.close()
        raise


# Эндпоинт для аудио файлов с поддержкой Range
@app.get("/static/demos/{filename}")
async def serve_demo_audio(filename: str, request: Request):
    """Обслуживает демо аудио файлы с поддержкой Range запросов"""
    try:
        safe = media_access.safe_filename(filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    file_path = f"static/demos/{safe}"
    return serve_audio_with_range(file_path, request)


@app.get("/static/audio/{filename}")
async def serve_full_audio(filename: str, request: Request, access: Optional[str] = None):
    """Полные аудио файлы — только покупатель / админ (Bearer или ?access=)."""
    db, safe = _authorize_paid_static(
        request, filename=filename, kind="audio", access=access, url_prefix="/static/audio"
    )
    try:
        file_path = f"static/audio/{safe}"
        return serve_audio_with_range(file_path, request, media_type="audio/mpeg")
    finally:
        db.close()


@app.get("/static/test_files/{filename}")
async def serve_legacy_test_files(filename: str, request: Request, access: Optional[str] = None):
    """Legacy paid deliverables (wav/exclusive from old seeds) — same ACL as /static/audio."""
    db, safe = _authorize_paid_static(
        request,
        filename=filename,
        kind="audio",
        access=access,
        url_prefix="/static/test_files",
    )
    try:
        file_path = f"static/test_files/{safe}"
        # zip/wav/mp3 — sniff by extension for content-type
        lower = safe.lower()
        if lower.endswith(".wav"):
            media_type = "audio/wav"
        elif lower.endswith(".zip"):
            media_type = "application/zip"
        else:
            media_type = "audio/mpeg"
        return serve_audio_with_range(file_path, request, media_type=media_type)
    finally:
        db.close()


@app.get("/static/course_previews/{filename}")
async def serve_course_preview(filename: str, request: Request):
    """Обслуживает превью видео курсов"""
    try:
        safe = media_access.safe_filename(filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    file_path = f"static/course_previews/{safe}"
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Файл не найден")
    return serve_audio_with_range(file_path, request, media_type="video/mp4")


@app.get("/static/course_videos/{filename}")
async def serve_course_video(filename: str, request: Request, access: Optional[str] = None):
    """Полные видео курсов — только покупатель / админ (Bearer или ?access=)."""
    db, safe = _authorize_paid_static(
        request, filename=filename, kind="video", access=access
    )
    try:
        file_path = f"static/course_videos/{safe}"
        return serve_audio_with_range(file_path, request, media_type="video/mp4")
    finally:
        db.close()


# Статические файлы для остальных типов (обложки и т.д.).
# Paid dirs are intercepted by explicit routes above — mount must not bypass them.
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
    captcha_token: Optional[str] = None

class UserLogin(BaseModel):
    """Схема для входа пользователя в систему"""
    username: str
    password: str
    captcha_token: Optional[str] = None

class Token(BaseModel):
    """Схема JWT токена"""
    access_token: str
    token_type: str

class LoginResponse(BaseModel):
    """Логин: либо JWT, либо шаг 2FA."""
    access_token: Optional[str] = None
    token_type: str = "bearer"
    requires_2fa: bool = False
    temp_token: Optional[str] = None

class TwoFactorConfirm(BaseModel):
    code: str

class TwoFactorDisable(BaseModel):
    password: str
    code: str

class TwoFactorLogin(BaseModel):
    temp_token: str
    code: str
    as_admin: bool = False

class ContactItem(BaseModel):
    type: str
    value: str


class UserResponse(BaseModel):
    """Схема ответа с информацией о пользователе"""
    id: int
    email: Optional[str] = None
    username: str
    is_active: bool
    is_admin: bool
    additional_contact: Optional[str] = None
    contacts: List[ContactItem] = []
    created_at: datetime
    consent_personal_data: Optional[bool] = None
    consent_personal_data_at: Optional[datetime] = None
    consent_personal_data_version: Optional[str] = None
    has_password: bool = False
    is_contributor: bool = False
    contributor_id: Optional[int] = None
    totp_enabled: bool = False

    class Config:
        from_attributes = True


def user_to_response(user: User, db: Optional[Session] = None) -> UserResponse:
    contributor = None
    if db is not None:
        contributor = (
            db.query(Contributor)
            .filter(Contributor.user_id == user.id, Contributor.is_active == True)
            .first()
        )
    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        is_active=bool(user.is_active),
        is_admin=bool(user.is_admin),
        additional_contact=user.additional_contact,
        contacts=parse_contacts(user.additional_contact),
        created_at=user.created_at,
        consent_personal_data=user.consent_personal_data,
        consent_personal_data_at=user.consent_personal_data_at,
        consent_personal_data_version=user.consent_personal_data_version,
        has_password=bool(user.password_hash),
        is_contributor=bool(contributor),
        contributor_id=contributor.id if contributor else None,
        totp_enabled=bool(getattr(user, "totp_enabled", False)),
    )


class UserUpdate(BaseModel):
    """Схема для обновления пользователя"""
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    additional_contact: Optional[str] = None
    contacts: Optional[List[ContactItem]] = None


class UserDeleteRequest(BaseModel):
    password: Optional[str] = None
    confirmation: Optional[str] = None

class SupportMessageCreate(BaseModel):
    body: str

SUPPORT_MESSAGE_MAX_LEN = 2000

class BeatResponse(BaseModel):
    """Схема ответа с информацией о бите (базовая)"""
    id: int
    title: str
    artist: str
    genre: str
    key: Optional[str]
    bpm: int
    price: float
    price_was: Optional[float] = None
    price_mp3: Optional[float] = None
    price_wav: Optional[float] = None
    price_exclusive: Optional[float] = None
    price_mp3_was: Optional[float] = None
    price_wav_was: Optional[float] = None
    price_exclusive_was: Optional[float] = None
    description: Optional[str]
    demo_url: Optional[str]
    cover_url: Optional[str]
    is_available: bool
    allow_multiple_purchases: bool = False
    created_at: datetime
    is_favorite: Optional[bool] = False
    is_in_cart: Optional[bool] = False

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
    price_was: Optional[float] = None
    preview_video_url: Optional[str]
    is_available: bool
    created_at: datetime
    is_favorite: Optional[bool] = False
    is_in_cart: Optional[bool] = False
    is_purchased: Optional[bool] = False

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
    consent_personal_data: Optional[bool] = None
    consent_personal_data_at: Optional[datetime] = None
    consent_personal_data_version: Optional[str] = None
    consent_ip: Optional[str] = None

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
            "updated_at": obj.updated_at,
            "consent_personal_data": getattr(obj, "consent_personal_data", None),
            "consent_personal_data_at": getattr(obj, "consent_personal_data_at", None),
            "consent_personal_data_version": getattr(obj, "consent_personal_data_version", None),
            "consent_ip": getattr(obj, "consent_ip", None),
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

# all — всем; admins_only — только админам; hidden — никому (вкладка скрыта)
COURSES_VISIBILITY_VALUES = {"all", "admins_only", "hidden"}

HERO_IMAGE_POSITIONS = {"left", "right", "top", "bottom"}

DEFAULT_HOME_HERO = {
    "enabled": True,
    "eyebrow": "XWinner",
    "title": "Инструменталы.\nЧёрный экран.\nЗелёный удар.",
    "subtitle": "Каталог битов, заказы под ключ и курсы по битмейкингу. Слушай демо, бери лицензию, работай дальше.",
    "image_url": None,
    "image_position": "left",
    "cta_label": None,
    "cta_href": None,
    "show_search": True,
    "show_filters": True,
    "search_placeholder": "Поиск по названию, артисту, жанру",
}


def normalize_hero_image_position(value) -> str:
    if value in HERO_IMAGE_POSITIONS:
        return value
    return "left"


def normalize_search_placeholder(value) -> str:
    text = str(value or "").strip()
    return text or DEFAULT_HOME_HERO["search_placeholder"]

DEFAULT_ADS_PRICES = {
    "3": 5000,
    "7": 10000,
    "14": 18000,
    "28": 30000,
}

DEFAULT_ADS_PRICE_PER_DAY = 1000.0


class SiteSettingsUpdate(BaseModel):
    """Схема обновления настроек сайта"""
    courses_visibility: Optional[str] = None
    ads_orders_enabled: Optional[bool] = None
    totp_enabled: Optional[bool] = None
    captcha_enabled: Optional[bool] = None
    promo_banners_fullscreen: Optional[bool] = None
    ads_prices: Optional[dict] = None
    ads_price_per_day: Optional[float] = None
    service_order_pricing: Optional[dict] = None
    maintenance_mode: Optional[bool] = None
    maintenance_title: Optional[str] = None
    maintenance_message: Optional[str] = None
    http_basic_enabled: Optional[bool] = None
    http_basic_user: Optional[str] = None
    http_basic_password: Optional[str] = None  # plaintext once; stored as hash

class HomeHeroUpdate(BaseModel):
    """Схема обновления hero главной"""
    enabled: Optional[bool] = None
    eyebrow: Optional[str] = None
    title: Optional[str] = None
    subtitle: Optional[str] = None
    image_url: Optional[str] = None
    image_position: Optional[str] = None
    cta_label: Optional[str] = None
    cta_href: Optional[str] = None
    show_search: Optional[bool] = None
    show_filters: Optional[bool] = None
    search_placeholder: Optional[str] = None

class AdminGuideNotesUpdate(BaseModel):
    """Личные заметки админа к инструкции (персист в site_settings)."""
    notes: str = ""

class PromoBannerCreate(BaseModel):
    """Схема создания промо-баннера"""
    title: Optional[str] = None
    body: Optional[str] = None
    image_url: Optional[str] = None
    link_url: Optional[str] = None
    sort_order: int = 0
    enabled: bool = True
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None

class PromoBannerUpdate(BaseModel):
    """Схема обновления промо-баннера"""
    title: Optional[str] = None
    body: Optional[str] = None
    image_url: Optional[str] = None
    link_url: Optional[str] = None
    sort_order: Optional[int] = None
    enabled: Optional[bool] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None


class AdOrderCreate(BaseModel):
    image_url: str
    link_url: str
    days: int
    caption: Optional[str] = None
    contact_info: Optional[str] = None


class AdOrderAdminUpdate(BaseModel):
    image_url: Optional[str] = None
    link_url: Optional[str] = None
    caption: Optional[str] = None
    days: Optional[int] = None
    price: Optional[float] = None
    admin_note: Optional[str] = None


class AdOrderApproveBody(BaseModel):
    price: Optional[float] = None


class AdOrderRejectBody(BaseModel):
    reason: Optional[str] = None


class SaleCampaignCreate(BaseModel):
    title: Optional[str] = None
    scope: str = "all"
    kind: str = "percent"
    value: float
    enabled: bool = True
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None


class SaleCampaignUpdate(BaseModel):
    title: Optional[str] = None
    scope: Optional[str] = None
    kind: Optional[str] = None
    value: Optional[float] = None
    enabled: Optional[bool] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None


class PromoCodeCreate(BaseModel):
    username: str
    kind: str = "percent"
    value: float
    code: Optional[str] = None
    note: Optional[str] = None


class FooterPageCreate(BaseModel):
    slug: str
    label: str
    title: Optional[str] = None
    body: Optional[str] = ""
    enabled: bool = True
    sort_order: Optional[int] = None


class FooterPageUpdate(BaseModel):
    label: Optional[str] = None
    title: Optional[str] = None
    body: Optional[str] = None
    enabled: Optional[bool] = None
    show_icon: Optional[bool] = None


class FooterPageReorder(BaseModel):
    ids: List[int]


def get_site_setting_value(db: Session, key: str, default: str = "") -> str:
    setting = db.query(SiteSetting).filter(SiteSetting.key == key).first()
    return setting.value if setting else default

def parse_bool_setting(value, default: bool = True) -> bool:
    if value is None:
        return default
    text = str(value).strip()
    if not text:
        return default
    return text.lower() not in {"0", "false", "off", "no"}

def upsert_site_setting(db: Session, key: str, value: str):
    setting = db.query(SiteSetting).filter(SiteSetting.key == key).first()
    if not setting:
        db.add(SiteSetting(key=key, value=value))
    else:
        setting.value = value
        setting.updated_at = datetime.utcnow()
    db.commit()

def get_courses_visibility(db: Session) -> str:
    value = get_site_setting_value(db, "courses_visibility", "all")
    return value if value in COURSES_VISIBILITY_VALUES else "all"

def get_ads_orders_enabled(db: Session) -> bool:
    return parse_bool_setting(get_site_setting_value(db, "ads_orders_enabled", "true"), True)

def get_totp_enabled(db: Session) -> bool:
    return parse_bool_setting(get_site_setting_value(db, "totp_enabled", "false"), False)

def get_captcha_enabled(db: Session) -> bool:
    return parse_bool_setting(get_site_setting_value(db, "captcha_enabled", "false"), False)

def get_promo_banners_fullscreen(db: Session) -> bool:
    """Full-bleed promo slider (default). False = compact peek of next slide."""
    return parse_bool_setting(get_site_setting_value(db, "promo_banners_fullscreen", "true"), True)

def normalize_ads_prices(raw) -> dict:
    out = dict(DEFAULT_ADS_PRICES)
    if not isinstance(raw, dict):
        return out
    for key in DEFAULT_ADS_PRICES.keys():
        value = raw.get(key)
        if value is None and key.isdigit():
            value = raw.get(int(key))
        try:
            n = float(value)
        except (TypeError, ValueError):
            continue
        if n >= 0:
            out[key] = int(round(n))
    return out

def get_ads_prices(db: Session) -> dict:
    raw = get_site_setting_value(db, "ads_prices", "")
    if not raw:
        return dict(DEFAULT_ADS_PRICES)
    try:
        data = json.loads(raw)
        return normalize_ads_prices(data)
    except (json.JSONDecodeError, TypeError):
        return dict(DEFAULT_ADS_PRICES)

def get_ads_price_per_day(db: Session) -> float:
    from ad_orders import DEFAULT_ADS_PRICE_PER_DAY as DAY_DEFAULT, normalize_ads_price_per_day

    raw = get_site_setting_value(db, "ads_price_per_day", "")
    if raw:
        return normalize_ads_price_per_day(raw)
    # Fallback: derive from legacy 7-day package if present
    packages = get_ads_prices(db)
    seven = packages.get("7")
    if seven:
        return normalize_ads_price_per_day(float(seven) / 7.0)
    return DAY_DEFAULT


def get_service_order_pricing(db: Session) -> dict:
    from service_order_pricing import parse_service_order_pricing_json

    raw = get_site_setting_value(db, "service_order_pricing", "")
    return parse_service_order_pricing_json(raw)


def get_site_gate_public(db: Session) -> dict:
    maint = parse_bool_setting(get_site_setting_value(db, "maintenance_mode", "false"), False)
    if os.getenv("SITE_MAINTENANCE", "").strip() != "":
        from site_gate import env_bool

        maint = env_bool("SITE_MAINTENANCE", False)
    if os.getenv("SITE_GATE_DISABLE", "").strip():
        from site_gate import env_bool

        if env_bool("SITE_GATE_DISABLE", False):
            maint = False
    return {
        "maintenance_mode": maint,
        "maintenance_title": get_site_setting_value(db, "maintenance_title", "") or "",
        "maintenance_message": get_site_setting_value(db, "maintenance_message", "") or "",
        "http_basic_enabled": parse_bool_setting(
            get_site_setting_value(db, "http_basic_enabled", "false"), False
        )
        or bool(
            (os.getenv("HTTP_BASIC_USER") or "").strip()
            and os.getenv("HTTP_BASIC_PASSWORD") is not None
            and str(os.getenv("HTTP_BASIC_PASSWORD")) != ""
        ),
    }


def get_site_gate_admin(db: Session) -> dict:
    from site_gate import DEFAULT_BASIC_USER

    public = get_site_gate_public(db)
    password_hash = get_site_setting_value(db, "http_basic_password_hash", "") or ""
    env_boot = bool(
        (os.getenv("HTTP_BASIC_USER") or "").strip()
        and os.getenv("HTTP_BASIC_PASSWORD") is not None
        and str(os.getenv("HTTP_BASIC_PASSWORD")) != ""
    )
    return {
        **public,
        "http_basic_user": get_site_setting_value(db, "http_basic_user", DEFAULT_BASIC_USER)
        or DEFAULT_BASIC_USER,
        "http_basic_password_set": bool(password_hash) or env_boot,
        "http_basic_from_env": env_boot,
    }


def get_active_ads_sale(db: Session) -> Optional[dict]:
    sales = [s for s in load_active_sales(db) if getattr(s, "scope", None) == "ads"]
    if not sales:
        return None
    sample = float(DEFAULT_ADS_PRICES["7"])
    best, _pay = pick_best_sale(sample, sales, "ads")
    if best is None:
        return None
    return {
        "id": best.id,
        "title": best.title,
        "scope": best.scope,
        "kind": best.kind,
        "value": best.value,
    }

def get_home_hero(db: Session) -> dict:
    raw = get_site_setting_value(db, "home_hero", "")
    if not raw:
        return dict(DEFAULT_HOME_HERO)
    try:
        data = json.loads(raw)
        if not isinstance(data, dict):
            return dict(DEFAULT_HOME_HERO)
        merged = dict(DEFAULT_HOME_HERO)
        merged.update({k: data.get(k, merged[k]) for k in DEFAULT_HOME_HERO.keys()})
        merged["image_position"] = normalize_hero_image_position(merged.get("image_position"))
        merged["enabled"] = merged.get("enabled") is not False
        merged["show_search"] = merged.get("show_search") is not False
        merged["show_filters"] = merged.get("show_filters") is not False
        merged["search_placeholder"] = normalize_search_placeholder(merged.get("search_placeholder"))
        return merged
    except (json.JSONDecodeError, TypeError):
        return dict(DEFAULT_HOME_HERO)

def save_home_hero(db: Session, hero: dict) -> dict:
    normalized = dict(DEFAULT_HOME_HERO)
    normalized.update({k: hero.get(k, normalized[k]) for k in DEFAULT_HOME_HERO.keys()})
    normalized["image_position"] = normalize_hero_image_position(normalized.get("image_position"))
    normalized["enabled"] = normalized.get("enabled") is not False
    normalized["show_search"] = normalized.get("show_search") is not False
    normalized["show_filters"] = normalized.get("show_filters") is not False
    normalized["search_placeholder"] = normalize_search_placeholder(normalized.get("search_placeholder"))
    setting = db.query(SiteSetting).filter(SiteSetting.key == "home_hero").first()
    payload = json.dumps(normalized, ensure_ascii=False)
    if not setting:
        setting = SiteSetting(key="home_hero", value=payload)
        db.add(setting)
    else:
        setting.value = payload
        setting.updated_at = datetime.utcnow()
    db.commit()
    return normalized

def promo_banner_to_dict(banner: PromoBanner) -> dict:
    return {
        "id": banner.id,
        "title": banner.title,
        "body": banner.body,
        "image_url": banner.image_url,
        "link_url": banner.link_url,
        "sort_order": banner.sort_order,
        "enabled": banner.enabled,
        "starts_at": banner.starts_at.isoformat() if banner.starts_at else None,
        "ends_at": banner.ends_at.isoformat() if banner.ends_at else None,
        "created_at": banner.created_at.isoformat() if banner.created_at else None,
        "updated_at": banner.updated_at.isoformat() if banner.updated_at else None,
    }


def sale_campaign_to_dict(sale: SaleCampaign) -> dict:
    return {
        "id": sale.id,
        "title": sale.title,
        "scope": sale.scope,
        "kind": sale.kind,
        "value": sale.value,
        "enabled": sale.enabled,
        "starts_at": sale.starts_at.isoformat() if sale.starts_at else None,
        "ends_at": sale.ends_at.isoformat() if sale.ends_at else None,
        "created_at": sale.created_at.isoformat() if sale.created_at else None,
        "updated_at": sale.updated_at.isoformat() if sale.updated_at else None,
    }


def promo_code_to_dict(promo: PromoCode) -> dict:
    return {
        "id": promo.id,
        "code": promo.code,
        "user_id": promo.user_id,
        "username": promo.user.username if promo.user else None,
        "kind": promo.kind,
        "value": promo.value,
        "note": promo.note,
        "used_at": promo.used_at.isoformat() if promo.used_at else None,
        "reserved_intent_id": promo.reserved_intent_id,
        "created_at": promo.created_at.isoformat() if promo.created_at else None,
    }


def validate_discount_fields(scope: Optional[str], kind: Optional[str], value: Optional[float], *, require_value: bool = True):
    if scope is not None and scope not in SALE_SCOPES:
        raise HTTPException(status_code=400, detail="scope: all, beats, courses, services или ads")
    if kind is not None and kind not in DISCOUNT_KINDS:
        raise HTTPException(status_code=400, detail="kind: percent или amount")
    if require_value and (value is None or float(value) <= 0):
        raise HTTPException(status_code=400, detail="value должен быть больше 0")
    if kind == "percent" and value is not None and float(value) > 100:
        raise HTTPException(status_code=400, detail="Процент не больше 100")

def is_promo_banner_active(banner: PromoBanner, now: Optional[datetime] = None) -> bool:
    """Promo window check.

    Admin UI sends ISO timestamps via Date.toISOString() (UTC with Z).
    Aware datetimes are normalized to UTC-naive for compare with datetime.utcnow().
    """
    if not banner.enabled:
        return False
    now = _as_utc_naive(now or datetime.utcnow())
    starts = _as_utc_naive(banner.starts_at)
    ends = _as_utc_naive(banner.ends_at)
    if starts is not None and starts > now:
        return False
    if ends is not None and ends < now:
        return False
    return True


def _as_utc_naive(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        return value
    return value.astimezone(timezone.utc).replace(tzinfo=None)

def user_can_access_courses_catalog(visibility: str, user: Optional[User]) -> bool:
    """Доступ к публичному API каталога курсов. При admins_only/hidden — только админы."""
    if visibility == "all":
        return True
    return bool(user and user.is_admin)

def ensure_courses_catalog_access(db: Session, current_user: Optional[User]):
    visibility = get_courses_visibility(db)
    if not user_can_access_courses_catalog(visibility, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Раздел курсов временно недоступен"
        )

def ensure_ads_orders_access(db: Session):
    if not get_ads_orders_enabled(db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Заказ рекламы временно недоступен"
        )

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


def captcha_is_required(db: Session) -> bool:
    if not get_captcha_enabled(db):
        return False
    if not captcha_keys_configured():
        return False
    force = os.getenv("BEATSTORE_CAPTCHA_FORCE", "").strip() in ("1", "true", "True")
    if captcha_is_testing() and not force:
        return False
    return True


def enforce_captcha(db: Session, token: Optional[str], request: Optional[Request] = None) -> None:
    if not captcha_is_required(db):
        return
    ip = None
    if request is not None:
        forwarded = request.headers.get("x-forwarded-for")
        ip = (forwarded.split(",")[0].strip() if forwarded else None) or (
            request.client.host if request.client else None
        )
    if not verify_smartcaptcha_token(token, ip=ip):
        raise HTTPException(status_code=400, detail="Подтвердите капчу")


def user_needs_2fa(db: Session, user: User) -> bool:
    return bool(get_totp_enabled(db) and getattr(user, "totp_enabled", False) and user.totp_secret)


def issue_pending_2fa(user: User, *, as_admin: bool = False) -> LoginResponse:
    payload = {"sub": user.username, "type": "2fa_pending"}
    if as_admin:
        payload["admin"] = True
    temp = create_access_token(payload, expires_delta=timedelta(minutes=5))
    return LoginResponse(requires_2fa=True, temp_token=temp, token_type="2fa_pending")


def issue_session_token(user: User, *, as_admin: bool = False) -> LoginResponse:
    if as_admin:
        token = create_access_token(
            {"sub": user.username, "type": "admin"},
            expires_delta=timedelta(minutes=480),
        )
    else:
        token = create_access_token(
            {"sub": user.username},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        )
    return LoginResponse(access_token=token, token_type="bearer", requires_2fa=False)

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
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        if payload.get("type") == "2fa_pending":
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    # Получаем пользователя из базы данных
    user = db.query(User).filter(User.username == username).first()
    if user is None or not user.is_active:
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
        if user is None or not user.is_active:
            return None
        return user
    except JWTError:
        return None

# API эндпоинты для аутентификации
print("Определение эндпоинтов аутентификации...")

@app.post("/register", response_model=UserResponse)
def register(user: UserCreate, request: Request, db: Session = Depends(get_db)):
    """
    Регистрация нового пользователя
    Проверяет уникальность email и username
    """
    try:
        print(f"Registration attempt: email={user.email}, username={user.username}")
        enforce_captcha(db, user.captcha_token, request)
        
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
            password_hash=hashed_password,
            consent_personal_data=True,
            consent_personal_data_at=datetime.utcnow(),
            consent_personal_data_version="v1"
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        print(f"User registered successfully: {db_user.username}")
        return user_to_response(db_user, db)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка регистрации: {str(e)}"
        )

@app.post("/login", response_model=LoginResponse)
def login(user_credentials: UserLogin, request: Request, db: Session = Depends(get_db)):
    """
    Вход пользователя в систему
    Возвращает JWT токен при успешной аутентификации
    """
    try:
        print(f"Login attempt: username={user_credentials.username}")
        enforce_captcha(db, user_credentials.captcha_token, request)
        
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

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Аккаунт удалён или деактивирован",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if user_needs_2fa(db, user):
            return issue_pending_2fa(user, as_admin=False)
        
        print(f"Login successful for user: {user_credentials.username}")
        return issue_session_token(user, as_admin=False)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка входа: {str(e)}"
        )


@app.post("/login/2fa", response_model=LoginResponse)
def login_2fa(payload: TwoFactorLogin, db: Session = Depends(get_db)):
    try:
        data = jwt.decode(payload.temp_token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Сессия 2FA истекла, войдите снова")
    if data.get("type") != "2fa_pending":
        raise HTTPException(status_code=401, detail="Неверный токен 2FA")
    username = data.get("sub")
    as_admin = bool(payload.as_admin or data.get("admin"))
    user = db.query(User).filter(User.username == username).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Пользователь не найден")
    if as_admin and not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    if not get_totp_enabled(db) or not user.totp_enabled or not user.totp_secret:
        raise HTTPException(status_code=400, detail="2FA отключена")

    ok, new_backup = verify_user_second_factor(
        secret=user.totp_secret,
        backup_store=user.totp_backup_codes,
        code=payload.code,
    )
    if not ok:
        raise HTTPException(status_code=401, detail="Неверный код 2FA")
    if new_backup is not None:
        user.totp_backup_codes = new_backup
        db.commit()
    return issue_session_token(user, as_admin=as_admin)


@app.get("/auth-settings")
def get_auth_settings(db: Session = Depends(get_db)):
    captcha_on = get_captcha_enabled(db) and captcha_keys_configured()
    return {
        "totp_enabled": get_totp_enabled(db),
        "captcha_enabled": captcha_on,
        "captcha_provider": "yandex",
        "captcha_client_key": captcha_client_key() if captcha_on else "",
    }


@app.post("/me/2fa/setup")
def setup_2fa(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not get_totp_enabled(db):
        raise HTTPException(status_code=400, detail="2FA выключена администратором")
    if not current_user.password_hash:
        raise HTTPException(status_code=400, detail="2FA доступна только для аккаунтов с паролем")
    secret = generate_totp_secret()
    current_user.totp_secret = secret
    current_user.totp_enabled = False
    current_user.totp_backup_codes = None
    db.commit()
    otpauth_url = provisioning_uri(secret, current_user.username)
    return {
        "secret": secret,
        "otpauth_url": otpauth_url,
        "qr_data_url": qr_svg_data_url(otpauth_url),
        "totp_enabled": False,
    }


@app.post("/me/2fa/confirm")
def confirm_2fa(
    payload: TwoFactorConfirm,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not get_totp_enabled(db):
        raise HTTPException(status_code=400, detail="2FA выключена администратором")
    if not current_user.totp_secret:
        raise HTTPException(status_code=400, detail="Сначала запустите настройку 2FA")
    ok, _ = verify_user_second_factor(
        secret=current_user.totp_secret,
        backup_store=None,
        code=payload.code,
    )
    if not ok:
        raise HTTPException(status_code=400, detail="Неверный код подтверждения")
    plain, hashed = generate_backup_codes(8)
    current_user.totp_enabled = True
    current_user.totp_backup_codes = serialize_backup_hashes(hashed)
    db.commit()
    return {
        "totp_enabled": True,
        "backup_codes": plain,
    }


@app.post("/me/2fa/disable")
def disable_2fa(
    payload: TwoFactorDisable,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.password_hash or not verify_password(payload.password, current_user.password_hash):
        raise HTTPException(status_code=401, detail="Неверный пароль")
    if current_user.totp_enabled and current_user.totp_secret:
        ok, new_backup = verify_user_second_factor(
            secret=current_user.totp_secret,
            backup_store=current_user.totp_backup_codes,
            code=payload.code,
        )
        if not ok:
            raise HTTPException(status_code=401, detail="Неверный код 2FA")
        if new_backup is not None:
            current_user.totp_backup_codes = new_backup
    current_user.totp_enabled = False
    current_user.totp_secret = None
    current_user.totp_backup_codes = None
    db.commit()
    return {"totp_enabled": False}

@app.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return user_to_response(current_user, db)

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

    if user_update.contacts is not None:
        current_user.additional_contact = serialize_contacts(
            [c.model_dump() if hasattr(c, "model_dump") else c.dict() for c in user_update.contacts]
        )
    elif user_update.additional_contact is not None:
        current_user.additional_contact = user_update.additional_contact or None
    
    db.commit()
    db.refresh(current_user)
    return user_to_response(current_user, db)


@app.delete("/me")
def delete_user_account(
    payload: UserDeleteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Анонимизация аккаунта: покупки сохраняются, вход блокируется."""
    if current_user.is_admin:
        other_admins = (
            db.query(User)
            .filter(User.is_admin == True, User.is_active == True, User.id != current_user.id)
            .count()
        )
        if other_admins == 0:
            raise HTTPException(
                status_code=400,
                detail="Нельзя удалить последнего администратора",
            )

    if current_user.password_hash:
        if not payload.password or not verify_password(payload.password, current_user.password_hash):
            raise HTTPException(status_code=400, detail="Неверный пароль")
    else:
        expected = (current_user.email or current_user.username or "").strip().lower()
        given = (payload.confirmation or "").strip().lower()
        if not given or given != expected:
            raise HTTPException(
                status_code=400,
                detail="Введите email или имя пользователя для подтверждения",
            )

    user_id = current_user.id
    db.query(cart_table).filter(cart_table.c.user_id == user_id).delete(synchronize_session=False)
    db.query(course_cart_table).filter(course_cart_table.c.user_id == user_id).delete(synchronize_session=False)
    db.query(favorites_table).filter(favorites_table.c.user_id == user_id).delete(synchronize_session=False)
    db.query(course_favorites_table).filter(course_favorites_table.c.user_id == user_id).delete(synchronize_session=False)

    current_user.username = f"deleted_{user_id}"
    current_user.email = None
    current_user.password_hash = None
    current_user.additional_contact = None
    current_user.oauth_provider = None
    current_user.oauth_provider_id = None
    current_user.is_active = False
    current_user.is_admin = False

    db.commit()
    return {"message": "Аккаунт удалён"}

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
    current_user: Optional[User] = Depends(get_current_user_optional),
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
    sales = load_active_sales(db)

    favorite_ids = set()
    cart_ids = set()
    if current_user:
        favorite_ids = {b.id for b in current_user.favorites}
        cart_ids = {b.id for b in current_user.cart_items}
    
    # Принудительно устанавливаем кодировку UTF-8 для ответа
    response_data = []
    for beat in beats:
        beat_dict = overlay_sale_on_mapping(
            {
                "id": beat.id,
                "title": beat.title,
                "artist": beat.artist,
                "genre": beat.genre,
                "key": beat.key,
                "bpm": beat.bpm,
                "price": beat.price,
                "price_mp3": beat.price_mp3,
                "price_wav": beat.price_wav,
                "price_exclusive": beat.price_exclusive,
                "description": beat.description,
                "demo_url": beat.demo_url,
                "cover_url": beat.cover_url,
                "is_available": beat.is_available,
                "allow_multiple_purchases": beat.allow_multiple_purchases,
                "created_at": beat.created_at.isoformat() if beat.created_at else None,
                "is_favorite": beat.id in favorite_ids,
                "is_in_cart": beat.id in cart_ids,
            },
            ["price", "price_mp3", "price_wav", "price_exclusive"],
            "beats",
            sales,
        )
        response_data.append(beat_dict)
    
    return response_data

@app.get("/beats/{beat_id}", response_model=BeatDetailResponse)
def get_beat(beat_id: int, db: Session = Depends(get_db), 
            current_user: User = Depends(get_current_user_optional)):
    beat = db.query(Beat).filter(Beat.id == beat_id).first()
    if not beat:
        raise HTTPException(status_code=404, detail="Beat not found")

    sales = load_active_sales(db)
    beat_dict = overlay_sale_on_mapping(
        {k: v for k, v in beat.__dict__.items() if not k.startswith("_")},
        ["price", "price_mp3", "price_wav", "price_exclusive"],
        "beats",
        sales,
    )

    owns = bool(
        current_user
        and (
            current_user.is_admin
            or db.query(Purchase)
            .filter(Purchase.user_id == current_user.id, Purchase.beat_id == beat_id)
            .first()
        )
    )
    if not owns:
        for key in ("full_audio_url", "project_files_url", "wav_url", "mp3_url", "exclusive_url"):
            beat_dict[key] = None

    return BeatDetailResponse(**beat_dict)


@app.get("/beats/{beat_id}/media-access")
def beat_media_access(
    beat_id: int,
    purchase_type: str = "mp3",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Signed URL for <audio src> — buyer or admin."""
    beat = db.query(Beat).filter(Beat.id == beat_id).first()
    if not beat:
        raise HTTPException(status_code=404, detail="Бит не найден")

    purchase_type = (purchase_type or "mp3").strip().lower()
    if purchase_type not in {"mp3", "wav", "exclusive"}:
        raise HTTPException(status_code=400, detail="Некорректный тип покупки")

    if not current_user.is_admin:
        purchase = (
            db.query(Purchase)
            .filter(
                Purchase.user_id == current_user.id,
                Purchase.beat_id == beat_id,
                Purchase.purchase_type == purchase_type,
            )
            .first()
        )
        # exclusive purchase unlocks any format file; any purchase unlocks legacy full_audio
        if not purchase:
            exclusive = (
                db.query(Purchase)
                .filter(
                    Purchase.user_id == current_user.id,
                    Purchase.beat_id == beat_id,
                    Purchase.purchase_type == "exclusive",
                )
                .first()
            )
            any_purchase = (
                db.query(Purchase)
                .filter(Purchase.user_id == current_user.id, Purchase.beat_id == beat_id)
                .first()
            )
            if exclusive:
                pass
            elif any_purchase and purchase_type == "mp3" and beat.full_audio_url:
                pass
            else:
                raise HTTPException(status_code=403, detail="Бит не куплен")

    file_url = media_access.beat_file_url(beat, purchase_type)
    if not file_url:
        raise HTTPException(status_code=404, detail="Файл не найден")
    if not media_access.is_paid_beat_path(file_url):
        # Remote / ungated URL — return as-is
        return {"url": file_url, "expires_in": int(media_access.MEDIA_ACCESS_TTL.total_seconds())}

    signed = media_access.signed_media_url(file_url, current_user.id)
    return {
        "url": signed,
        "expires_in": int(media_access.MEDIA_ACCESS_TTL.total_seconds()),
    }

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
    
    if user_owns_beat(db, current_user.id, beat_id):
        raise HTTPException(status_code=400, detail="Beat already purchased")

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
    drop_owned_cart_items(db, current_user)
    sales = load_active_sales(db)
    items = []
    for beat in current_user.cart_items:
        data = overlay_sale_on_mapping(
            {k: v for k, v in beat.__dict__.items() if not k.startswith("_")},
            ["price", "price_mp3", "price_wav", "price_exclusive"],
            "beats",
            sales,
        )
        items.append(BeatResponse(**data))
    return items

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
    
    if actual_price > 0:
        raise HTTPException(
            status_code=400,
            detail="Оплатите бит через /payments/create. Клиентский payment_success больше не принимается.",
        )
    
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
    ensure_courses_catalog_access(db, current_user)
    query = db.query(Course).filter(Course.is_available == True)
    
    if purpose:
        query = query.filter(Course.purpose.ilike(f"%{purpose}%"))
    if min_price:
        query = query.filter(Course.price >= min_price)
    if max_price:
        query = query.filter(Course.price <= max_price)
    
    courses = query.all()
    sales = load_active_sales(db)
    
    # Добавляем информацию о избранном и корзине для авторизованных пользователей
    if current_user:
        course_ids = [c.id for c in courses]
        favorite_course_ids = {c.id for c in current_user.course_favorites}
        cart_course_ids = {c.id for c in current_user.course_cart_items}
        purchased_course_ids = set()
        if course_ids:
            purchased_course_ids = {
                row.course_id
                for row in db.query(CoursePurchase.course_id).filter(
                    CoursePurchase.user_id == current_user.id,
                    CoursePurchase.course_id.in_(course_ids),
                )
            }
        
        result = []
        for course in courses:
            course_dict = course.__dict__.copy()
            purchased = course.id in purchased_course_ids
            course_dict['is_favorite'] = course.id in favorite_course_ids
            course_dict['is_in_cart'] = (not purchased) and course.id in cart_course_ids
            course_dict['is_purchased'] = purchased
            overlay_sale_on_mapping(course_dict, ["price"], "courses", sales)
            result.append(CourseResponse(**course_dict))
        return result
    
    return [
        CourseResponse(
            **overlay_sale_on_mapping(
                {k: v for k, v in course.__dict__.items() if not k.startswith("_")},
                ["price"],
                "courses",
                sales,
            )
        )
        for course in courses
    ]

print("Определение эндпоинта get_course...")
@app.get("/courses/{course_id}", response_model=CourseDetailResponse)
def get_course(course_id: int, db: Session = Depends(get_db), 
            current_user: User = Depends(get_current_user_optional)):
    ensure_courses_catalog_access(db, current_user)
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    course_dict = {k: v for k, v in course.__dict__.items() if not k.startswith("_")}
    
    # Добавляем информацию о избранном и корзине для авторизованных пользователей
    purchased = bool(current_user and user_owns_course(db, current_user.id, course_id))
    if current_user:
        course_dict['is_favorite'] = course in current_user.course_favorites
        course_dict['is_in_cart'] = (not purchased) and course in current_user.course_cart_items
        course_dict['is_purchased'] = purchased
    else:
        course_dict['is_favorite'] = False
        course_dict['is_in_cart'] = False
        course_dict['is_purchased'] = False

    if not (purchased or (current_user and current_user.is_admin)):
        course_dict['full_video_url'] = None

    overlay_sale_on_mapping(course_dict, ["price"], "courses", load_active_sales(db))
    return CourseDetailResponse(**course_dict)


@app.get("/courses/{course_id}/media-access")
def course_media_access(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Signed URL for <video>/<audio src> — buyer or admin."""
    ensure_courses_catalog_access(db, current_user)
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Курс не найден")
    if not current_user.is_admin and not user_owns_course(db, current_user.id, course_id):
        raise HTTPException(status_code=403, detail="Курс не куплен")
    if not course.full_video_url:
        raise HTTPException(status_code=404, detail="Файл не найден")
    if not course.full_video_url.startswith("/static/course_videos/"):
        return {
            "url": course.full_video_url,
            "expires_in": int(media_access.MEDIA_ACCESS_TTL.total_seconds()),
        }
    return {
        "url": media_access.signed_media_url(course.full_video_url, current_user.id),
        "expires_in": int(media_access.MEDIA_ACCESS_TTL.total_seconds()),
    }

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
    
    if user_owns_course(db, current_user.id, course_id):
        raise HTTPException(status_code=400, detail="Course already purchased")

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
    drop_owned_cart_items(db, current_user)
    sales = load_active_sales(db)
    items = []
    for course in current_user.course_cart_items:
        data = overlay_sale_on_mapping(
            {k: v for k, v in course.__dict__.items() if not k.startswith("_")},
            ["price"],
            "courses",
            sales,
        )
        items.append(CourseResponse(**data))
    return items

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
    
    if course.price > 0:
        raise HTTPException(
            status_code=400,
            detail="Оплатите курс через /payments/create. Клиентский payment_success больше не принимается.",
        )
    
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

class CreatePaymentRequest(BaseModel):
    kind: Optional[str] = None
    type: Optional[str] = None
    item_id: Optional[int] = None
    purchase_type: Optional[str] = None
    order_id: Optional[int] = None
    ad_order_id: Optional[int] = None
    beats_formats: Optional[Any] = None
    promo_code: Optional[str] = None


class SimulatePaymentRequest(BaseModel):
    inv_id: int
    success: bool = True


@app.get("/payments/config")
def payments_config():
    return payment_public_config()


@app.post("/payments/quote")
def payments_quote(
    body: CreatePaymentRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    try:
        return preview_checkout(db, current_user, body.dict())
    except PaymentError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/payments/create")
def payments_create(
    body: CreatePaymentRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    try:
        return create_checkout(db, current_user, body.dict())
    except PaymentError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.get("/payments/intents/{inv_id}")
def payments_intent(
    inv_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    intent = db.query(PaymentIntent).filter(PaymentIntent.id == inv_id).first()
    if not intent:
        raise HTTPException(status_code=404, detail="Платёж не найден")
    if intent.user_id:
        if not current_user:
            raise HTTPException(status_code=401, detail="Войдите, чтобы увидеть платёж")
        if current_user.id != intent.user_id and not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Это не ваш платёж")
    return intent_view(intent)


@app.post("/payments/intents/{inv_id}/retry")
def payments_retry(
    inv_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    intent = db.query(PaymentIntent).filter(PaymentIntent.id == inv_id).first()
    if not intent:
        raise HTTPException(status_code=404, detail="Платёж не найден")
    if intent.status == "paid":
        raise HTTPException(status_code=400, detail="Этот платёж уже оплачен")
    payload = payload_dict(intent.payload)
    body = {"kind": intent.kind, **payload}
    if "beats_formats" in payload:
        body["beats_formats"] = payload["beats_formats"]
    try:
        return create_checkout(db, current_user, body)
    except PaymentError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/payments/simulate")
def payments_simulate(
    body: SimulatePaymentRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    if not payment_config.is_test() or payment_config.robokassa_configured():
        raise HTTPException(status_code=403, detail="Симулятор только без боевых ключей Robokassa")
    intent = db.query(PaymentIntent).filter(PaymentIntent.id == body.inv_id).first()
    if not intent:
        raise HTTPException(status_code=404, detail="Платёж не найден")
    if intent.user_id:
        if not current_user:
            raise HTTPException(status_code=401, detail="Войдите, чтобы подтвердить оплату")
        if current_user.id != intent.user_id and not current_user.is_admin:
            raise HTTPException(status_code=403, detail="Это не ваш платёж")
    if body.success:
        try:
            fulfill_intent(db, intent)
        except Exception as exc:
            mark_failed(db, intent, str(exc))
            raise HTTPException(status_code=400, detail=str(exc))
    else:
        mark_failed(db, intent, "Оплата отменена")
    return intent_view(intent)


@app.post("/payments/robokassa/result")
@app.get("/payments/robokassa/result")
async def payments_robokassa_result(request: Request, db: Session = Depends(get_db)):
    data = request.query_params
    if request.method == "POST":
        form = await request.form()
        data = form
    out_sum = str(data.get("OutSum") or "")
    inv_raw = str(data.get("InvId") or "0")
    signature = str(data.get("SignatureValue") or "")
    try:
        inv_id = int(inv_raw)
    except ValueError:
        return PlainTextResponse("bad inv", status_code=400)

    if not verify_result(out_sum, inv_id, signature, payment_config.robokassa_password2()):
        return PlainTextResponse("bad sign", status_code=400)

    intent = db.query(PaymentIntent).filter(PaymentIntent.id == inv_id).first()
    if not intent:
        return PlainTextResponse("not found", status_code=404)

    expected = format_out_sum(intent.amount)
    if out_sum != expected and f"{float(out_sum):.2f}" != expected:
        mark_failed(db, intent, "Сумма не совпала")
        return PlainTextResponse("bad sum", status_code=400)

    try:
        fulfill_intent(db, intent)
    except Exception as exc:
        mark_failed(db, intent, str(exc))
        return PlainTextResponse("fail", status_code=400)
    return PlainTextResponse(f"OK{inv_id}")


class ProcessCartPaymentRequest(BaseModel):
    success: bool

@app.post("/payment/process-cart")
def process_cart_payment(
    request: ProcessCartPaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    raise HTTPException(
        status_code=400,
        detail="Оплатите корзину через /payments/create. Клиентский success больше не принимается.",
    )

# Заказы услуг
@app.post("/service-orders", response_model=ServiceOrderResponse)
def create_service_order(order: ServiceOrderCreate, 
                        db: Session = Depends(get_db),
                        current_user: Optional[User] = Depends(get_current_user_optional),
                        request: Request = None):
    try:
        import json
        
        print(f"Creating service order: type={order.order_type}, user={current_user.username if current_user else 'anonymous'}")

        if order.order_type == "ads":
            ensure_ads_orders_access(db)
        
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
        
        # Определяем IP-адрес клиента для фиксации согласия
        client_ip = None
        if request is not None:
            client_ip = request.headers.get("x-forwarded-for")
            if client_ip:
                # Берем первый IP из списка
                client_ip = client_ip.split(",")[0].strip()
            elif request.client:
                client_ip = request.client.host
        
        print(f"Creating ServiceOrder: user_id={user_id}, order_type={order.order_type}, categories={service_categories_json}, ip={client_ip}")
        
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
            contact_info=order.contact_info,
            consent_personal_data=True,
            consent_personal_data_at=datetime.utcnow(),
            consent_personal_data_version="v1",
            consent_ip=client_ip
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
                    
                    # Парсим материалы для отправки файлов
                    materials_list = []
                    if order.materials_url:
                        try:
                            materials_list = json.loads(order.materials_url) if order.materials_url.startswith("[") else [order.materials_url]
                        except:
                            materials_list = [order.materials_url] if order.materials_url else []
                    
                    # Референсы (ссылки) - оставляем как ссылки
                    reference_links_text = "Не указаны"
                    if order.reference_links:
                        links = [link.strip() for link in order.reference_links.split("\n") if link.strip()][:5]
                        reference_links_text = "\n".join([f"  • {link[:80]}" for link in links])
                        if len(order.reference_links.split("\n")) > 5:
                            reference_links_text += f"\n  ... и еще ссылок"
                    
                    # Референсы (файлы) - для отправки файлов
                    reference_files_list = []
                    if order.reference_files_url:
                        try:
                            reference_files_list = json.loads(order.reference_files_url) if order.reference_files_url.startswith("[") else [order.reference_files_url]
                        except:
                            reference_files_list = [order.reference_files_url] if order.reference_files_url else []
                    
                    materials_info = f"Загружено файлов: {len(materials_list)}" if materials_list else "Не загружены"
                    ref_files_info = f"Загружено файлов: {len(reference_files_list)}" if reference_files_list else "Не загружены"
                    contact_info_text = order.contact_info if order.contact_info else "Не указана"
                    description_text = order.description if order.description else "Нет описания"
                    if len(description_text) > 500:
                        description_text = description_text[:500] + "..."

                    from telegram_ux import build_admin_order_notify

                    frontend = os.getenv("FRONTEND_URL", "") or os.getenv("MINI_APP_URL", "")
                    message, order_markup = build_admin_order_notify(
                        order_id=service_order.id,
                        customer_line=customer_info,
                        categories=categories_text,
                        deadline=str(order.deadline_days or "не указан"),
                        prepayment=str(order.prepayment_percent or "не указано"),
                        description=description_text,
                        materials_info=materials_info,
                        reference_links_text=reference_links_text,
                        ref_files_info=ref_files_info,
                        contact_info=contact_info_text,
                        frontend_url=frontend,
                    )

                    try:
                        send_message(int(admin_chat_id), message, order_markup)
                        print(f"Telegram notification sent to admin (chat_id={admin_chat_id})")
                    except Exception as msg_error:
                        print(f"Error sending Telegram message: {msg_error}")
                    
                    # Отправляем материалы (файлы) - в фоне, не блокируя ответ
                    if materials_list:
                        import threading
                        def send_materials():
                            import time
                            for i, mat_url in enumerate(materials_list, 1):
                                try:
                                    # Формируем полный URL
                                    full_url = mat_url
                                    if mat_url.startswith("/"):
                                        frontend_url = os.getenv("FRONTEND_URL", "https://XWinner.beats.please-dpym.onrender.com")
                                        full_url = f"{frontend_url.rstrip('/')}{mat_url}"
                                    
                                    # Определяем тип файла по расширению
                                    if mat_url.lower().endswith(('.mp3', '.wav', '.m4a', '.ogg', '.flac')):
                                        send_audio(int(admin_chat_id), full_url, caption=f"📎 Материал {i}/{len(materials_list)}")
                                    else:
                                        send_document(int(admin_chat_id), full_url, caption=f"📎 Материал {i}/{len(materials_list)}")
                                    time.sleep(0.5)  # Небольшая задержка между отправками
                                except Exception as e:
                                    print(f"Error sending material file {i}: {e}")
                        
                        threading.Thread(target=send_materials, daemon=True).start()
                    
                    # Отправляем референсы-файлы - в фоне
                    if reference_files_list:
                        import threading
                        def send_references():
                            import time
                            for i, ref_url in enumerate(reference_files_list, 1):
                                try:
                                    # Формируем полный URL
                                    full_url = ref_url
                                    if ref_url.startswith("/"):
                                        frontend_url = os.getenv("FRONTEND_URL", "https://XWinner.beats.please-dpym.onrender.com")
                                        full_url = f"{frontend_url.rstrip('/')}{ref_url}"
                                    
                                    # Определяем тип файла по расширению
                                    if ref_url.lower().endswith(('.mp3', '.wav', '.m4a', '.ogg', '.flac')):
                                        send_audio(int(admin_chat_id), full_url, caption=f"📁 Референс {i}/{len(reference_files_list)}")
                                    else:
                                        send_document(int(admin_chat_id), full_url, caption=f"📁 Референс {i}/{len(reference_files_list)}")
                                    time.sleep(0.5)  # Небольшая задержка между отправками
                                except Exception as e:
                                    print(f"Error sending reference file {i}: {e}")
                        
                        threading.Thread(target=send_references, daemon=True).start()
            except Exception as e:
                print(f"Error sending Telegram notification: {e}")
                import traceback
                traceback.print_exc()
        
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

@app.post("/service-orders/{order_id}/payment")
def process_service_order_payment(
    order_id: int,
    payment_data: dict,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """Обработка оплаты заказа услуги"""
    order = db.query(ServiceOrder).filter(ServiceOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Проверяем права доступа
    if current_user and current_user.is_admin:
        pass
    elif current_user and order.user_id == current_user.id:
        pass
    elif not current_user and order.customer_email:
        pass
    else:
        raise HTTPException(status_code=403, detail="Access denied")
    
    raise HTTPException(
        status_code=400,
        detail="Оплатите заказ через /payments/create. Клиентский success больше не принимается.",
    )

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
@app.post("/api/admin/login", response_model=LoginResponse)
def admin_login(login_data: UserLogin, request: Request, db: Session = Depends(get_db)):
    print(f"Admin login attempt: username={login_data.username}")
    enforce_captcha(db, login_data.captcha_token, request)
    
    # Проверяем пользователя
    user = db.query(User).filter(User.username == login_data.username).first()
    
    if not user:
        print(f"User not found: {login_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    print(f"User found: {user.username}, is_admin: {user.is_admin}")
    
    if not user.password_hash or not verify_password(login_data.password, user.password_hash):
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

    if user_needs_2fa(db, user):
        return issue_pending_2fa(user, as_admin=True)
    
    print(f"Admin login successful for: {login_data.username}")
    return issue_session_token(user, as_admin=True)

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


def _normalize_support_body(body: Optional[str]) -> str:
    text = (body or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Сообщение не может быть пустым")
    if len(text) > SUPPORT_MESSAGE_MAX_LEN:
        raise HTTPException(status_code=400, detail="Сообщение слишком длинное")
    return text


def _support_preview(text: str, limit: int = 140) -> str:
    if len(text) <= limit:
        return text
    return text[: limit - 1] + "…"


def _support_message_out(message: SupportMessage) -> dict:
    return {
        "id": message.id,
        "thread_id": message.thread_id,
        "author_id": message.author_id,
        "author_role": message.author_role,
        "body": message.body,
        "created_at": message.created_at,
    }


def _empty_support_thread() -> dict:
    return {"id": None, "unread_for_user": 0, "messages": []}


def _user_support_thread(db: Session, user_id: int) -> Optional[SupportThread]:
    return db.query(SupportThread).filter(SupportThread.user_id == user_id).first()


def _get_or_create_support_thread(db: Session, user_id: int) -> SupportThread:
    thread = _user_support_thread(db, user_id)
    if thread:
        return thread
    thread = SupportThread(user_id=user_id, unread_for_admin=0, unread_for_user=0)
    db.add(thread)
    db.commit()
    db.refresh(thread)
    return thread


def _append_support_message(
    db: Session, thread: SupportThread, *, author: User, role: str, body: str
) -> SupportMessage:
    now = datetime.utcnow()
    message = SupportMessage(
        thread_id=thread.id,
        author_id=author.id,
        author_role=role,
        body=body,
        created_at=now,
    )
    db.add(message)
    thread.last_message_at = now
    thread.last_message_preview = _support_preview(body)
    thread.updated_at = now
    if role == "user":
        thread.unread_for_admin = (thread.unread_for_admin or 0) + 1
    else:
        thread.unread_for_user = (thread.unread_for_user or 0) + 1
        thread.unread_for_admin = 0
    db.commit()
    db.refresh(message)
    db.refresh(thread)
    return message


def _thread_messages(db: Session, thread_id: int, after_id: Optional[int] = None):
    query = db.query(SupportMessage).filter(SupportMessage.thread_id == thread_id)
    if after_id is not None:
        query = query.filter(SupportMessage.id > after_id)
    return query.order_by(SupportMessage.id.asc()).all()


def _notify_admin_support_message(username: str, body: str, thread_id: int) -> None:
    if not TELEGRAM_BOT_AVAILABLE:
        return
    chat_id = os.getenv("ADMIN_TELEGRAM_CHAT_ID")
    if not chat_id:
        return
    preview = _support_preview(body, 200)
    try:
        from telegram_ux import build_admin_support_notify

        frontend = os.getenv("FRONTEND_URL", "") or os.getenv("MINI_APP_URL", "")
        text, markup = build_admin_support_notify(
            username=username,
            body=preview,
            thread_id=thread_id,
            frontend_url=frontend,
        )
        send_message(int(chat_id), text, markup)
    except Exception:
        pass


def _support_thread_payload(thread: Optional[SupportThread], messages) -> dict:
    if thread is None:
        return _empty_support_thread()
    return {
        "id": thread.id,
        "unread_for_user": thread.unread_for_user or 0,
        "messages": [_support_message_out(item) for item in messages],
    }


@app.get("/api/support/thread")
def get_support_thread(
    after_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    thread = _user_support_thread(db, current_user.id)
    if thread is None:
        return _empty_support_thread()
    messages = _thread_messages(db, thread.id, after_id)
    if thread.unread_for_user:
        thread.unread_for_user = 0
        db.commit()
        db.refresh(thread)
    return _support_thread_payload(thread, messages)


@app.post("/api/support/thread/messages")
def post_support_message(
    payload: SupportMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    body = _normalize_support_body(payload.body)
    thread = _get_or_create_support_thread(db, current_user.id)
    message = _append_support_message(db, thread, author=current_user, role="user", body=body)
    _notify_admin_support_message(current_user.username, body, thread.id)
    return _support_message_out(message)


@app.get("/api/admin/support/threads")
def admin_list_support_threads(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    threads = (
        db.query(SupportThread)
        .filter(SupportThread.last_message_at.isnot(None))
        .order_by(SupportThread.last_message_at.desc())
        .all()
    )
    rows = []
    for thread in threads:
        user = thread.user
        rows.append({
            "id": thread.id,
            "user_id": thread.user_id,
            "username": user.username if user else None,
            "email": user.email if user else None,
            "last_message_at": thread.last_message_at,
            "last_message_preview": thread.last_message_preview,
            "unread_for_admin": thread.unread_for_admin or 0,
        })
    return rows


@app.get("/api/admin/support/threads/{thread_id}")
def admin_get_support_thread(
    thread_id: int,
    after_id: Optional[int] = None,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    thread = db.query(SupportThread).filter(SupportThread.id == thread_id).first()
    if thread is None:
        raise HTTPException(status_code=404, detail="Тред не найден")
    if thread.unread_for_admin:
        thread.unread_for_admin = 0
        db.commit()
        db.refresh(thread)
    user = thread.user
    return {
        "id": thread.id,
        "user_id": thread.user_id,
        "username": user.username if user else None,
        "email": user.email if user else None,
        "unread_for_admin": thread.unread_for_admin or 0,
        "messages": [_support_message_out(item) for item in _thread_messages(db, thread.id, after_id)],
    }


@app.post("/api/admin/support/threads/{thread_id}/messages")
def admin_post_support_message(
    thread_id: int,
    payload: SupportMessageCreate,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    thread = db.query(SupportThread).filter(SupportThread.id == thread_id).first()
    if thread is None:
        raise HTTPException(status_code=404, detail="Тред не найден")
    body = _normalize_support_body(payload.body)
    message = _append_support_message(db, thread, author=current_admin, role="admin", body=body)
    _notify_user_support_reply(thread, body)
    return _support_message_out(message)


def _telegram_chat_id_for_user(user: Optional[User]) -> Optional[int]:
    if not user or user.oauth_provider != "telegram" or not user.oauth_provider_id:
        return None
    try:
        return int(user.oauth_provider_id)
    except (TypeError, ValueError):
        return None


def _notify_user_support_reply(thread: SupportThread, body: str) -> None:
    if not TELEGRAM_BOT_AVAILABLE:
        return
    user = thread.user
    chat_id = _telegram_chat_id_for_user(user)
    if chat_id is None:
        return
    try:
        from telegram_ux import build_user_menu_markup, build_user_support_reply_text

        preview = _support_preview(body, 200)
        frontend = os.getenv("FRONTEND_URL", "") or os.getenv("MINI_APP_URL", "")
        send_message(
            chat_id,
            build_user_support_reply_text(preview),
            build_user_menu_markup(
                mini_app_url=os.getenv("MINI_APP_URL", ""),
                frontend_url=frontend,
            ),
        )
    except Exception:
        pass


def _notify_user_order_status(order: ServiceOrder, status: str) -> None:
    if not TELEGRAM_BOT_AVAILABLE:
        return
    user = order.user
    chat_id = _telegram_chat_id_for_user(user)
    if chat_id is None:
        return
    try:
        from telegram_ux import build_user_order_status_text

        send_message(chat_id, build_user_order_status_text(order.id, status))
    except Exception:
        pass


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
    contributor_id: Optional[int] = None,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Получение статистики доходов с фильтрацией по датам и бенефициару."""
    from datetime import datetime
    from collections import defaultdict
    
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
            end_dt = end_dt.replace(hour=23, minute=59, second=59)
        except:
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
            end_dt = end_dt.replace(hour=23, minute=59, second=59)
    
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

    if contributor_id is not None:
        purchases_query = purchases_query.join(Beat).filter(Beat.beneficiary_id == contributor_id)
        course_purchases = []
        orders = []
    else:
        course_purchases = course_purchases_query.all()
        orders = orders_query.all()

    purchases = purchases_query.all()
    
    beat_revenue = sum(p.price_paid for p in purchases)
    beat_count = len(purchases)
    
    course_revenue = sum(cp.price_paid for cp in course_purchases)
    course_count = len(course_purchases)
    
    order_revenue = sum(o.price for o in orders if o.price)
    order_count = len(orders)
    
    total_revenue = beat_revenue + course_revenue + order_revenue
    
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

    names = {row.id: row.name for row in db.query(Contributor).all()}
    grouped = defaultdict(lambda: {"id": None, "name": STORE_BENEFICIARY_NAME, "beat_revenue": 0, "beat_count": 0})
    for purchase in purchases:
        beat = purchase.beat
        bid = beat.beneficiary_id if beat else None
        key = bid if bid is not None else 0
        grouped[key]["id"] = bid
        grouped[key]["name"] = names.get(bid, STORE_BENEFICIARY_NAME) if bid is not None else STORE_BENEFICIARY_NAME
        grouped[key]["beat_revenue"] += purchase.price_paid
        grouped[key]["beat_count"] += 1
    revenue_by_contributor = sorted(
        grouped.values(),
        key=lambda row: (0 if row["id"] is None else 1, -row["beat_revenue"], row["name"]),
    )
    
    return {
        "total_revenue": total_revenue,
        "beat_revenue": beat_revenue,
        "beat_count": beat_count,
        "course_revenue": course_revenue,
        "course_count": course_count,
        "order_revenue": order_revenue,
        "order_count": order_count,
        "revenue_by_day": revenue_by_day,
        "revenue_by_contributor": revenue_by_contributor,
        "start_date": start_date,
        "end_date": end_date
    }

_SERVICE_LTV_STATUSES = ("paid", "completed")


def _admin_user_spend_index(db: Session):
    """Per-user LTV / counts / last purchase for admin CRM list+detail."""
    index = {}

    def row(user_id: int):
        if user_id not in index:
            index[user_id] = {
                "ltv": 0.0,
                "purchase_count": 0,
                "beats": 0,
                "courses": 0,
                "services": 0,
                "last_purchase_at": None,
            }
        return index[user_id]

    def bump_last(entry, when):
        if when is None:
            return
        current = entry["last_purchase_at"]
        if current is None or when > current:
            entry["last_purchase_at"] = when

    for user_id, total, count, last_at in (
        db.query(
            Purchase.user_id,
            func.coalesce(func.sum(Purchase.price_paid), 0.0),
            func.count(Purchase.id),
            func.max(Purchase.purchase_date),
        )
        .group_by(Purchase.user_id)
        .all()
    ):
        entry = row(user_id)
        entry["ltv"] += float(total or 0)
        entry["purchase_count"] += int(count or 0)
        entry["beats"] = int(count or 0)
        bump_last(entry, last_at)

    for user_id, total, count, last_at in (
        db.query(
            CoursePurchase.user_id,
            func.coalesce(func.sum(CoursePurchase.price_paid), 0.0),
            func.count(CoursePurchase.id),
            func.max(CoursePurchase.purchase_date),
        )
        .group_by(CoursePurchase.user_id)
        .all()
    ):
        entry = row(user_id)
        entry["ltv"] += float(total or 0)
        entry["purchase_count"] += int(count or 0)
        entry["courses"] = int(count or 0)
        bump_last(entry, last_at)

    for user_id, total, count, last_at in (
        db.query(
            ServiceOrder.user_id,
            func.coalesce(func.sum(ServiceOrder.price), 0.0),
            func.count(ServiceOrder.id),
            func.max(ServiceOrder.created_at),
        )
        .filter(
            ServiceOrder.user_id.isnot(None),
            ServiceOrder.status.in_(_SERVICE_LTV_STATUSES),
            ServiceOrder.price.isnot(None),
        )
        .group_by(ServiceOrder.user_id)
        .all()
    ):
        entry = row(user_id)
        entry["ltv"] += float(total or 0)
        entry["purchase_count"] += int(count or 0)
        entry["services"] = int(count or 0)
        bump_last(entry, last_at)

    return index


@app.get("/api/admin/users")
def admin_list_users(
    q: Optional[str] = None,
    sort: str = "ltv",
    page: int = 1,
    page_size: int = 50,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    page = max(1, page)
    page_size = min(100, max(1, page_size))
    query = db.query(User)
    needle = (q or "").strip()
    if needle:
        like = f"%{needle}%"
        query = query.filter(
            or_(
                User.username.ilike(like),
                User.email.ilike(like),
                User.additional_contact.ilike(like),
            )
        )
    users = query.all()
    spend = _admin_user_spend_index(db)

    rows = []
    for user in users:
        stats = spend.get(user.id) or {
            "ltv": 0.0,
            "purchase_count": 0,
            "last_purchase_at": None,
        }
        rows.append({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "is_admin": bool(user.is_admin),
            "created_at": user.created_at,
            "purchase_count": stats["purchase_count"],
            "ltv": float(stats["ltv"]),
            "last_purchase_at": stats["last_purchase_at"],
        })

    sort_key = (sort or "ltv").strip().lower()
    if sort_key == "created_at":
        rows.sort(key=lambda r: r["created_at"] or datetime.min, reverse=True)
    elif sort_key == "last_purchase":
        rows.sort(
            key=lambda r: r["last_purchase_at"] or datetime.min,
            reverse=True,
        )
    else:
        rows.sort(key=lambda r: (-r["ltv"], r["username"] or ""))

    total = len(rows)
    start = (page - 1) * page_size
    items = rows[start : start + page_size]
    return {"total": total, "page": page, "page_size": page_size, "items": items}


@app.get("/api/admin/users/{user_id}")
def admin_get_user(
    user_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    spend = _admin_user_spend_index(db).get(user.id) or {
        "ltv": 0.0,
        "beats": 0,
        "courses": 0,
        "services": 0,
    }

    history = []
    for purchase in (
        db.query(Purchase)
        .filter(Purchase.user_id == user_id)
        .order_by(Purchase.purchase_date.desc())
        .all()
    ):
        beat = purchase.beat
        history.append({
            "type": "beat",
            "id": purchase.id,
            "title": beat.title if beat else None,
            "amount": float(purchase.price_paid or 0),
            "date": purchase.purchase_date,
            "meta": {"purchase_type": purchase.purchase_type},
        })
    for cp in (
        db.query(CoursePurchase)
        .filter(CoursePurchase.user_id == user_id)
        .order_by(CoursePurchase.purchase_date.desc())
        .all()
    ):
        course = cp.course
        history.append({
            "type": "course",
            "id": cp.id,
            "title": course.title if course else None,
            "amount": float(cp.price_paid or 0),
            "date": cp.purchase_date,
            "meta": {},
        })
    for order in (
        db.query(ServiceOrder)
        .filter(ServiceOrder.user_id == user_id)
        .order_by(ServiceOrder.created_at.desc())
        .all()
    ):
        history.append({
            "type": "service",
            "id": order.id,
            "title": order.description or "Заявка",
            "amount": float(order.price or 0),
            "date": order.created_at,
            "meta": {"status": order.status},
        })

    history.sort(key=lambda row: row["date"] or datetime.min, reverse=True)

    thread = _user_support_thread(db, user_id)
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "is_admin": bool(user.is_admin),
        "is_active": bool(user.is_active),
        "oauth_provider": user.oauth_provider,
        "created_at": user.created_at,
        "contacts": parse_contacts(user.additional_contact),
        "totals": {
            "ltv": float(spend["ltv"]),
            "beats": int(spend.get("beats") or 0),
            "courses": int(spend.get("courses") or 0),
            "services": int(spend.get("services") or 0),
        },
        "history": history,
        "support_thread_id": thread.id if thread else None,
    }


@app.post("/api/admin/users/{user_id}/support-thread")
def admin_ensure_user_support_thread(
    user_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    thread = _get_or_create_support_thread(db, user_id)
    return {"thread_id": thread.id}


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
        if demo_file and demo_file.filename:
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
        if wav_file and wav_file.filename:
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
        if mp3_file and mp3_file.filename:
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
        if exclusive_file and exclusive_file.filename:
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
        if cover_file and cover_file.filename:
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
    beneficiary_id: Optional[int] = Form(None),
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
        allow_multiple_purchases=allow_multiple,
        beneficiary_id=beneficiary_id,
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

def serialize_admin_service_order(order: ServiceOrder, db: Session) -> dict:
    """Полный payload заявки для админки: очередь, сумма к оплате, файлы, заметка."""
    import json

    service_categories = []
    if order.service_categories:
        try:
            service_categories = json.loads(order.service_categories)
        except (TypeError, json.JSONDecodeError):
            service_categories = []
    elif order.service_category:
        service_categories = [order.service_category]

    due_amount = service_order_amount(order)
    quoted_price = service_order_full_price(order)

    payload = {
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
        "contact_info": order.contact_info,
        "status": order.status or "pending",
        "queue": service_order_queue(order.status),
        "due_amount": due_amount,
        "quoted_price": quoted_price if quoted_price > 0 else None,
        "admin_note": order.admin_note,
        "result_wav_url": order.result_wav_url,
        "result_mp3_url": order.result_mp3_url,
        "result_zip_url": order.result_zip_url,
        "created_at": order.created_at,
        "updated_at": order.updated_at,
    }

    if order.user_id:
        user = db.query(User).filter(User.id == order.user_id).first()
        if user:
            payload["user_email"] = user.email
            payload["user_username"] = user.username

    return payload


# Админские эндпоинты для заявок на услуги
@app.get("/api/admin/service-orders")
def get_service_orders_admin(current_admin: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    """Получение всех заявок на услуги для админа"""
    orders = db.query(ServiceOrder).order_by(ServiceOrder.created_at.desc()).all()
    return [serialize_admin_service_order(order, db) for order in orders]

@app.put("/api/admin/service-orders/{order_id}")
def update_service_order_status(
    order_id: int,
    status: Optional[str] = Form(None),
    price: Optional[float] = Form(None),
    prepayment_percent: Optional[int] = Form(None),
    admin_note: Optional[str] = Form(None),
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Обновление статуса, цены, предоплаты и внутренней заметки заявки"""
    order = db.query(ServiceOrder).filter(ServiceOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Service order not found")

    if price is not None:
        order.price = price

    if prepayment_percent is not None:
        if prepayment_percent not in [50, 100]:
            raise HTTPException(status_code=400, detail="prepayment_percent must be 50 or 100")
        order.prepayment_percent = prepayment_percent

    if admin_note is not None:
        order.admin_note = admin_note.strip() or None

    if status:
        if status not in ["pending", "confirmed", "paid", "in_progress", "completed", "cancelled"]:
            raise HTTPException(status_code=400, detail="Invalid status")
        if status == "confirmed":
            if not order.price:
                quoted = service_order_full_price(order)
                if quoted <= 0:
                    raise HTTPException(
                        status_code=400,
                        detail="Сначала укажите стоимость",
                    )
                order.price = quoted
            if not order.prepayment_percent:
                order.prepayment_percent = 50
        order.status = status

    order.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(order)

    if status:
        _notify_user_order_status(order, status)

    return {"message": "Order updated successfully", "order": serialize_admin_service_order(order, db)}

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
        "order": serialize_admin_service_order(order, db)
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

# Site Settings
@app.get("/site-settings")
def get_public_site_settings(db: Session = Depends(get_db)):
    """Публичные настройки сайта (видимость разделов + hero)"""
    return {
        "courses_visibility": get_courses_visibility(db),
        "ads_orders_enabled": get_ads_orders_enabled(db),
        "promo_banners_fullscreen": get_promo_banners_fullscreen(db),
        "ads_prices": get_ads_prices(db),
        "ads_price_per_day": get_ads_price_per_day(db),
        "ads_sale": get_active_ads_sale(db),
        "home_hero": get_home_hero(db),
        "service_order_pricing": get_service_order_pricing(db),
        **get_site_gate_public(db),
    }

@app.get("/api/admin/site-settings")
def get_admin_site_settings(current_admin: User = Depends(get_current_admin_user), db: Session = Depends(get_db)):
    return {
        "courses_visibility": get_courses_visibility(db),
        "ads_orders_enabled": get_ads_orders_enabled(db),
        "totp_enabled": get_totp_enabled(db),
        "captcha_enabled": get_captcha_enabled(db),
        "promo_banners_fullscreen": get_promo_banners_fullscreen(db),
        "ads_prices": get_ads_prices(db),
        "ads_price_per_day": get_ads_price_per_day(db),
        "ads_sale": get_active_ads_sale(db),
        "home_hero": get_home_hero(db),
        "service_order_pricing": get_service_order_pricing(db),
        **get_site_gate_admin(db),
    }

@app.put("/api/admin/site-settings")
def update_admin_site_settings(
    update_data: SiteSettingsUpdate,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    if update_data.courses_visibility is not None:
        if update_data.courses_visibility not in COURSES_VISIBILITY_VALUES:
            raise HTTPException(
                status_code=400,
                detail=f"courses_visibility must be one of: {', '.join(sorted(COURSES_VISIBILITY_VALUES))}"
            )
        upsert_site_setting(db, "courses_visibility", update_data.courses_visibility)

    if update_data.ads_orders_enabled is not None:
        upsert_site_setting(db, "ads_orders_enabled", "true" if update_data.ads_orders_enabled else "false")

    if update_data.totp_enabled is not None:
        upsert_site_setting(db, "totp_enabled", "true" if update_data.totp_enabled else "false")

    if update_data.captcha_enabled is not None:
        upsert_site_setting(db, "captcha_enabled", "true" if update_data.captcha_enabled else "false")

    if update_data.promo_banners_fullscreen is not None:
        upsert_site_setting(
            db,
            "promo_banners_fullscreen",
            "true" if update_data.promo_banners_fullscreen else "false",
        )

    if update_data.ads_prices is not None:
        normalized = normalize_ads_prices(update_data.ads_prices)
        upsert_site_setting(db, "ads_prices", json.dumps(normalized, ensure_ascii=False))

    if update_data.ads_price_per_day is not None:
        from ad_orders import normalize_ads_price_per_day

        upsert_site_setting(
            db,
            "ads_price_per_day",
            str(normalize_ads_price_per_day(update_data.ads_price_per_day)),
        )

    if update_data.service_order_pricing is not None:
        from service_order_pricing import normalize_service_order_pricing

        normalized = normalize_service_order_pricing(update_data.service_order_pricing)
        upsert_site_setting(
            db,
            "service_order_pricing",
            json.dumps(normalized, ensure_ascii=False),
        )

    if update_data.maintenance_mode is not None:
        upsert_site_setting(
            db,
            "maintenance_mode",
            "true" if update_data.maintenance_mode else "false",
        )
    if update_data.maintenance_title is not None:
        upsert_site_setting(db, "maintenance_title", (update_data.maintenance_title or "")[:200])
    if update_data.maintenance_message is not None:
        upsert_site_setting(db, "maintenance_message", (update_data.maintenance_message or "")[:2000])

    if update_data.http_basic_enabled is not None:
        if update_data.http_basic_enabled:
            existing_hash = get_site_setting_value(db, "http_basic_password_hash", "") or ""
            new_pass = update_data.http_basic_password
            env_boot = bool(
                (os.getenv("HTTP_BASIC_USER") or "").strip()
                and os.getenv("HTTP_BASIC_PASSWORD") is not None
                and str(os.getenv("HTTP_BASIC_PASSWORD")) != ""
            )
            if not existing_hash and not (new_pass and str(new_pass).strip()) and not env_boot:
                raise HTTPException(
                    status_code=400,
                    detail="Задайте пароль HTTP Basic перед включением",
                )
        upsert_site_setting(
            db,
            "http_basic_enabled",
            "true" if update_data.http_basic_enabled else "false",
        )
    if update_data.http_basic_user is not None:
        from site_gate import DEFAULT_BASIC_USER

        user = (update_data.http_basic_user or "").strip() or DEFAULT_BASIC_USER
        upsert_site_setting(db, "http_basic_user", user[:64])
    if update_data.http_basic_password is not None:
        from site_gate import hash_basic_password

        plain = update_data.http_basic_password
        if plain == "":
            upsert_site_setting(db, "http_basic_password_hash", "")
        else:
            upsert_site_setting(db, "http_basic_password_hash", hash_basic_password(plain))

    return {
        "message": "Site settings updated successfully",
        "settings": {
            "courses_visibility": get_courses_visibility(db),
            "ads_orders_enabled": get_ads_orders_enabled(db),
            "totp_enabled": get_totp_enabled(db),
            "captcha_enabled": get_captcha_enabled(db),
            "promo_banners_fullscreen": get_promo_banners_fullscreen(db),
            "ads_prices": get_ads_prices(db),
            "ads_price_per_day": get_ads_price_per_day(db),
            "ads_sale": get_active_ads_sale(db),
            "home_hero": get_home_hero(db),
            "service_order_pricing": get_service_order_pricing(db),
            **get_site_gate_admin(db),
        }
    }

ADMIN_GUIDE_NOTES_KEY = "admin_guide_notes"
ADMIN_GUIDE_NOTES_MAX_LEN = 50000

@app.get("/api/admin/guide-notes")
def get_admin_guide_notes(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    """Личные заметки к инструкции. Не зависят от деплоя фронта — живут в SQLite."""
    return {"notes": get_site_setting_value(db, ADMIN_GUIDE_NOTES_KEY, "")}

@app.put("/api/admin/guide-notes")
def update_admin_guide_notes(
    update_data: AdminGuideNotesUpdate,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    notes = update_data.notes if update_data.notes is not None else ""
    if len(notes) > ADMIN_GUIDE_NOTES_MAX_LEN:
        raise HTTPException(
            status_code=400,
            detail=f"notes too long (max {ADMIN_GUIDE_NOTES_MAX_LEN} characters)",
        )
    upsert_site_setting(db, ADMIN_GUIDE_NOTES_KEY, notes)
    return {"message": "Guide notes saved", "notes": notes}

@app.get("/api/admin/site-settings/hero")
def get_admin_home_hero(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    return get_home_hero(db)

@app.put("/api/admin/site-settings/hero")
def update_admin_home_hero(
    update_data: HomeHeroUpdate,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    hero = get_home_hero(db)
    patch = update_data.dict(exclude_unset=True)
    hero.update(patch)
    saved = save_home_hero(db, hero)
    return {"message": "Hero settings updated successfully", "home_hero": saved}

@app.post("/api/admin/hero-image")
async def upload_hero_image(
    file: UploadFile = File(...),
    current_admin: User = Depends(get_current_admin_user),
):
    is_valid, error_msg = validate_file(file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE, "image")
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    safe_filename = sanitize_filename(file.filename or "hero.jpg")
    filename = f"hero_{uuid.uuid4().hex[:12]}_{safe_filename}"
    relative_dir = "static/site"
    os.makedirs(relative_dir, exist_ok=True)
    path = f"{relative_dir}/{filename}"
    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    url = f"/static/site/{filename}"
    return {"url": url, "image_url": url}

# Promo Banners
@app.get("/promo-banners")
def get_public_promo_banners(db: Session = Depends(get_db)):
    """Публичные активные промо-баннеры (enabled + окно дат)"""
    now = datetime.utcnow()
    banners = (
        db.query(PromoBanner)
        .filter(PromoBanner.enabled == True)
        .order_by(PromoBanner.sort_order.asc(), PromoBanner.id.asc())
        .all()
    )
    active = [promo_banner_to_dict(b) for b in banners if is_promo_banner_active(b, now)]
    return active

@app.get("/api/admin/promo-banners")
def get_admin_promo_banners(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    banners = (
        db.query(PromoBanner)
        .order_by(PromoBanner.sort_order.asc(), PromoBanner.id.asc())
        .all()
    )
    return [promo_banner_to_dict(b) for b in banners]

@app.post("/api/admin/promo-banners")
def create_admin_promo_banner(
    data: PromoBannerCreate,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    banner = PromoBanner(
        title=data.title,
        body=data.body,
        image_url=data.image_url,
        link_url=data.link_url,
        sort_order=data.sort_order,
        enabled=data.enabled,
        starts_at=data.starts_at,
        ends_at=data.ends_at,
    )
    db.add(banner)
    db.commit()
    db.refresh(banner)
    return promo_banner_to_dict(banner)

@app.put("/api/admin/promo-banners/{banner_id}")
def update_admin_promo_banner(
    banner_id: int,
    data: PromoBannerUpdate,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    banner = db.query(PromoBanner).filter(PromoBanner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Promo banner not found")

    patch = data.dict(exclude_unset=True)
    for key, value in patch.items():
        setattr(banner, key, value)
    banner.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(banner)
    return promo_banner_to_dict(banner)

@app.delete("/api/admin/promo-banners/{banner_id}")
def delete_admin_promo_banner(
    banner_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    banner = db.query(PromoBanner).filter(PromoBanner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Promo banner not found")
    db.delete(banner)
    db.commit()
    return {"message": "Promo banner deleted successfully", "id": banner_id}

@app.post("/api/admin/promo-banners/upload-image")
async def upload_promo_banner_image(
    file: UploadFile = File(...),
    current_admin: User = Depends(get_current_admin_user),
):
    is_valid, error_msg = validate_file(file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE, "image")
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    safe_filename = sanitize_filename(file.filename or "banner.jpg")
    filename = f"banner_{uuid.uuid4().hex[:12]}_{safe_filename}"
    relative_dir = "static/site"
    os.makedirs(relative_dir, exist_ok=True)
    path = f"{relative_dir}/{filename}"
    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    url = f"/static/site/{filename}"
    return {"url": url, "image_url": url}


# --- Ad orders (платная реклама на витрине) ---

@app.post("/ad-orders")
def create_user_ad_order(
    data: AdOrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_ads_orders_access(db)
    from ad_orders import ad_order_to_dict, create_ad_order

    order = create_ad_order(
        db,
        current_user,
        image_url=data.image_url,
        link_url=data.link_url,
        days=data.days,
        price_per_day=get_ads_price_per_day(db),
        caption=data.caption,
        contact_info=data.contact_info,
    )
    return ad_order_to_dict(order)


@app.get("/ad-orders")
def list_my_ad_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from ad_orders import ad_order_to_dict

    rows = (
        db.query(AdOrder)
        .filter(AdOrder.user_id == current_user.id)
        .order_by(AdOrder.id.desc())
        .all()
    )
    return [ad_order_to_dict(row) for row in rows]


@app.get("/ad-orders/{order_id}")
def get_my_ad_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from ad_orders import ad_order_to_dict

    order = db.query(AdOrder).filter(AdOrder.id == order_id, AdOrder.user_id == current_user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    return ad_order_to_dict(order)


@app.get("/api/admin/ad-orders")
def admin_list_ad_orders(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    from ad_orders import ad_order_to_dict

    rows = db.query(AdOrder).order_by(AdOrder.id.desc()).all()
    return [ad_order_to_dict(row) for row in rows]


@app.put("/api/admin/ad-orders/{order_id}")
def admin_update_ad_order(
    order_id: int,
    data: AdOrderAdminUpdate,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    from ad_orders import (
        ad_order_to_dict,
        ensure_editable,
        normalize_link,
        quote_ad_amount,
        validate_days,
    )

    order = db.query(AdOrder).filter(AdOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    ensure_editable(order)
    patch = data.dict(exclude_unset=True)
    if "link_url" in patch and patch["link_url"] is not None:
        order.link_url = normalize_link(patch["link_url"])
    if "image_url" in patch and patch["image_url"]:
        order.image_url = patch["image_url"].strip()
    if "caption" in patch:
        order.caption = (patch["caption"] or "").strip()[:80] or None
    if "admin_note" in patch:
        order.admin_note = patch["admin_note"]
    if "days" in patch and patch["days"] is not None:
        order.days = validate_days(patch["days"])
        listed, pay = quote_ad_amount(order.days, order.price_per_day, db)
        order.list_amount = listed
        if "price" not in patch:
            order.price = pay
    if "price" in patch and patch["price"] is not None:
        p = float(patch["price"])
        if p <= 0:
            raise HTTPException(status_code=400, detail="Цена должна быть больше 0")
        order.price = round(p, 2)
    order.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(order)
    return ad_order_to_dict(order)


@app.post("/api/admin/ad-orders/{order_id}/approve")
def admin_approve_ad_order(
    order_id: int,
    data: AdOrderApproveBody,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    from ad_orders import ad_order_to_dict, approve_ad_order

    order = db.query(AdOrder).filter(AdOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    approve_ad_order(db, order, price=data.price)
    return ad_order_to_dict(order)


@app.post("/api/admin/ad-orders/{order_id}/reject")
def admin_reject_ad_order(
    order_id: int,
    data: AdOrderRejectBody,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    from ad_orders import ad_order_to_dict, reject_ad_order

    order = db.query(AdOrder).filter(AdOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    reject_ad_order(db, order, reason=data.reason)
    return ad_order_to_dict(order)


# Storefront sales + personal promo codes
@app.get("/api/admin/sales")
def get_admin_sales(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    rows = db.query(SaleCampaign).order_by(SaleCampaign.id.desc()).all()
    return [sale_campaign_to_dict(row) for row in rows]


@app.post("/api/admin/sales")
def create_admin_sale(
    data: SaleCampaignCreate,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    validate_discount_fields(data.scope, data.kind, data.value)
    sale = SaleCampaign(
        title=data.title,
        scope=data.scope,
        kind=data.kind,
        value=float(data.value),
        enabled=bool(data.enabled),
        starts_at=data.starts_at,
        ends_at=data.ends_at,
    )
    db.add(sale)
    db.commit()
    db.refresh(sale)
    return sale_campaign_to_dict(sale)


@app.put("/api/admin/sales/{sale_id}")
def update_admin_sale(
    sale_id: int,
    data: SaleCampaignUpdate,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    sale = db.query(SaleCampaign).filter(SaleCampaign.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Скидка не найдена")
    patch = data.dict(exclude_unset=True)
    validate_discount_fields(
        patch.get("scope", sale.scope),
        patch.get("kind", sale.kind),
        patch.get("value", sale.value),
        require_value="value" in patch,
    )
    for key, value in patch.items():
        setattr(sale, key, value)
    sale.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(sale)
    return sale_campaign_to_dict(sale)


@app.delete("/api/admin/sales/{sale_id}")
def delete_admin_sale(
    sale_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    sale = db.query(SaleCampaign).filter(SaleCampaign.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Скидка не найдена")
    db.delete(sale)
    db.commit()
    return {"message": "Скидка удалена", "id": sale_id}


@app.get("/api/admin/promo-codes")
def get_admin_promo_codes(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    rows = db.query(PromoCode).order_by(PromoCode.id.desc()).all()
    return [promo_code_to_dict(row) for row in rows]


@app.post("/api/admin/promo-codes")
def create_admin_promo_code(
    data: PromoCodeCreate,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    validate_discount_fields("all", data.kind, data.value)
    user = db.query(User).filter(User.username == data.username.strip()).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    code = (data.code or "").strip().upper() or generate_promo_code()
    if db.query(PromoCode).filter(PromoCode.code == code).first():
        raise HTTPException(status_code=400, detail="Такой промокод уже есть")
    promo = PromoCode(
        code=code,
        user_id=user.id,
        kind=data.kind,
        value=float(data.value),
        note=data.note,
    )
    db.add(promo)
    db.commit()
    db.refresh(promo)
    return promo_code_to_dict(promo)


@app.delete("/api/admin/promo-codes/{promo_id}")
def delete_admin_promo_code(
    promo_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    promo = db.query(PromoCode).filter(PromoCode.id == promo_id).first()
    if not promo:
        raise HTTPException(status_code=404, detail="Промокод не найден")
    db.delete(promo)
    db.commit()
    return {"message": "Промокод удалён", "id": promo_id}

# Footer pages CMS
@app.get("/footer-pages")
def get_public_footer_pages(db: Session = Depends(get_db)):
    ensure_default_footer_pages(db)
    pages = (
        db.query(FooterPage)
        .filter(FooterPage.enabled == True)
        .order_by(FooterPage.sort_order.asc(), FooterPage.id.asc())
        .all()
    )
    return [footer_page_to_dict(p, public=True) for p in pages]


@app.get("/footer-pages/{slug}")
def get_public_footer_page(slug: str, db: Session = Depends(get_db)):
    ensure_default_footer_pages(db)
    page = db.query(FooterPage).filter(FooterPage.slug == normalize_slug(slug)).first()
    if not page or not page.enabled or page.kind == "support":
        raise HTTPException(status_code=404, detail="Footer page not found")
    return footer_page_public_detail(page)


@app.get("/api/admin/footer-pages")
def get_admin_footer_pages(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    ensure_default_footer_pages(db)
    pages = (
        db.query(FooterPage)
        .order_by(FooterPage.sort_order.asc(), FooterPage.id.asc())
        .all()
    )
    return [footer_page_to_dict(p) for p in pages]


@app.post("/api/admin/footer-pages")
def create_admin_footer_page(
    data: FooterPageCreate,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    ensure_default_footer_pages(db)
    slug = normalize_slug(data.slug)
    err = validate_slug(slug)
    if err:
        raise HTTPException(status_code=400, detail=err)
    if db.query(FooterPage).filter(FooterPage.slug == slug).first():
        raise HTTPException(status_code=400, detail="Страница с таким slug уже есть")
    label = (data.label or "").strip()
    if not label:
        raise HTTPException(status_code=400, detail="Укажите название в футере")
    max_order = db.query(FooterPage).count()
    page = FooterPage(
        slug=slug,
        label=label,
        title=(data.title or label).strip() or label,
        body=data.body if data.body is not None else "",
        kind="page",
        sort_order=data.sort_order if data.sort_order is not None else max_order,
        enabled=bool(data.enabled),
        is_builtin=False,
        show_icon=False,
    )
    db.add(page)
    db.commit()
    db.refresh(page)
    return footer_page_to_dict(page)


@app.put("/api/admin/footer-pages/reorder")
def reorder_admin_footer_pages(
    data: FooterPageReorder,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    ensure_default_footer_pages(db)
    pages = db.query(FooterPage).all()
    by_id = {p.id: p for p in pages}
    if not data.ids or set(data.ids) != set(by_id.keys()):
        raise HTTPException(status_code=400, detail="Передайте полный список id для сортировки")
    for index, page_id in enumerate(data.ids):
        by_id[page_id].sort_order = index
        by_id[page_id].updated_at = datetime.utcnow()
    db.commit()
    ordered = (
        db.query(FooterPage)
        .order_by(FooterPage.sort_order.asc(), FooterPage.id.asc())
        .all()
    )
    return [footer_page_to_dict(p) for p in ordered]


@app.get("/api/admin/footer-pages/{page_id}/default-body")
def get_admin_footer_page_default_body(
    page_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    page = db.query(FooterPage).filter(FooterPage.id == page_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="Страница не найдена")
    if page.kind == "support":
        raise HTTPException(status_code=400, detail="У чата поддержки нет шаблона текста")
    body = default_body_for_slug(page.slug)
    if not body:
        raise HTTPException(status_code=404, detail="Шаблона для этой страницы нет")
    return {"slug": page.slug, "body": body}


@app.put("/api/admin/footer-pages/{page_id}")
def update_admin_footer_page(
    page_id: int,
    data: FooterPageUpdate,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    page = db.query(FooterPage).filter(FooterPage.id == page_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="Footer page not found")
    patch = data.dict(exclude_unset=True)
    if page.kind == "support":
        patch.pop("body", None)
        patch.pop("title", None)
    if "label" in patch:
        label = (patch["label"] or "").strip()
        if not label:
            raise HTTPException(status_code=400, detail="Укажите название в футере")
        patch["label"] = label
    if "title" in patch and patch["title"] is not None:
        patch["title"] = (patch["title"] or "").strip() or page.label
    for key, value in patch.items():
        setattr(page, key, value)
    page.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(page)
    return footer_page_to_dict(page)


@app.delete("/api/admin/footer-pages/{page_id}")
def delete_admin_footer_page(
    page_id: int,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    page = db.query(FooterPage).filter(FooterPage.id == page_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="Footer page not found")
    if page.is_builtin:
        raise HTTPException(status_code=400, detail="Вшитую запись нельзя удалить — снимите галочку «Показывать»")
    db.delete(page)
    db.commit()
    return {"message": "Footer page deleted successfully", "id": page_id}


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
        if preview_video_file and preview_video_file.filename:
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
        if full_video_file and full_video_file.filename:
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
    auth_date: Optional[str] = None  # Telegram Login Widget
    init_data: Optional[str] = None  # Telegram Mini App initData


def _require_verified_telegram(oauth_data: "OAuthLogin") -> None:
    """Reject spoofed Telegram identities; only Login Widget hash or WebApp initData."""
    from telegram_auth import verify_login_widget, verify_webapp_init_data

    bot_token = os.getenv("TELEGRAM_BOT_TOKEN") or ""
    if not bot_token:
        raise HTTPException(status_code=503, detail="Telegram auth is not configured")

    verified = None
    if oauth_data.init_data:
        ok, verified = verify_webapp_init_data(oauth_data.init_data, bot_token)
        if not ok:
            raise HTTPException(status_code=401, detail="Invalid Telegram initData")
    else:
        payload = {
            "id": oauth_data.provider_user_id,
            "first_name": oauth_data.first_name,
            "last_name": oauth_data.last_name,
            "username": oauth_data.username,
            "photo_url": oauth_data.photo_url,
            "auth_date": oauth_data.auth_date,
            "hash": oauth_data.access_token,
        }
        ok, verified = verify_login_widget(payload, bot_token)
        if not ok:
            raise HTTPException(status_code=401, detail="Invalid Telegram login hash")

    if str(verified["id"]) != str(oauth_data.provider_user_id):
        oauth_data.provider_user_id = str(verified["id"])
    oauth_data.username = verified.get("username") or oauth_data.username
    oauth_data.first_name = verified.get("first_name") or oauth_data.first_name
    oauth_data.last_name = verified.get("last_name") or oauth_data.last_name
    oauth_data.photo_url = verified.get("photo_url") or oauth_data.photo_url


@app.post("/oauth/login", response_model=Token)
def oauth_login(oauth_data: OAuthLogin, db: Session = Depends(get_db)):
    """
    Авторизация через OAuth провайдеров (Google, VK, Yandex, Telegram).
    Telegram: только подписанный Login Widget hash или Mini App initData.
    """
    if oauth_data.provider == "telegram":
        _require_verified_telegram(oauth_data)

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
    """Deprecated: chat_id auth is spoofable. Use Login Widget or Mini App initData."""
    raise HTTPException(
        status_code=403,
        detail="Telegram chat_id auth disabled. Use Login Widget or open the Mini App.",
    )

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

from submit_routes import register_submit_routes
register_submit_routes(app)

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
        path.startswith("payments/") or
        path.startswith("payment/") or
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
if os.getenv("BEATSTORE_TESTING") == "1":
    print("BEATSTORE_TESTING=1 — пропуск create_admin_user и seed")
else:
    print("ВЫЗОВ create_admin_user()...")
    create_admin_user()
    print("create_admin_user() завершен")

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

    # Legacy WAV/exclusive lived under /static/test_files — move into gated /static/audio
    try:
        from database import SessionLocal as _SessionLocalForMigrate

        _mig_db = _SessionLocalForMigrate()
        try:
            moved = media_access.migrate_test_files_to_audio(_mig_db)
            if moved:
                print(f"✅ migrate_test_files_to_audio: обновлено битов: {moved}")
        finally:
            _mig_db.close()
    except Exception as e:
        print(f"⚠️  migrate_test_files_to_audio: {e}")

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
