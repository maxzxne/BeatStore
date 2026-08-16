# BeatStore V3 — архитектура и миграция V2 → V3

Не начинать реализацию UI, пока нет отдельного подтверждения.

```text
V1 — первоначальная версия
V2 — текущая версия
V3 — новый premium redesign
Current UI: V2
Target UI: V3
```

## Принцип

Reuse functionality, not UI.

- Сохраняем: FastAPI, SQLite, JWT, API, данные, Auth/Audio/Cart/Favorites/Purchases.
- Переосмысляем: visual language, IA, layout, player, cards, admin chrome.
- Код V3 изолирован в `src/v3/**`. Не хаотично смешивать классы V2 и V3.

## Текущее состояние (факт)

V2 — не полноценный продукт, а переключатель `UiVersionContext` (`?ui=v1|v2` / localStorage).

V2-обвязка есть только у:

- Layout / Header / Sidebar / MiniPlayer / WelcomePopup
- HomePage, BeatPage, CoursesPage

Остальные маршруты в режиме V2 всё равно рендерят V1-страницы: cart, favorites, purchases, profile, login, register, checkout/payment, orders, admin, legal.

V2 визуально: Syne + Poppins, indigo glow, `#22C55E`, слово «Marketplace» на homepage. Это не база для V3.

## Предлагаемая архитектура frontend V3

```text
src/
  contexts/          # reuse: Auth, Audio, Notification, SiteSettings
  utils/api.js       # reuse
  v3/
    v3.css           # tokens
    LayoutV3.jsx
    HeaderV3.jsx
    FooterV3.jsx
    MiniPlayerV3.jsx
    components/      # BeatCard, Waveform, Filters, Button, ...
    pages/           # все public + account страницы
    admin/           # admin chrome + pages
  v2/                # freeze: не развивать, только держать до cutover
  pages/             # V1 freeze
```

`UiVersionContext` расширяется до `v1 | v2 | v3`.  
Дефолт до cutover: `v2`. Feature-flag: `?ui=v3` и `VITE_UI_VERSION`.  
После приёмки V3: дефолт `v3`, свитчер убрать или оставить hidden.

Хуки с бизнес-логикой (fetch beats, cart toggle, purchase types) вынести из JSX V1/V2 в `src/v3/hooks/` или `src/hooks/`, чтобы страницы V3 не копипастили API-вызовы.

## Что переиспользовать

| Слой | Решение |
|---|---|
| `api.js`, JWT interceptors | reuse, убрать console.log |
| Auth / Audio / Notification / SiteSettings | reuse; Audio — добавить bpm/key/peaks |
| Filters логика (genre, bpm, key, price) | reuse логики, новый UI |
| BeatCard/MiniPlayer/Header | replace |
| Tailwind 3 | reuse, extend tokens |
| Lucide | reuse |
| Backend endpoints | reuse |
| License model mp3/wav/exclusive | reuse как licenses в UI |

## Что заменить

Все visual components V1/V2. Native-looking audio bars. V2 spin-cover. Welcome popup в текущем виде — переосмыслить, не копировать.

## Порядок миграции

### Phase 0 — Foundation (без смены дефолта)

1. `html.ui-v3` токены из DESIGN.md
2. LayoutV3 + HeaderV3 + FooterV3
3. Primitive: Button, Input, Modal, Empty, Skeleton
4. Waveform + MiniPlayerV3 на существующем AudioPlayerContext
5. BeatCardV3

### Phase 1 — Public store

6. Homepage (artist store, не SaaS landing)
7. Catalog + search + filters
8. Beat page + license picker + player
9. Responsive QA hero/catalog/PDP

### Phase 2 — Commerce

10. Cart
11. Checkout / test-payment / success-failure
12. Favorites
13. Purchases / downloads
14. Login / Register / Profile

### Phase 3 — Courses + services

15. Courses list + detail (editorial, не Udemy)
16. Order / service request

### Phase 4 — Admin

17. Admin shell (sidebar/table/toolbar)
18. Dashboard, beats, upload, purchases, orders, courses, revenue, errors, oauth/settings

### Phase 5 — Cutover

19. Default UI = V3
20. Legal pages в V3 chrome
21. Удалить или спрятать V1/V2 свитчер
22. Полный visual QA по списку разрешений

Каждый пункт фазы: implement → run → browser → screenshot → fix.

## Backend

Не нужен для старта V3. Возможные минимальные follow-up (только после согласования):

- серверный search
- peaks/waveform cache
- реальная платёжка вместо test-payment
- producers/royalty schema

## Риски

См. раздел в ответе агента и таблицу ниже в canvas. Главные: неполный V2-switch, N+1 favorites/cart на каждой карточке, client-side search, test payment, отсутствие peaks, Telegram WebApp, глобальный `user-select: none`.
