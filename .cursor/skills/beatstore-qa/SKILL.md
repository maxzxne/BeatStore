---
name: beatstore-qa
description: Use when writing, running, or extending BeatStore tests; changing payments, auth, download, cart, exclusive, courses visibility, promo banners, or admin gates; claiming a change is done; or when the user asks about coverage, quality, or stability.
---

# BeatStore QA

Качество держит **агент**, не пользователь. Пользователь смотрит продукт только на финальной приёмке. «Протыкай сам» в чат не вываливать.

**REQUIRED BACKGROUND:** `beatstore-payments`. Деньги: webhook/simulate fulfills, клиент — нет.

## Gate

После правок `backend/payments/**`, `backend/models.py`, `backend/main.py` (auth/cart/download/admin/site), checkout UI:

```bash
backend/.venv/bin/python -m unittest discover -s backend/tests -v
```

Или `npm test`. Exit 0, 0 failures. Иначе не done. Не заменять suite ручной историей и не звать Robokassa/OAuth/Cloudinary/Telegram.

## Pyramid

| Слой | Где | Когда |
|---|---|---|
| Unit | `test_quote`, `test_fulfill`, `test_robokassa`, `test_rules` | quote, fulfill, подписи, баннеры, courses_visibility |
| API | `test_api.py` TestClient + temp SQLite | HTTP-контракт, JWT, simulate, ResultURL, download, admin |
| Browser | только если менялся `src/` UI | агент сам, не пользователь |

Дефолт — unit+API, секунды. Playwright не в `npm test`.

## Must-cover (см. [invariants.md](references/invariants.md))

Новый тест = один инвариант. Не «страница открылась». Не E2E ради покрытия.

## Запрещено

- Живые ключи, staging, `localhost:8000` как дефолтный прогон (`test_backend.py` — не suite)
- Мок `fulfill_intent` в API-тестах денег
- Считать SuccessURL / `payment_success` покупкой
- Просить пользователя пройти чеклист вместо падающего теста

## Add a test

1. Воспроизведи инвариант в `backend/tests/` (unit если без HTTP, иначе TestClient).
2. Повесь на `bootstrap.py` — env + temp SQLite + `BEATSTORE_TESTING=1`.
3. Прогони **весь** discover, не один файл.
