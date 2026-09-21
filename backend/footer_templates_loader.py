"""Default HTML bodies for builtin footer legal pages (CMS source of truth)."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

_TEMPLATES_DIR = Path(__file__).resolve().parent / "footer_templates"


@lru_cache(maxsize=16)
def load_footer_template(slug: str) -> str:
    path = _TEMPLATES_DIR / f"{slug}.html"
    if not path.is_file():
        return ""
    return path.read_text(encoding="utf-8").strip()


def default_body_for_slug(slug: str) -> str:
    return load_footer_template(slug)
