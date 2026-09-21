"""Verify Telegram Login Widget and Mini App initData signatures.

See https://core.telegram.org/widgets/login#checking-authorization
and https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
"""
from __future__ import annotations

import hashlib
import hmac
import json
import time
from typing import Any, Dict, Optional, Tuple
from urllib.parse import parse_qsl


MAX_AUTH_AGE_SEC = 86400  # 24h


def _data_check_string(fields: Dict[str, str]) -> str:
    return "\n".join(f"{k}={v}" for k, v in sorted(fields.items()))


def build_login_widget_hash(payload: Dict[str, str], bot_token: str) -> str:
    """Test/helper: compute Login Widget hash for a payload (without hash)."""
    fields = {k: str(v) for k, v in payload.items() if k != "hash" and v is not None}
    secret = hashlib.sha256(bot_token.encode()).digest()
    return hmac.new(secret, _data_check_string(fields).encode(), hashlib.sha256).hexdigest()


def build_webapp_init_data(user: Dict[str, Any], auth_date: int, bot_token: str) -> str:
    """Test/helper: build signed WebApp initData query string."""
    fields = {
        "auth_date": str(auth_date),
        "user": json.dumps(user, separators=(",", ":")),
    }
    secret = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    fields["hash"] = hmac.new(
        secret, _data_check_string(fields).encode(), hashlib.sha256
    ).hexdigest()
    return "&".join(f"{k}={v}" for k, v in fields.items())


def _auth_date_fresh(auth_date: Optional[str], max_age: int = MAX_AUTH_AGE_SEC) -> bool:
    if not auth_date:
        return False
    try:
        ts = int(auth_date)
    except (TypeError, ValueError):
        return False
    return abs(int(time.time()) - ts) <= max_age


def verify_login_widget(
    payload: Dict[str, Any], bot_token: str, max_age: int = MAX_AUTH_AGE_SEC
) -> Tuple[bool, Optional[Dict[str, str]]]:
    if not bot_token or not payload:
        return False, None
    received = str(payload.get("hash") or "")
    if not received:
        return False, None
    fields = {
        k: str(v)
        for k, v in payload.items()
        if k != "hash" and v is not None and str(v) != ""
    }
    if not _auth_date_fresh(fields.get("auth_date"), max_age):
        return False, None
    expected = build_login_widget_hash(fields, bot_token)
    if not hmac.compare_digest(expected, received):
        return False, None
    user_id = fields.get("id")
    if not user_id:
        return False, None
    return True, {
        "id": user_id,
        "username": fields.get("username"),
        "first_name": fields.get("first_name"),
        "last_name": fields.get("last_name"),
        "photo_url": fields.get("photo_url"),
    }


def verify_webapp_init_data(
    init_data: str, bot_token: str, max_age: int = MAX_AUTH_AGE_SEC
) -> Tuple[bool, Optional[Dict[str, Any]]]:
    if not bot_token or not init_data:
        return False, None
    pairs = dict(parse_qsl(init_data, keep_blank_values=True))
    received = pairs.pop("hash", None)
    if not received:
        return False, None
    if not _auth_date_fresh(pairs.get("auth_date"), max_age):
        return False, None
    secret = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    expected = hmac.new(
        secret, _data_check_string(pairs).encode(), hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(expected, received):
        return False, None
    try:
        user = json.loads(pairs.get("user") or "{}")
    except json.JSONDecodeError:
        return False, None
    if not user.get("id"):
        return False, None
    return True, {
        "id": str(user["id"]),
        "username": user.get("username"),
        "first_name": user.get("first_name"),
        "last_name": user.get("last_name"),
        "photo_url": user.get("photo_url"),
    }
