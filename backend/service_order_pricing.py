"""Service-order pricing CMS (site_settings.service_order_pricing)."""
from __future__ import annotations

import json
import re
from copy import deepcopy
from typing import Any

DEFAULT_SERVICE_ORDER_PRICING: dict[str, Any] = {
    "deadlines": [
        {
            "days": 21,
            "label": "2–3 недели",
            "hint": "14–21 день",
            "price_50": 25000,
            "price_100": 20000,
        },
        {
            "days": 10,
            "label": "1–2 недели",
            "hint": "8–13 дней",
            "price_50": 30000,
            "price_100": 25000,
        },
        {
            "days": 7,
            "label": "Неделя",
            "hint": "7 дней",
            "price_50": 35000,
            "price_100": 30000,
        },
        {
            "days": 3,
            "label": "2–3 дня",
            "hint": "быстрее",
            "price_50": 40000,
            "price_100": 35000,
        },
        {
            "days": 1,
            "label": "24 часа",
            "hint": "срочно",
            "price_50": 50000,
            "price_100": 45000,
        },
    ],
    "trap_price": 15000,
    "copy": {
        "guide_title": "Прайс услуг",
        "guide_subtitle": "от {{from}} · срок и предоплата меняют цену",
        "song_title": "Песня под ключ",
        "song_body": (
            "Песня с мелодиями и текстом (текст опционально). "
            "Права — заказчику, без указания авторства."
        ),
        "trap_title": "Бит в стиле трэп",
        "trap_body": "Фикс. цена {{trap}}, срок на стоимость не влияет.",
        "col_50_title": "Предоплата 50%",
        "col_100_title": "Оплата 100%",
    },
}

_TOKEN_RE = re.compile(r"\{\{([a-zA-Z0-9_]+)\}\}")


def _as_int(value: Any, default: int) -> int:
    try:
        n = int(float(value))
    except (TypeError, ValueError):
        return default
    return max(0, n)


def format_rub(amount: int) -> str:
    return f"{amount:,}".replace(",", " ") + " ₽"


def build_price_vars(pricing: dict) -> dict[str, str]:
    """Map template tokens → formatted rubles for admin chips / public copy."""
    data = normalize_service_order_pricing(pricing)
    vars_map: dict[str, str] = {
        "trap": format_rub(data["trap_price"]),
    }
    amounts = [data["trap_price"]]
    for row in data["deadlines"]:
        days = row["days"]
        p50 = row["price_50"]
        p100 = row["price_100"]
        vars_map[f"p50_{days}"] = format_rub(p50)
        vars_map[f"p100_{days}"] = format_rub(p100)
        amounts.extend([p50, p100])
    vars_map["from"] = format_rub(min(amounts) if amounts else 0)
    return vars_map


def substitute_price_vars(text: str, pricing: dict) -> str:
    if not text:
        return ""
    vars_map = build_price_vars(pricing)

    def repl(match: re.Match) -> str:
        key = match.group(1)
        return vars_map.get(key, match.group(0))

    return _TOKEN_RE.sub(repl, str(text))


def normalize_service_order_pricing(raw: Any) -> dict[str, Any]:
    base = deepcopy(DEFAULT_SERVICE_ORDER_PRICING)
    if not isinstance(raw, dict):
        return base

    trap = _as_int(raw.get("trap_price"), base["trap_price"])
    base["trap_price"] = trap

    raw_deadlines = raw.get("deadlines")
    if isinstance(raw_deadlines, list) and raw_deadlines:
        normalized_rows = []
        for i, item in enumerate(raw_deadlines):
            if not isinstance(item, dict):
                continue
            fallback = base["deadlines"][min(i, len(base["deadlines"]) - 1)]
            days = _as_int(item.get("days"), fallback["days"])
            if days <= 0:
                days = fallback["days"]
            label = str(item.get("label") or fallback["label"]).strip() or fallback["label"]
            hint = str(item.get("hint") if item.get("hint") is not None else fallback["hint"]).strip()
            normalized_rows.append(
                {
                    "days": days,
                    "label": label[:80],
                    "hint": hint[:80],
                    "price_50": _as_int(item.get("price_50"), fallback["price_50"]),
                    "price_100": _as_int(item.get("price_100"), fallback["price_100"]),
                }
            )
        if normalized_rows:
            base["deadlines"] = normalized_rows[:12]

    raw_copy = raw.get("copy")
    if isinstance(raw_copy, dict):
        for key in base["copy"].keys():
            if key in raw_copy and raw_copy[key] is not None:
                base["copy"][key] = str(raw_copy[key])[:2000]

    return base


def parse_service_order_pricing_json(raw: str) -> dict[str, Any]:
    if not (raw or "").strip():
        return deepcopy(DEFAULT_SERVICE_ORDER_PRICING)
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return deepcopy(DEFAULT_SERVICE_ORDER_PRICING)
    return normalize_service_order_pricing(data)


def get_price_for_deadline(pricing: dict, deadline_days: int, prepayment_percent: int) -> int | None:
    data = normalize_service_order_pricing(pricing)
    days = int(deadline_days)
    pct = 100 if int(prepayment_percent) >= 100 else 50
    key = "price_100" if pct == 100 else "price_50"

    exact = next((r for r in data["deadlines"] if r["days"] == days), None)
    if exact:
        return exact[key]

    # Fallback ranges matching legacy OrderPage logic
    rows = sorted(data["deadlines"], key=lambda r: r["days"])
    if not rows:
        return None
    if days >= 14:
        hit = next((r for r in rows if r["days"] >= 14), rows[-1])
        return hit[key]
    if days == 1:
        hit = next((r for r in rows if r["days"] == 1), rows[0])
        return hit[key]
    # nearest by days
    hit = min(rows, key=lambda r: abs(r["days"] - days))
    return hit[key]
