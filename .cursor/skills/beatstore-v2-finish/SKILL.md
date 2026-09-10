---
name: beatstore-v2-finish
description: >-
  Orchestrates finishing BeatStore as V2-only product: kill V1/V3 UI flags,
  redesign admin CMS, homepage hero CMS + dated promo banners, profile polish,
  push to GitHub main, verify on Render staging. Use when the user says
  «добивай BeatStore», «оставь только v2», «переделай админку», hero/баннеры,
  CMS, deploy Render, or run the BeatStore finish mission end-to-end with
  parallel subagents.
---

# BeatStore V2 Finish — Orchestrator

Ты — lead-агент миссии. **Не делай всё сам.** Пиши план, режь на задачи, вызывай субагентов, ревьюишь, мержишь, пушишь, проверяешь на staging.

## Mission (verbatim)

- Оставить **только V2**. V1/V3 UI и FF-переключатель — выпилить.
- Пушить в `https://github.com/maxzxne/BeatStore` (ветка `main`, если юзер не сказал иначе).
- Сайт по дизайну/стилю V2 — **супер**, публичку не ломать ради «моды». Улучшать точечно.
- **Админку переписать полностью** — сейчас устаревшая, неудобная, UX кошмар, не всё редактируется.
- Hero на главной (eyebrow / заголовок / подзаголовок): в админке **вкл/выкл**, правка текстов, **картинка слева**.
- Баннеры-слайдер для рекламы + **дата активности** у каждого (вне окна — не показывать).
- Профиль и смежное — можно переработать.
- Разрешено переписывать что угодно ради результата.
- Staging: `https://beatstore-dpym.onrender.com/`  
  Render service: `https://dashboard.render.com/web/srv-d3hc3j2li9vc73e10l80`  
  Branch: `main`. После `git push origin main` → в Dashboard **Manual Deploy → Deploy latest commit** (Docker, ~1–2 мин) → smoke на live.

## Non-negotiables

1. **Один публичный UI = V2** (`src/v2`). Удалить/не обслуживать V1 pages chrome и `src/v3` как продукт. Обновить `AGENTS.md` + `DESIGN.md` под «shipped = V2».
2. Не превращать бренд в marketplace. Слово **Marketplace** в публичном UI — убрать (eyebrow заменить на бренд/категорию).
3. Покупки / auth / JWT / SQLite / платежный happy-path не ломать. Любой backend diff — минимальный, с проверкой.
4. Коммиты/push — только по явной просьбе юзера **или** когда миссия явно включает «залить на гит/деплой» (эта миссия — включает).
5. Visual QA обязателен: `playwright-cli` на staging или local. Код без скрина ≠ done.
6. Русский UI-копирайт. Общение с юзером — по-русски, на «ты».

## Skills to load (in order)

| Когда | Skill |
|---|---|
| Старт миссии | этот файл |
| Параллельные куски | `dispatching-parallel-agents` |
| План → исполнение | `writing-plans` → `subagent-driven-development` |
| UI вкус | `ui-ux-pro-max` + `frontend-design` |
| Баги | `systematic-debugging` |
| Перед «готово» | `verification-before-completion` |
| Ветка/финал | `finishing-a-development-branch` |

Детали CMS/API: [references/admin-cms.md](references/admin-cms.md)  
Ростер субагентов: [references/agent-roster.md](references/agent-roster.md)  
Критерии приёмки: [references/acceptance.md](references/acceptance.md)

## Operating loop

```text
1. SCOUT     — прочитай репо, staging, текущий admin, hero в HomePageV2
2. PLAN      — короткий plan.md с задачами (см. Phases)
3. DISPATCH  — Task/subagents по roster; parallel где независимо
4. REVIEW    — после каждой задачи: spec + UX + regressions
5. INTEGRATE — mainline в worktree/ветке, без полусломанного FF
6. VERIFY    — local + https://beatstore-dpym.onrender.com/
7. SHIP      — commit → push origin main → дождаться Render → smoke
8. REPORT    — что сделано / что осталось / ссылки
```

**Не спрашивай «продолжать?» между фазами.** Стой только на: деструктив, секреты, push в чужой remote, или план полностью сломан.

## Phases (cut into tasks)

### P0 — V2-only foundation
- Default UI = V2; убрать `UiSwitch` / `?ui=` / V3 routes из продукта.
- Выпилить или изолировать мёртвый V1/V3 UI-код (не ломая API).
- Синхронизировать docs/rules с реальностью «shipped V2».

### P1 — Admin redesign (full rewrite OK)
Новая админка в V2-визуале: плотная, тёмная, быстрая, предсказуемая.
Обязательные зоны: Dashboard, Beats, Courses, Upload, Orders, Purchases, Revenue, Errors, **Site / Marketing (hero+banners)**, Settings (oauth/courses visibility).
Каждая сущность — CRUD там, где сейчас «нельзя отредактировать».
См. [admin-cms.md](references/admin-cms.md).

### P2 — Homepage Hero CMS
Поля: `enabled`, `eyebrow`, `title` (multiline OK), `subtitle`, `image_url` (слева от текста), опционально CTA.
Публичка: если `enabled=false` — секции нет; если есть image — layout text+image; без image — как сейчас (текст).
Админка: live preview или честный preview-блок.

### P3 — Promo banner slider
Модель баннера: image, title/body optional, link optional, `starts_at`, `ends_at`, `sort_order`, `enabled`.
Публичка: только активные по дате+enabled; слайдер с нормальным UX (не autoplay-ад, pause on hover, dots/arrows, a11y).
Админка: CRUD + даты.

### P4 — Profile & storefront polish
Профиль, избранное, корзина, логин — довести до уровня каталога V2.
Точечные UX-фиксы публички (поиск, фильтры, плеер, пустые состояния).

### P5 — Ship
- `git push` → Render auto-deploy
- Smoke: home, beat play, courses gate, order form, admin login, hero toggle, banner window
- Отчёт юзеру

## Subagent rules

- Один субагент = одна задача из плана. Свежий контекст. В промпт клади: цель, файлы, constraints, definition of done.
- Параллель: admin UI shell ∥ banner API ∥ hero API — ок. Не параллель два агента в один файл.
- После implementer — короткий review-агент (spec + a11y + не сломан ли checkout).
- Модели: `inherit` по умолчанию; тяжёлый UI/UX — более сильная, если юзер разрешил список.

## Design bar (V2 product)

Публичка уже в духе dark OLED + acid green + Syne/Poppins — **сохраняй continuity**.
Админка: тот же бренд-язык, но **tool density** (таблицы, фильтры, формы), не лендинг.
Запреты: purple SaaS, glassmorphism ради стекла, emoji-иконки, Inter-only, serif-hero, «три карточки ради карточек».
Motion: осмысленный, `prefers-reduced-motion` уважать.
Иконки: Lucide.

## Backend notes

- Уже есть `SiteSetting` key/value + `courses_visibility` — расширяй паттерн или нормальные таблицы для banners.
- Медиа: существующие upload/static пути; не тащи S3 без нужды.
- Публичные GET без auth; mutate — admin JWT.
- Миграции SQLite идемпотентно при старте (как сейчас в `main.py`).

## Done means

См. [acceptance.md](references/acceptance.md). Не объявляй победу без staging smoke.
