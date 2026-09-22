# Acceptance checklist

Status note (codebase): product/CMS items below are implemented in `src/v2` + backend. Ship/smoke remain operator verification on staging.

## Product

- [x] Публичный сайт открывается только в V2 (нет V1/V3 switcher) — `App.jsx` → `LayoutV2` only; `UiVersionContext` removed
- [x] Нет «Marketplace» в public UI (только предупреждение в admin guide)
- [x] Каталог / beat / courses / order / login / profile — V2 chrome
- [x] Плеер (play/pause/seek), избранное/корзина — V2 contexts + pages

## Hero CMS

- [x] В админке: toggle enabled, texts, upload/remove image — `AdminHeroPage` + `/api/admin/site-settings/hero`
- [x] `enabled=false` → hero скрыт на главной
- [x] С image → layout text+image (desktop/mobile)
- [ ] Тексты с админки видны на staging после сохранения — smoke на Render

## Banners

- [x] CRUD в админке — `AdminBannersPage` + `/api/admin/promo-banners`
- [x] Вне `[starts_at, ends_at]` не показываются — покрыто API-тестами
- [x] `enabled=false` не показывается
- [ ] Слайдер usable с клавиатуры / не ломает CLS — visual QA на staging

## Admin

- [x] Тёмный V2 admin shell + секции Сайт (hero/banners) и прочее CRUD
- [x] Beats/Courses редактируются после создания
- [x] Orders/Purchases/Revenue/Errors доступны
- [x] courses_visibility и oauth settings найдены без квеста
- [x] **Admin guide sync:** `/admin/guide` (`src/v2/admin/guide/adminGuideContent.js`) обновляется вместе с поведением админки/витрины (skill `beatstore-admin-guide`)

## Ship

- [ ] Изменения в `https://github.com/maxzxne/BeatStore` (`main`)
- [ ] Render: после `git push origin main` — Dashboard → **Manual Deploy → Deploy latest commit** на `srv-d3hc3j2li9vc73e10l80` (Docker, ~1–2 мин; **не** полагаться на auto-deploy), статус Live
- [ ] Smoke на `https://beatstore-dpym.onrender.com/`:
  - home + hero
  - open beat + play
  - `/order`
  - `/admin/login` → секция Сайт + `/admin/guide`
  - banner active/inactive sanity (если тестовые даты)

## Report to user

Коротко: что сделано, ссылка на коммит/PR, что проверить руками, известные риски.
