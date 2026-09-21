# Admin Users CRM — Design

**Date:** 2026-09-21  
**Status:** approved for implementation  
**UI:** V2 admin only

## Goal

Админ видит покупателей (список + LTV), открывает карточку с контактами и историей покупок (биты / курсы / услуги), пишет в существующий in-app support-чат (get-or-create тред).

## Out of scope (v1)

Email, тикеты, заметки/теги, бан/редакт профиля, гости без `user_id`, CSV-экспорт, массовые действия.

## API (admin-only)

### `GET /api/admin/users`

Query: `q` (search), `sort` = `ltv` | `created_at` | `last_purchase` (default `ltv`), `page` (1-based), `page_size` (default 50, max 100).

Response:

```json
{
  "total": 12,
  "page": 1,
  "page_size": 50,
  "items": [
    {
      "id": 1,
      "username": "buyer",
      "email": "a@b.c",
      "is_admin": false,
      "created_at": "...",
      "purchase_count": 3,
      "ltv": 7500.0,
      "last_purchase_at": "..."
    }
  ]
}
```

Search: username, email, `additional_contact` (substring, case-insensitive).

LTV: `sum(Purchase.price_paid) + sum(CoursePurchase.price_paid) + sum(ServiceOrder.price)` for orders with status in `paid|completed` and non-null price.  
`purchase_count`: count of beat + course purchases + counted service orders (same status filter).

### `GET /api/admin/users/{id}`

404 if missing.

```json
{
  "id": 1,
  "username": "buyer",
  "email": "...",
  "is_admin": false,
  "is_active": true,
  "oauth_provider": null,
  "created_at": "...",
  "contacts": [{"type": "telegram", "value": "@x"}],
  "totals": {
    "ltv": 7500.0,
    "beats": 2,
    "courses": 1,
    "services": 0
  },
  "history": [
    {
      "type": "beat",
      "id": 10,
      "title": "Night",
      "amount": 1500.0,
      "date": "...",
      "meta": {"purchase_type": "mp3"}
    }
  ],
  "support_thread_id": null
}
```

History: beats + courses + all service orders for this user (any status), sorted by date desc. Service amount = `price` or 0; meta includes `status`.

### `POST /api/admin/users/{id}/support-thread`

Get-or-create `SupportThread`. Returns `{ "thread_id": N }`.

## UI

- Sidebar «Продажи»: пункт «Пользователи» → `/admin/users`
- List + search + sort; row → `/admin/users/:id`
- Detail: profile, contacts, totals, history timeline, CTA «Написать в поддержку»
- CTA → POST support-thread → navigate `/admin/support?threadId=N`
- `AdminSupportPage` opens `threadId` from query (works for empty threads)

## Auth

Все endpoints: `get_current_admin_user`. Non-admin → 401/403.
