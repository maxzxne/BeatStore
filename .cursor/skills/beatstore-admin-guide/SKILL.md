---
name: beatstore-admin-guide
description: Keep the in-admin operator guide (/admin/guide) in sync with product changes. Use whenever you change admin UI, public storefront behavior, payments, CMS, auth gates, orders, contributors, or site settings — before claiming done and before commit/push.
---

# BeatStore Admin Guide Sync

Операторская инструкция живёт в админке: **`/admin/guide`**.

| Что | Где |
|---|---|
| Текст гайда (версионируется с кодом) | `src/v2/admin/guide/adminGuideContent.js` |
| UI страница | `src/v2/admin/AdminGuidePage.jsx` |
| Пункт меню | `src/v2/SidebarV2.jsx` → Система → Инструкция |
| Личные заметки админа (НЕ в git, SQLite) | `GET/PUT /api/admin/guide-notes` |

Личные заметки **не трогать** и **не переносить в код** — они персистятся в `site_settings.admin_guide_notes` и не должны сбрасываться деплоем/откатом фронта.

## HARD RULE

При **любом** изменении поведения или UI продукта (админка или витрина), которое пользователь/оператор должен знать:

1. Обнови соответствующий раздел(ы) в `adminGuideContent.js` в **том же** изменении.
2. При существенном обновлении контента подними `ADMIN_GUIDE_VERSION` (дата `YYYY-MM-DD`).
3. Коммить и пушь **вместе** с фичей/фиксом — гайд откатывается тем же revert/rollback.
4. Не закрывай задачу и не пиши «done», пока гайд не актуален.

Если менялся только рефакторинг без смены поведения для оператора — гайд можно не трогать (явно отметь это в коммите/PR).

## Что обновлять

- Новый/удалённый admin route или пункт сайдбара → раздел + меню «Инструкция» если нужно
- CMS (hero, banners, sales, promo, footer) → соответствующие секции
- Каталог / upload / submissions / contributors → каталог + чеклисты
- Заявки, поддержка, пользователи, покупки → продажи
- courses_visibility, ads, OAuth, 2FA, captcha → настройки сайта + витрина
- Платежи / лицензии / корзина → «Как устроена витрина» + «Чего не делать»
- Новый публичный флоу → группа «Витрина» или новый чеклист

## Анти-паттерны

- «Потом допишу инструкцию» в отдельном PR
- Дублировать гайд в markdown вне `adminGuideContent.js` как второй source of truth
- Затирать или сидить `admin_guide_notes` миграциями/сидерами
- Писать в гайд секреты, пароли кабинетов, live-ключи

## Быстрая проверка

- [ ] `adminGuideContent.js` отражает новое поведение
- [ ] Ссылки `adminPath` / `publicPaths` валидны
- [ ] Поиск по ключевым словам находит раздел
- [ ] Заметки API не задеты
