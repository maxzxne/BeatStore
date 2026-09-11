"""Contact channels stored in users.additional_contact (JSON list or legacy plain text)."""
from __future__ import annotations

import json
from typing import Any, Optional

CONTACT_TYPES = ("telegram", "whatsapp", "phone", "vk", "instagram", "other")

_LABELS = {
    "telegram": "Telegram",
    "whatsapp": "WhatsApp",
    "phone": "Телефон",
    "vk": "VK",
    "instagram": "Instagram",
    "other": "Другое",
}


def _normalize_type(raw: Any) -> str:
    value = str(raw or "").strip().lower()
    return value if value in CONTACT_TYPES else "other"


def _normalize_row(item: Any) -> Optional[dict]:
    if not isinstance(item, dict):
        return None
    value = str(item.get("value") or "").strip()
    if not value:
        return None
    return {"type": _normalize_type(item.get("type")), "value": value}


def parse_contacts(raw: Optional[str]) -> list[dict]:
    if raw is None:
        return []
    text = str(raw).strip()
    if not text:
        return []

    if text.startswith("["):
        try:
            data = json.loads(text)
        except (json.JSONDecodeError, TypeError):
            return [{"type": "other", "value": text}]
        if not isinstance(data, list):
            return [{"type": "other", "value": text}]
        rows: list[dict] = []
        for item in data:
            row = _normalize_row(item)
            if row:
                rows.append(row)
        return rows

    return [{"type": "other", "value": text}]


def serialize_contacts(contacts: Optional[list]) -> Optional[str]:
    if not contacts:
        return None
    rows: list[dict] = []
    for item in contacts:
        row = _normalize_row(item)
        if row:
            rows.append(row)
    if not rows:
        return None
    return json.dumps(rows, ensure_ascii=False)


def format_contacts(contacts: Optional[list]) -> str:
    if not contacts:
        return ""
    parts: list[str] = []
    for item in contacts:
        row = _normalize_row(item)
        if not row:
            continue
        label = _LABELS.get(row["type"], "Другое")
        parts.append(f"{label}: {row['value']}")
    return " · ".join(parts)
