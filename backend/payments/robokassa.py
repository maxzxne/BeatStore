"""Robokassa MD5 signatures. Live vs test is env, not a different algorithm."""
from __future__ import annotations

import hashlib
from typing import Mapping
from urllib.parse import urlencode


from payments import config

ROBOKASSA_PAY_URL = "https://auth.robokassa.ru/Merchant/Index.aspx"


def format_out_sum(amount: float) -> str:
    return f"{float(amount):.2f}"


def _shp_suffix(shp: Mapping[str, str] | None) -> str:
    if not shp:
        return ""
    parts = []
    for key in sorted(shp):
        name = key if key.startswith("Shp_") else f"Shp_{key}"
        parts.append(f"{name}={shp[key]}")
    return ":" + ":".join(parts) if parts else ""


def sign_payment(
    merchant_login: str,
    out_sum: str,
    inv_id: int,
    password1: str,
    shp: Mapping[str, str] | None = None,
) -> str:
    raw = f"{merchant_login}:{out_sum}:{inv_id}:{password1}{_shp_suffix(shp)}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


def sign_result(
    out_sum: str,
    inv_id: int,
    password2: str,
    shp: Mapping[str, str] | None = None,
) -> str:
    raw = f"{out_sum}:{inv_id}:{password2}{_shp_suffix(shp)}"
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


def verify_result(
    out_sum: str,
    inv_id: int,
    signature: str,
    password2: str,
    shp: Mapping[str, str] | None = None,
) -> bool:
    if not signature:
        return False
    expected = sign_result(out_sum, inv_id, password2, shp)
    return expected.lower() == signature.lower()


def checkout_url(
    *,
    merchant_login: str,
    out_sum: str,
    inv_id: int,
    description: str,
    password1: str,
    is_test: bool,
    success_url: str,
    fail_url: str,
    shp: Mapping[str, str] | None = None,
) -> str:
    signature = sign_payment(merchant_login, out_sum, inv_id, password1, shp)
    params = {
        "MerchantLogin": merchant_login,
        "OutSum": out_sum,
        "InvId": str(inv_id),
        "Description": description[:100],
        "SignatureValue": signature,
        "Culture": "ru",
        "Encoding": "utf-8",
        "SuccessURL": success_url,
        "FailURL": fail_url,
    }
    if is_test:
        params["IsTest"] = "1"
    if shp:
        for key, value in shp.items():
            name = key if key.startswith("Shp_") else f"Shp_{key}"
            params[name] = value
    return f"{ROBOKASSA_PAY_URL}?{urlencode(params)}"


def hosted_checkout_url(*, inv_id: int, amount: float, description: str) -> str:
    login = config.merchant_login_for_checkout()
    if not login:
        raise ValueError("Эквайринг не настроен")
    success = f"{config.frontend_url()}/payment/success?InvId={inv_id}"
    fail = f"{config.frontend_url()}/payment/failure?InvId={inv_id}"
    return checkout_url(
        merchant_login=login,
        out_sum=format_out_sum(amount),
        inv_id=inv_id,
        description=description,
        password1=config.robokassa_password1(),
        is_test=config.is_test(),
        success_url=success,
        fail_url=fail,
    )
