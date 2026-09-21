"""Site gate: HTTP Basic Auth + maintenance mode for pre-launch / outages."""
from __future__ import annotations

import base64
import hmac
import os
import secrets
from typing import Any, Optional

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEFAULT_BASIC_USER = "studio"

# Paths that never require Basic Auth / never get the public maintenance wall.
GATE_ALLOW_PREFIXES = (
    "/health",
    "/payments/robokassa/",
    "/api/admin/",
    "/admin",
    "/assets/",
    "/static/",
    "/favicon.ico",
)

MAINTENANCE_ALLOW_PREFIXES = (
    "/health",
    "/payments/",
    "/api/admin/",
    "/admin",
    "/assets/",
    "/static/",
    "/favicon.ico",
)


def env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    return raw.strip().lower() not in {"0", "false", "off", "no"}


def path_allowed(path: str, prefixes: tuple[str, ...]) -> bool:
    p = path or "/"
    if not p.startswith("/"):
        p = "/" + p
    if p in {"/favicon.ico"}:
        return True
    for prefix in prefixes:
        if p == prefix.rstrip("/") or p.startswith(prefix):
            return True
    return False


def hash_basic_password(plain: str) -> str:
    return pwd_context.hash((plain or "")[:72])


def verify_basic_password(plain: str, password_hash: str) -> bool:
    if not password_hash:
        return False
    try:
        return pwd_context.verify((plain or "")[:72], password_hash)
    except Exception:
        return False


def parse_basic_auth_header(header: Optional[str]) -> tuple[Optional[str], Optional[str]]:
    if not header or not header.lower().startswith("basic "):
        return None, None
    try:
        raw = base64.b64decode(header.split(" ", 1)[1].strip()).decode("utf-8")
    except Exception:
        return None, None
    if ":" not in raw:
        return None, None
    user, password = raw.split(":", 1)
    return user, password


def credentials_ok(user: str, password: str, expected_user: str, password_hash: str) -> bool:
    if not expected_user or not password_hash:
        return False
    if not hmac.compare_digest(user or "", expected_user):
        return False
    return verify_basic_password(password or "", password_hash)


def resolve_gate_config(db_get) -> dict[str, Any]:
    """
    db_get(key, default='') -> str from site_settings.
    Env overrides win for emergency unlock / bootstrap.
    """
    maint_env = os.getenv("SITE_MAINTENANCE", "").strip()
    if maint_env != "":
        maintenance = env_bool("SITE_MAINTENANCE", False)
    else:
        maintenance = str(db_get("maintenance_mode", "false")).lower() not in {"0", "false", "off", "no", ""}

    # Emergency unlock
    if env_bool("SITE_GATE_DISABLE", False):
        return {
            "maintenance_mode": False,
            "http_basic_enabled": False,
            "http_basic_user": DEFAULT_BASIC_USER,
            "http_basic_password_hash": "",
            "maintenance_title": "",
            "maintenance_message": "",
        }

    basic_env_user = (os.getenv("HTTP_BASIC_USER") or "").strip()
    basic_env_pass = os.getenv("HTTP_BASIC_PASSWORD")
    if basic_env_user and basic_env_pass is not None and str(basic_env_pass) != "":
        # Bootstrap from env (plaintext password compared via constant-time after hashing once per process)
        # Store ephemeral hash in process — for verify we hash-check env each time with secrets.compare
        enabled = True
        user = basic_env_user
        # Use a dedicated env verify path (no bcrypt of env every request if we cache)
        password_hash = "__ENV__"
        env_password = str(basic_env_pass)
    else:
        enabled_raw = str(db_get("http_basic_enabled", "false")).lower()
        enabled = enabled_raw not in {"0", "false", "off", "no", ""}
        user = (db_get("http_basic_user", DEFAULT_BASIC_USER) or DEFAULT_BASIC_USER).strip() or DEFAULT_BASIC_USER
        password_hash = db_get("http_basic_password_hash", "") or ""
        env_password = ""

    title = (db_get("maintenance_title", "") or "").strip()
    message = (db_get("maintenance_message", "") or "").strip()

    return {
        "maintenance_mode": maintenance,
        "http_basic_enabled": enabled and (bool(password_hash) or password_hash == "__ENV__"),
        "http_basic_user": user,
        "http_basic_password_hash": password_hash,
        "http_basic_env_password": env_password,
        "maintenance_title": title,
        "maintenance_message": message,
    }


def verify_gate_password(password: str, cfg: dict) -> bool:
    if cfg.get("http_basic_password_hash") == "__ENV__":
        expected = cfg.get("http_basic_env_password") or ""
        return secrets.compare_digest(password or "", expected)
    return verify_basic_password(password, cfg.get("http_basic_password_hash") or "")


def status_page_html(
    *,
    kind: str = "maintenance",
    title: Optional[str] = None,
    message: Optional[str] = None,
) -> str:
    """Self-contained OLED status page (no SPA / no assets required)."""
    presets = {
        "maintenance": {
            "eyebrow": "Offline",
            "title": "Сайт временно закрыт",
            "message": "Идёт настройка или технические работы. Загляни чуть позже.",
            "code": "503",
        },
        "error": {
            "eyebrow": "Error",
            "title": "Что-то сломалось",
            "message": "Мы уже разбираемся. Обнови страницу или зайди позже.",
            "code": "500",
        },
        "offline": {
            "eyebrow": "Offline",
            "title": "Нет связи с сервером",
            "message": "Проверь интернет и попробуй ещё раз.",
            "code": "—",
        },
        "not_found": {
            "eyebrow": "404",
            "title": "Страница не найдена",
            "message": "Такого адреса нет. Вернись на главную или открой каталог.",
            "code": "404",
        },
    }
    preset = presets.get(kind, presets["error"])
    t = (title or "").strip() or preset["title"]
    m = (message or "").strip() or preset["message"]
    eyebrow = preset["eyebrow"]
    code = preset["code"]

    # Escape minimal HTML
    def esc(s: str) -> str:
        return (
            s.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
        )

    t, m, eyebrow = esc(t), esc(m), esc(eyebrow)

    return f"""<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>{t} · XWinner</title>
  <style>
    :root {{ color-scheme: dark; }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0; min-height: 100vh; display: grid; place-items: center;
      background: #050505; color: #fafafa;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      padding: 24px;
    }}
    .card {{
      width: min(440px, 100%);
      border: 1px solid rgba(255,255,255,.1);
      border-radius: 24px;
      background: rgba(255,255,255,.03);
      padding: 32px 28px;
      text-align: center;
    }}
    .eyebrow {{
      font-size: 11px; letter-spacing: .28em; text-transform: uppercase;
      color: #22c55e; margin: 0 0 20px;
    }}
    .code {{
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 72px; height: 72px; margin: 0 auto 20px;
      border-radius: 20px; border: 1px solid rgba(34,197,94,.3);
      background: rgba(34,197,94,.08); color: #86efac;
      font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums;
    }}
    h1 {{
      margin: 0 0 12px; font-size: clamp(1.5rem, 4vw, 1.85rem); line-height: 1.2;
      font-weight: 800; letter-spacing: -0.02em;
    }}
    p {{ margin: 0; color: rgba(255,255,255,.55); font-size: 15px; line-height: 1.55; }}
    .actions {{ margin-top: 28px; display: grid; gap: 10px; }}
    a, button {{
      display: inline-flex; align-items: center; justify-content: center;
      height: 48px; border-radius: 999px; text-decoration: none; font-size: 14px; font-weight: 600;
      cursor: pointer; border: none;
    }}
    .primary {{ background: #22c55e; color: #052e16; }}
    .primary:hover {{ filter: brightness(1.08); }}
    .ghost {{ background: transparent; color: #fff; border: 1px solid rgba(255,255,255,.15); }}
    .ghost:hover {{ background: rgba(255,255,255,.05); }}
    .foot {{ margin-top: 28px; font-size: 13px; color: rgba(255,255,255,.35); }}
    .foot a {{ color: #22c55e; text-decoration: none; }}
  </style>
</head>
<body>
  <main class="card" role="alert">
    <p class="eyebrow">{eyebrow}</p>
    <div class="code" aria-hidden="true">{code}</div>
    <h1>{t}</h1>
    <p>{m}</p>
    <div class="actions">
      <a class="primary" href="/">На главную</a>
      <button class="ghost" type="button" onclick="location.reload()">Обновить</button>
    </div>
    <p class="foot">XWinner · <a href="/support">поддержка</a></p>
  </main>
</body>
</html>
"""
