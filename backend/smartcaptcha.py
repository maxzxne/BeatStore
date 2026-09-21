"""Yandex SmartCaptcha validation (RF-friendly; no Cloudflare/Google)."""
from __future__ import annotations

import os
from typing import Optional

import httpx

VALIDATE_URL = "https://smartcaptcha.cloud.yandex.ru/validate"


def captcha_server_key() -> str:
    return (os.getenv("SMARTCAPTCHA_SERVER_KEY") or "").strip()


def captcha_client_key() -> str:
    return (os.getenv("SMARTCAPTCHA_CLIENT_KEY") or "").strip()


def captcha_keys_configured() -> bool:
    return bool(captcha_server_key() and captcha_client_key())


def is_testing() -> bool:
    return os.getenv("BEATSTORE_TESTING", "").strip() in ("1", "true", "True")


def verify_smartcaptcha_token(
    token: Optional[str],
    *,
    ip: Optional[str] = None,
    http_post=None,
) -> bool:
    """
    Validate one-time SmartCaptcha token against Yandex.
    Returns False on missing token / failed status / network errors.
    """
    secret = captcha_server_key()
    if not secret:
        return False
    if not token or not str(token).strip():
        return False

    data = {"secret": secret, "token": str(token).strip()}
    if ip:
        data["ip"] = ip

    post = http_post or _default_post
    try:
        payload = post(VALIDATE_URL, data)
    except Exception:
        return False

    if not isinstance(payload, dict):
        return False
    return payload.get("status") == "ok"


def _default_post(url: str, data: dict) -> dict:
    with httpx.Client(timeout=8.0) as client:
        response = client.post(url, data=data)
        response.raise_for_status()
        return response.json()
