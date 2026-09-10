"""Shared API/unit fixtures. Import bootstrap before database/main."""
from __future__ import annotations

import os
import sys
from datetime import timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import bootstrap  # noqa: F401, E402

from fastapi.testclient import TestClient  # noqa: E402

from database import SessionLocal, engine  # noqa: E402
from main import app, create_access_token, get_password_hash  # noqa: E402
from models import Base, Beat, Course, User  # noqa: E402

PASSWORD = "test-pass-123"
_HASH = None


def password_hash() -> str:
    global _HASH
    if _HASH is None:
        _HASH = get_password_hash(PASSWORD)
    return _HASH


def reset_schema():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    return SessionLocal()


def api_client() -> TestClient:
    client = TestClient(app)
    client.headers.update({"Accept": "application/json"})
    return client


def add_user(db, username: str, *, admin: bool = False, email: str | None = None) -> User:
    user = User(
        username=username,
        email=email or f"{username}@example.com",
        password_hash=password_hash(),
        is_admin=admin,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def add_beat(
    db,
    title: str = "Night",
    *,
    price_mp3: float = 1000,
    price_wav: float = 2000,
    price_exclusive: float = 9000,
    allow_multiple: bool = True,
    available: bool = True,
) -> Beat:
    beat = Beat(
        title=title,
        genre="trap",
        bpm=140,
        price=price_mp3,
        price_mp3=price_mp3,
        price_wav=price_wav,
        price_exclusive=price_exclusive,
        mp3_url="/static/test_files/a.mp3",
        wav_url="/static/test_files/a.wav",
        exclusive_url="/static/test_files/a.zip",
        is_available=available,
        allow_multiple_purchases=allow_multiple,
    )
    db.add(beat)
    db.commit()
    db.refresh(beat)
    return beat


def add_course(db, title: str = "Mix", price: float = 5000) -> Course:
    course = Course(title=title, price=price, is_available=True)
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


def login(client: TestClient, username: str, *, admin: bool = False) -> str:
    path = "/api/admin/login" if admin else "/login"
    response = client.post(path, json={"username": username, "password": PASSWORD})
    if response.status_code != 200:
        raise AssertionError(f"login {username} -> {response.status_code} {response.text}")
    return response.json()["access_token"]


def token_for(username: str, *, admin: bool = False) -> str:
    payload = {"sub": username}
    if admin:
        payload["type"] = "admin"
    return create_access_token(payload, expires_delta=timedelta(minutes=30))


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
