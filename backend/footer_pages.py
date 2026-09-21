"""Footer CMS helpers: paths, slug rules, builtin seed."""
from __future__ import annotations

import re
from typing import Optional

from models import FooterPage

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

RESERVED_SLUGS = frozenset(
    {
        "admin",
        "api",
        "beats",
        "cart",
        "course",
        "courses",
        "favorites",
        "login",
        "logout",
        "me",
        "order",
        "pages",
        "payment",
        "payments",
        "profile",
        "purchases",
        "register",
        "static",
        "submit",
        "success",
        "support",
        "test-payment",
    }
)

BUILTIN_PAGE_SLUGS = frozenset(
    {"terms", "privacy", "consent-personal-data", "cookies"}
)

DEFAULT_FOOTER_PAGES = (
    {
        "slug": "support",
        "label": "Поддержка",
        "title": None,
        "body": None,
        "kind": "support",
        "sort_order": 0,
        "enabled": True,
        "is_builtin": True,
        "show_icon": True,
    },
    {
        "slug": "terms",
        "label": "Соглашение",
        "title": "Пользовательское соглашение (публичная оферта)",
        "body": "",
        "kind": "page",
        "sort_order": 1,
        "enabled": True,
        "is_builtin": True,
        "show_icon": False,
    },
    {
        "slug": "privacy",
        "label": "Приватность",
        "title": "Политика конфиденциальности и обработки персональных данных",
        "body": "",
        "kind": "page",
        "sort_order": 2,
        "enabled": True,
        "is_builtin": True,
        "show_icon": False,
    },
    {
        "slug": "consent-personal-data",
        "label": "ПДн",
        "title": "Согласие на обработку персональных данных",
        "body": "",
        "kind": "page",
        "sort_order": 3,
        "enabled": True,
        "is_builtin": True,
        "show_icon": False,
    },
    {
        "slug": "cookies",
        "label": "Cookie",
        "title": "Политика использования файлов cookie",
        "body": "",
        "kind": "page",
        "sort_order": 4,
        "enabled": True,
        "is_builtin": True,
        "show_icon": False,
    },
)


def normalize_slug(raw: str) -> str:
    return (raw or "").strip().lower()


def validate_slug(slug: str) -> Optional[str]:
    slug = normalize_slug(slug)
    if not slug or not SLUG_RE.match(slug):
        return "Slug: только латиница, цифры и дефис (например refund-policy)"
    if slug in RESERVED_SLUGS:
        return f"Slug «{slug}» зарезервирован"
    return None


def footer_page_path(page: FooterPage) -> str:
    if page.kind == "support":
        return "/support"
    if page.is_builtin or page.slug in BUILTIN_PAGE_SLUGS:
        return f"/{page.slug}"
    return f"/pages/{page.slug}"


def footer_page_to_dict(page: FooterPage, *, public: bool = False) -> dict:
    data = {
        "id": page.id,
        "slug": page.slug,
        "label": page.label,
        "kind": page.kind,
        "sort_order": page.sort_order,
        "enabled": bool(page.enabled),
        "is_builtin": bool(page.is_builtin),
        "show_icon": bool(page.show_icon),
        "path": footer_page_path(page),
    }
    if public:
        return data
    data["title"] = page.title
    data["body"] = None if page.kind == "support" else page.body
    data["updated_at"] = page.updated_at.isoformat() if page.updated_at else None
    return data


def footer_page_public_detail(page: FooterPage) -> dict:
    return {
        "slug": page.slug,
        "label": page.label,
        "title": page.title or page.label,
        "body": page.body or "",
        "path": footer_page_path(page),
        "use_legacy": not bool((page.body or "").strip()),
    }


def ensure_default_footer_pages(db) -> None:
    existing = {row.slug for row in db.query(FooterPage.slug).all()}
    created = False
    for item in DEFAULT_FOOTER_PAGES:
        if item["slug"] in existing:
            continue
        db.add(FooterPage(**item))
        created = True
    if created:
        db.commit()
