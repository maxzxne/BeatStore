from fastapi import FastAPI, HTTPException, Depends, status, File, UploadFile, Form
from fastapi.responses import FileResponse
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

from database import SessionLocal, engine
from models import Base, User, Beat, Purchase, cart_table

# Настройка кодировки
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
    sys.stderr = codecs.getwriter("utf-8")(sys.stderr.detach())

# Создаем таблицы
Base.metadata.create_all(bind=engine)

# Создаем админа при первом запуске
def create_admin_user():
    db = SessionLocal()
    try:
        # Проверяем, есть ли уже админ
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            # Создаем админа
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
    except Exception as e:
        print(f"Ошибка создания админа: {e}")
    finally:
        db.close()

app = FastAPI(title="xwinner.beats.please API")

# Настройка кодировки для JSON ответов
import json
from fastapi.responses import JSONResponse

def custom_json_encoder(obj):
    if isinstance(obj, str):
        return obj.encode('utf-8').decode('utf-8')
    return obj

# Статические файлы
app.mount("/static", StaticFiles(directory="static"), name="static")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://frontend:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Настройки безопасности
SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Pydantic схемы
class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    is_active: bool
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True

class BeatResponse(BaseModel):
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
    full_audio_url: Optional[str] = None
    project_files_url: Optional[str] = None

# Вспомогательные функции
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def verify_password(plain_password, hashed_password):
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
    # Обрезаем пароль до 72 байт для bcrypt  
    if len(password.encode('utf-8')) > 72:
        password = password.encode('utf-8')[:72].decode('utf-8', errors='ignore')
    try:
        return pwd_context.hash(password)
    except ValueError:
        # Если bcrypt не работает, используем простую альтернативу
        import hashlib
        return hashlib.sha256(password.encode()).hexdigest()

# Создаем админа при старте
create_admin_user()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
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
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user


def get_current_user_optional(credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)), 
                             db: Session = Depends(get_db)):
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

# Аутентификация
@app.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
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
    user = db.query(User).filter(User.username == user_credentials.username).first()
    
    if not user or not verify_password(user_credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
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
    
    return JSONResponse(content=response_data, media_type="application/json; charset=utf-8")

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
    
    # Загружаем полный файл
    if full_file:
        full_filename = f"full_{beat_id}_{full_file.filename}"
        full_path = f"static/audio/{full_filename}"
        with open(full_path, "wb") as buffer:
            shutil.copyfileobj(full_file.file, buffer)
        beat.full_audio_url = f"/static/audio/{full_filename}"
    
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
    
    # Загружаем файлы
    os.makedirs("static/demos", exist_ok=True)
    os.makedirs("static/audio", exist_ok=True)
    os.makedirs("static/covers", exist_ok=True)
    
    # Демо файл
    demo_filename = f"demo_{new_beat.id}_{demo_file.filename}"
    demo_path = f"static/demos/{demo_filename}"
    with open(demo_path, "wb") as buffer:
        shutil.copyfileobj(demo_file.file, buffer)
    new_beat.demo_url = f"/static/demos/{demo_filename}"
    
    # Полный файл (опционально)
    if full_file:
        full_filename = f"full_{new_beat.id}_{full_file.filename}"
        full_path = f"static/audio/{full_filename}"
        with open(full_path, "wb") as buffer:
            shutil.copyfileobj(full_file.file, buffer)
        new_beat.full_audio_url = f"/static/audio/{full_filename}"
    
    # Обложка (опционально)
    if cover_file:
        cover_filename = f"cover_{new_beat.id}_{cover_file.filename}"
        cover_path = f"static/covers/{cover_filename}"
        with open(cover_path, "wb") as buffer:
            shutil.copyfileobj(cover_file.file, buffer)
        new_beat.cover_url = f"/static/covers/{cover_filename}"
    
    db.commit()
    db.refresh(new_beat)
    
    return {
        "message": "Beat created successfully",
        "beat_id": new_beat.id,
        "demo_url": new_beat.demo_url,
        "full_url": new_beat.full_audio_url
    }

# Админские эндпоинты
@app.post("/api/admin/login", response_model=Token)
def admin_login(login_data: UserLogin, db: Session = Depends(get_db)):
    # Проверяем пользователя
    user = db.query(User).filter(User.username == login_data.username).first()
    
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    # Проверяем права админа
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    # Создаем токен
    access_token_expires = timedelta(minutes=480)  # 8 часов для админа
    access_token = create_access_token(
        data={"sub": user.username, "type": "admin"}, expires_delta=access_token_expires
    )
    
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
        # Сохраняем демо файл
        if demo_file:
            demo_filename = f"demo_{beat.id}_{demo_file.filename}"
            demo_path = f"static/demos/{demo_filename}"
            os.makedirs(os.path.dirname(demo_path), exist_ok=True)
            
            with open(demo_path, "wb") as buffer:
                shutil.copyfileobj(demo_file.file, buffer)
            
            beat.demo_url = f"/static/demos/{demo_filename}"
        
        # Сохраняем полный файл
        if full_file:
            full_filename = f"full_{beat.id}_{full_file.filename}"
            full_path = f"static/audio/{full_filename}"
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            
            with open(full_path, "wb") as buffer:
                shutil.copyfileobj(full_file.file, buffer)
            
            beat.full_audio_url = f"/static/audio/{full_filename}"
        
        # Сохраняем обложку
        if cover_file:
            cover_filename = f"cover_{beat.id}_{cover_file.filename}"
            cover_path = f"static/covers/{cover_filename}"
            os.makedirs(os.path.dirname(cover_path), exist_ok=True)
            
            with open(cover_path, "wb") as buffer:
                shutil.copyfileobj(cover_file.file, buffer)
            
            beat.cover_url = f"/static/covers/{cover_filename}"
        
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)