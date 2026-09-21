# Telegram Bot Ops Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** User hub + admin ops console in one Telegram bot, deep-linked to V2.

**Architecture:** Pure `telegram_ux.py` builders; `telegram_bot.py` handlers/polling; notify hooks in `main.py`.

**Tech Stack:** Python, requests, FastAPI/SQLAlchemy (existing), unittest.

**Spec:** `docs/superpowers/specs/2026-09-21-telegram-bot-ops-design.md`

## Global Constraints

- One bot token; admin gated by `ADMIN_TELEGRAM_CHAT_ID`.
- No live Telegram calls in tests.
- Update `/admin/guide` in same change.
- Backend safety: minimal diffs to purchase/auth paths.

---

### Task 1: UX builders + unit tests

**Files:**
- Create: `backend/telegram_ux.py`
- Create: `backend/tests/test_telegram_ux.py`

- [x] Write failing tests for user menu, admin order/support markup, callback parse, thread marker parse
- [x] Implement builders
- [x] Run `backend/.venv/bin/python -m unittest backend.tests.test_telegram_ux -v`

### Task 2: Bot handlers P0–P2

**Files:**
- Modify: `backend/telegram_bot.py`
- Modify: `backend/main.py` (notify hooks)
- Create: `backend/tests/test_telegram_bot_handlers.py`
- Modify: `backend/tests/test_support.py`

- [x] Wire menus, `/admin`, callbacks, support reply
- [x] Enrich order/support notifies with markup + thread id
- [x] User pushes on support admin reply + order status (telegram oauth users)
- [x] Tests with mocked `send_message` / DB

### Task 3: Admin guide

**Files:**
- Modify: `src/v2/admin/guide/adminGuideContent.js`

- [x] New section `telegram-bot`, bump `ADMIN_GUIDE_VERSION`
- [x] Touch orders/support tips

### Task 4: Full suite

- [x] `backend/.venv/bin/python -m unittest discover -s backend/tests -v`
