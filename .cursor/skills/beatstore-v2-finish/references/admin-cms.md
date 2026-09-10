# Admin + Marketing CMS

## Goal

Админка — полноценный CMS магазина, не «набор случайных страниц 2023».

## IA (suggested)

```text
/admin
  Обзор
  Каталог
    Биты
    Курсы
    Загрузка
  Продажи
    Покупки
    Заявки
    Доходы
  Сайт
    Главный экран (Hero)
    Баннеры
    Разделы (courses_visibility и др.)
  Система
    OAuth / входы
    Ошибки
    Выйти
```

Навигация: боковая, активный пункт ясен, mobile → drawer.

## UX standards

- Таблицы: поиск, сортировка, пагинация/virtual, empty state, destructive confirm.
- Формы: лейблы, ошибки у поля, disabled+loading на submit, unsaved guard где критично.
- Медиа: upload + preview + remove; не «путь строкой» как единственный UX.
- Даты баннеров: date-time в локали ru, показ статуса «сейчас активен / скоро / истёк».
- Permissions: только admin; 401 → login.

## Hero settings (P2)

Хранилище (вариант A — OK для старта): JSON в `site_settings`:

```json
{
  "enabled": true,
  "eyebrow": "XWinner",
  "title": "Инструменталы.\nЧёрный экран.\nЗелёный удар.",
  "subtitle": "Каталог битов...",
  "image_url": null,
  "cta_label": null,
  "cta_href": null
}
```

Вариант B: колонки/отдельная таблица — если JSON начнёт болеть.

API:

- `GET /site-settings` — публичные поля (hero + активные banners + courses_visibility)
- `GET|PUT /api/admin/site-settings/hero`
- upload cover: переиспользовать admin upload endpoint или `/api/admin/hero-image`

Публичка (`HomePageV2`):

- `enabled === false` → не рендерить hero section
- `image_url` → grid/flex: image left, copy right (mobile: image top)
- без image → текущий text-only layout
- **не** писать слово Marketplace

## Banners (P3)

Таблица `promo_banners` (предпочтительно):

| column | notes |
|---|---|
| id | pk |
| title | optional |
| body | optional |
| image_url | required for visual slide |
| link_url | optional |
| sort_order | int |
| enabled | bool |
| starts_at | datetime nullable = -∞ |
| ends_at | datetime nullable = +∞ |
| created_at / updated_at | |

Active rule:

```text
enabled
AND (starts_at IS NULL OR starts_at <= now)
AND (ends_at IS NULL OR ends_at >= now)
```

API:

- Public: `GET /promo-banners` → только active, sorted
- Admin: full CRUD `/api/admin/promo-banners`

UI публички: над каталогом или под hero; max разумный autoplay 5–8s; клавиатура; `aria-roledescription="carousel"`.

## Entity edit gaps to close

Пройди текущий admin и закрой «нельзя отредактировать»:

- Beats: все цены/файлы/метаданные после создания
- Courses: то же
- Orders: статусы/заметки
- OAuth visibility уже есть — встроить в новую IA
- Site settings не прятать в «OAuth settings»

## Visual language

Тот же V2 shell (`LayoutV2` / `SidebarV2` или новый `src/v2/admin/*`): тёмный, acid accent `#22C55E`, Syne headers, Poppins body. Плотные таблицы, не marketing cards.
