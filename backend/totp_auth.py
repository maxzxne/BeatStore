"""TOTP 2FA helpers (RFC 6238). No external API — works in RF offline."""
from __future__ import annotations

import base64
import hashlib
import hmac
import io
import json
import secrets
from typing import Iterable, List, Optional, Tuple

import pyotp
import qrcode
from qrcode.image.svg import SvgPathImage


ISSUER = "XWinner BeatStore"


def generate_totp_secret() -> str:
    return pyotp.random_base32()


def provisioning_uri(secret: str, username: str) -> str:
    return pyotp.TOTP(secret).provisioning_uri(name=username, issuer_name=ISSUER)


def qr_svg_data_url(otpauth_url: str) -> str:
    """SVG QR as data URL for <img src> — no Pillow needed."""
    qr = qrcode.QRCode(border=2, box_size=4, image_factory=SvgPathImage)
    qr.add_data(otpauth_url)
    qr.make(fit=True)
    img = qr.make_image()
    buf = io.BytesIO()
    img.save(buf)
    encoded = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/svg+xml;base64,{encoded}"


def verify_totp(secret: str, code: str, *, window: int = 1) -> bool:
    if not secret or not code:
        return False
    cleaned = "".join(ch for ch in str(code).strip() if ch.isdigit())
    if len(cleaned) < 6:
        return False
    return bool(pyotp.TOTP(secret).verify(cleaned, valid_window=window))


def _hash_backup_code(code: str) -> str:
    return hashlib.sha256(code.strip().upper().encode("utf-8")).hexdigest()


def generate_backup_codes(count: int = 8) -> Tuple[List[str], List[str]]:
    """Returns (plain_codes, hashed_codes). Plain shown once to the user."""
    plain: List[str] = []
    hashed: List[str] = []
    for _ in range(count):
        raw = secrets.token_hex(4).upper()
        code = f"{raw[:4]}-{raw[4:]}"
        plain.append(code)
        hashed.append(_hash_backup_code(code))
    return plain, hashed


def serialize_backup_hashes(hashes: Iterable[str]) -> str:
    return json.dumps(list(hashes))


def load_backup_hashes(raw: Optional[str]) -> List[str]:
    if not raw:
        return []
    try:
        data = json.loads(raw)
        if isinstance(data, list):
            return [str(x) for x in data]
    except (TypeError, json.JSONDecodeError):
        pass
    return []


def consume_backup_code(raw_store: Optional[str], offered: str) -> Optional[str]:
    """
    If offered matches a stored hash, return updated JSON without that hash.
    Otherwise return None.
    """
    hashes = load_backup_hashes(raw_store)
    if not hashes or not offered:
        return None
    target = _hash_backup_code(offered)
    remaining: List[str] = []
    matched = False
    for item in hashes:
        if not matched and hmac.compare_digest(item, target):
            matched = True
            continue
        remaining.append(item)
    if not matched:
        return None
    return serialize_backup_hashes(remaining)


def verify_user_second_factor(
    *,
    secret: Optional[str],
    backup_store: Optional[str],
    code: str,
) -> Tuple[bool, Optional[str]]:
    """
    Returns (ok, new_backup_store_or_None_if_unchanged).
    TOTP wins first; else one-time backup code.
    """
    if verify_totp(secret or "", code):
        return True, None
    updated = consume_backup_code(backup_store, code)
    if updated is not None:
        return True, updated
    return False, None
