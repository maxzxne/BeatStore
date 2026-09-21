"""Quotas, invite tokens, and file limits for contributor submissions."""
from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta
from typing import Iterable

MAX_OPEN_SUBMISSIONS = 25
MAX_SUBMISSIONS_PER_DAY = 20
MAX_UPLOAD_HITS = 40
UPLOAD_WINDOW_SECONDS = 15 * 60
MAX_STORAGE_BYTES = 10 * 1024 * 1024 * 1024
INVITE_TTL = timedelta(days=7)
STORE_BENEFICIARY_NAME = "Магазин"
OPEN_STATUSES = frozenset({"draft", "pending"})

FILE_MAX_BYTES = {
    "demo": 20 * 1024 * 1024,
    "mp3": 50 * 1024 * 1024,
    "wav": 200 * 1024 * 1024,
    "exclusive": 300 * 1024 * 1024,
    "cover": 5 * 1024 * 1024,
}


class SubmitDenied(Exception):
    def __init__(self, detail: str, status_code: int = 403):
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code


def hash_invite_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def new_invite_token() -> str:
    return secrets.token_urlsafe(32)


def invite_is_valid(
    *,
    token_hash: str,
    offered_token: str,
    expires_at: datetime,
    used_at: datetime | None,
    now: datetime,
) -> bool:
    if used_at is not None:
        return False
    if now > expires_at:
        return False
    offered = hash_invite_token(offered_token)
    return hmac.compare_digest(token_hash, offered)


def assert_contributor_active(is_active: bool) -> None:
    if not is_active:
        raise SubmitDenied("Доступ к загрузке отключён", 403)


def assert_can_create_submission(
    *,
    is_active: bool,
    open_count: int,
    created_today: int,
    storage_bytes: int,
) -> None:
    assert_contributor_active(is_active)
    if open_count >= MAX_OPEN_SUBMISSIONS:
        raise SubmitDenied("Сначала дождись разбора текущих заявок", 429)
    if created_today >= MAX_SUBMISSIONS_PER_DAY:
        raise SubmitDenied("Лимит заявок на сутки", 429)
    if storage_bytes >= MAX_STORAGE_BYTES:
        raise SubmitDenied("Превышен лимит места", 429)


class UploadRateLimiter:
    def __init__(self, max_hits: int = MAX_UPLOAD_HITS, window_seconds: int = UPLOAD_WINDOW_SECONDS):
        self.max_hits = max_hits
        self.window_seconds = window_seconds
        self._hits: dict[int, list[datetime]] = {}

    def assert_allowed(self, contributor_id: int, now: datetime) -> None:
        window_start = now - timedelta(seconds=self.window_seconds)
        recent = [stamp for stamp in self._hits.get(contributor_id, []) if stamp > window_start]
        if len(recent) >= self.max_hits:
            raise SubmitDenied("Слишком много загрузок, подожди", 429)
        recent.append(now)
        self._hits[contributor_id] = recent

    def reset(self, contributor_id: int) -> None:
        self._hits.pop(contributor_id, None)


def assert_file_size(kind: str, size: int) -> None:
    limit = FILE_MAX_BYTES.get(kind)
    if limit is None:
        raise SubmitDenied("Неизвестный тип файла", 400)
    if size > limit:
        raise SubmitDenied("Файл слишком большой", 400)


def quota_window_start(now: datetime, reset_at: datetime | None = None) -> datetime:
    midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
    if reset_at and reset_at > midnight:
        return reset_at
    return midnight


def created_today_count(
    created_ats: Iterable[datetime],
    now: datetime,
    reset_at: datetime | None = None,
) -> int:
    start = quota_window_start(now, reset_at)
    return sum(1 for stamp in created_ats if stamp >= start)
