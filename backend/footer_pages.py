"""Footer CMS helpers: paths, slug rules, builtin seed."""
from __future__ import annotations

import re
from datetime import datetime
from typing import Optional

from footer_templates_loader import default_body_for_slug
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

def _page_seed(*, slug: str, label: str, title: str, sort_order: int) -> dict:
    return {
        "slug": slug,
        "label": label,
        "title": title,
        "body": default_body_for_slug(slug),
        "kind": "page",
        "sort_order": sort_order,
        "enabled": True,
        "is_builtin": True,
        "show_icon": False,
    }


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
    _page_seed(
        slug="terms",
        label="Соглашение",
        title="Пользовательское соглашение (публичная оферта)",
        sort_order=1,
    ),
    _page_seed(
        slug="privacy",
        label="Приватность",
        title="Политика конфиденциальности и обработки персональных данных",
        sort_order=2,
    ),
    _page_seed(
        slug="consent-personal-data",
        label="ПДн",
        title="Согласие на обработку персональных данных",
        sort_order=3,
    ),
    _page_seed(
        slug="cookies",
        label="Cookie",
        title="Политика использования файлов cookie",
        sort_order=4,
    ),
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
    """Create missing builtins and one-time backfill empty legal bodies into CMS."""
    rows = {row.slug: row for row in db.query(FooterPage).all()}
    changed = False
    for item in DEFAULT_FOOTER_PAGES:
        row = rows.get(item["slug"])
        if row is None:
            db.add(FooterPage(**item))
            changed = True
            continue
        if row.kind == "support":
            continue
        if not (row.body or "").strip():
            template = default_body_for_slug(row.slug)
            if template:
                row.body = template
                row.updated_at = datetime.utcnow()
                changed = True
    if changed:
        db.commit()
