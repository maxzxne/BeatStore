"""Payment env. Flip PAYMENT_TEST and Robokassa passwords to go live."""
from __future__ import annotations

import os


def _flag(name: str, default: str = "false") -> bool:
    return os.getenv(name, default).strip().lower() in {"1", "true", "yes", "on"}


def provider_name() -> str:
    return os.getenv("PAYMENT_PROVIDER", "robokassa").strip().lower()


def is_test() -> bool:
    return _flag("PAYMENT_TEST", "true")


def frontend_url() -> str:
    return os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")


def backend_public_url() -> str:
    return os.getenv("BACKEND_PUBLIC_URL", os.getenv("VITE_API_URL", "http://localhost:8000")).rstrip("/")


# Public demo shop from Robokassa docs. Enough to open their hosted page; not a live merchant.
ROBOKASSA_PUBLIC_DEMO_LOGIN = "demo"


def robokassa_login() -> str:
    return os.getenv("ROBOKASSA_MERCHANT_LOGIN", "").strip()


def merchant_login_for_checkout() -> str:
    login = robokassa_login()
    if login:
        return login
    if is_test():
        return os.getenv("ROBOKASSA_DEMO_LOGIN", ROBOKASSA_PUBLIC_DEMO_LOGIN).strip() or ROBOKASSA_PUBLIC_DEMO_LOGIN
    return ""


def use_hosted_robokassa() -> bool:
    return bool(merchant_login_for_checkout())


def robokassa_password1() -> str:
    explicit = os.getenv("ROBOKASSA_PASSWORD1")
    if explicit is not None and explicit.strip():
        return explicit.strip()
    if is_test() and not robokassa_login():
        return "password_1"
    return "test_password_1"


def robokassa_password2() -> str:
    return os.getenv("ROBOKASSA_PASSWORD2", "test_password_2").strip()


def robokassa_configured() -> bool:
    return bool(robokassa_login())
