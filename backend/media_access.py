"""Signed short-TTL access for paid audio/video under gated /static paths."""
from __future__ import annotations

import os
import shutil
from datetime import datetime, timedelta
from typing import Optional
from urllib.parse import quote

from jose import JWTError, jwt
from sqlalchemy import or_
from sqlalchemy.orm import Session

from models import Beat, Course, CoursePurchase, Purchase, User

MEDIA_ACCESS_PURPOSE = "media"
MEDIA_ACCESS_TTL = timedelta(hours=1)
PAID_AUDIO_PREFIX = "/static/audio/"
PAID_VIDEO_PREFIX = "/static/course_videos/"
# Legacy seed/staging put WAV/exclusive under test_files — treat as paid too.
PAID_BEAT_PREFIXES = (PAID_AUDIO_PREFIX, "/static/test_files/")
BEAT_FILE_URL_ATTRS = ("mp3_url", "wav_url", "exclusive_url", "full_audio_url")


def is_paid_beat_path(path: Optional[str]) -> bool:
    if not path:
        return False
    return any(path.startswith(prefix) for prefix in PAID_BEAT_PREFIXES)


def _secret() -> str:
    return os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")


def _algorithm() -> str:
    return "HS256"


def safe_filename(filename: str) -> str:
    """Reject path traversal; keep only the basename."""
    name = (filename or "").replace("\\", "/").split("/")[-1]
    if not name or name in {".", ".."} or ".." in name:
        raise ValueError("Некорректное имя файла")
    return name


def url_ends_with_filename(url: Optional[str], filename: str) -> bool:
    if not url:
        return False
    return url.rstrip("/").endswith("/" + filename) or url.rstrip("/").endswith(filename)


def create_media_access_token(
    *,
    path: str,
    user_id: int,
    expires_delta: timedelta = MEDIA_ACCESS_TTL,
) -> str:
    expire = datetime.utcnow() + expires_delta
    payload = {
        "purpose": MEDIA_ACCESS_PURPOSE,
        "path": path,
        "uid": user_id,
        "exp": expire,
    }
    return jwt.encode(payload, _secret(), algorithm=_algorithm())


def decode_media_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, _secret(), algorithms=[_algorithm()])
    except JWTError as exc:
        raise ValueError("Недействительный токен доступа") from exc
    if payload.get("purpose") != MEDIA_ACCESS_PURPOSE:
        raise ValueError("Недействительный токен доступа")
    return payload


def signed_media_url(path: str, user_id: int) -> str:
    token = create_media_access_token(path=path, user_id=user_id)
    sep = "&" if "?" in path else "?"
    return f"{path}{sep}access={quote(token, safe='')}"


def beat_file_url(beat: Beat, purchase_type: str) -> Optional[str]:
    purchase_type = (purchase_type or "mp3").strip().lower()
    if purchase_type == "wav":
        return beat.wav_url
    if purchase_type == "exclusive":
        return beat.exclusive_url
    # mp3 / legacy
    return beat.mp3_url or beat.full_audio_url


def find_beat_by_audio_filename(db: Session, filename: str) -> Optional[Beat]:
    filename = safe_filename(filename)
    suffix = f"%/{filename}"
    exacts = []
    for prefix in PAID_BEAT_PREFIXES:
        exacts.extend(
            [
                Beat.mp3_url == f"{prefix}{filename}",
                Beat.wav_url == f"{prefix}{filename}",
                Beat.exclusive_url == f"{prefix}{filename}",
                Beat.full_audio_url == f"{prefix}{filename}",
            ]
        )
    return (
        db.query(Beat)
        .filter(
            or_(
                Beat.mp3_url.like(suffix),
                Beat.wav_url.like(suffix),
                Beat.exclusive_url.like(suffix),
                Beat.full_audio_url.like(suffix),
                *exacts,
            )
        )
        .first()
    )


def relocate_test_files_url(url: Optional[str]) -> Optional[str]:
    """Move legacy /static/test_files/* onto /static/audio/* when present; rewrite URL."""
    if not url or not url.startswith("/static/test_files/"):
        return url
    try:
        name = safe_filename(url.rsplit("/", 1)[-1])
    except ValueError:
        return url
    src = os.path.join("static", "test_files", name)
    dst_dir = os.path.join("static", "audio")
    dst = os.path.join(dst_dir, name)
    os.makedirs(dst_dir, exist_ok=True)
    if os.path.isfile(src):
        if not os.path.isfile(dst):
            shutil.move(src, dst)
        else:
            try:
                os.remove(src)
            except OSError:
                pass
    return f"{PAID_AUDIO_PREFIX}{name}"


def migrate_test_files_to_audio(db: Session) -> int:
    """Rewrite beat paid URLs from test_files → audio; move files when on disk."""
    changed = 0
    beats = db.query(Beat).all()
    for beat in beats:
        dirty = False
        for attr in BEAT_FILE_URL_ATTRS:
            old = getattr(beat, attr, None)
            new = relocate_test_files_url(old)
            if new != old:
                setattr(beat, attr, new)
                dirty = True
        if dirty:
            changed += 1
    if changed:
        db.commit()
    return changed


def find_course_by_video_filename(db: Session, filename: str) -> Optional[Course]:
    filename = safe_filename(filename)
    suffix = f"%/{filename}"
    return (
        db.query(Course)
        .filter(
            or_(
                Course.full_video_url.like(suffix),
                Course.full_video_url == f"/static/course_videos/{filename}",
            )
        )
        .first()
    )


def user_may_access_beat_file(
    db: Session, user: Optional[User], beat: Beat, filename: str
) -> bool:
    if user is None:
        return False
    if getattr(user, "is_admin", False):
        return True
    purchases = (
        db.query(Purchase)
        .filter(Purchase.user_id == user.id, Purchase.beat_id == beat.id)
        .all()
    )
    if not purchases:
        return False
    for purchase in purchases:
        url = beat_file_url(beat, purchase.purchase_type)
        if url_ends_with_filename(url, filename):
            return True
        # exclusive unlocks all formats if file matches any paid field
        if purchase.purchase_type == "exclusive" and (
            url_ends_with_filename(beat.mp3_url, filename)
            or url_ends_with_filename(beat.wav_url, filename)
            or url_ends_with_filename(beat.exclusive_url, filename)
            or url_ends_with_filename(beat.full_audio_url, filename)
        ):
            return True
    # purchased any type and file matches full_audio_url (legacy single file)
    if beat.full_audio_url and url_ends_with_filename(beat.full_audio_url, filename):
        return True
    return False


def user_may_access_course_file(
    db: Session, user: Optional[User], course: Course, filename: str
) -> bool:
    if user is None:
        return False
    if getattr(user, "is_admin", False):
        return True
    if not url_ends_with_filename(course.full_video_url, filename):
        return False
    return (
        db.query(CoursePurchase)
        .filter(
            CoursePurchase.user_id == user.id,
            CoursePurchase.course_id == course.id,
        )
        .first()
        is not None
    )


def resolve_user_from_access(
    db: Session,
    *,
    access_token: Optional[str],
    bearer_user: Optional[User],
    expected_path: str,
) -> Optional[User]:
    """Prefer query ?access= JWT for <audio src>; fall back to Authorization user."""
    if access_token:
        payload = decode_media_access_token(access_token)
        if payload.get("path") != expected_path:
            raise ValueError("Токен не для этого файла")
        uid = payload.get("uid")
        if not uid:
            raise ValueError("Недействительный токен доступа")
        user = db.query(User).filter(User.id == int(uid)).first()
        if not user or not user.is_active:
            raise ValueError("Пользователь не найден")
        return user
    return bearer_user
