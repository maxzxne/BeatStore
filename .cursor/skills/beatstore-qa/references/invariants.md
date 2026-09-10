# BeatStore invariants

Источник истины — сервер. UI только отображает.

## Money

1. Сумма intent = `payments.quote` / `create_checkout._quote`. Поле суммы из браузера не источник.
2. Purchase / CoursePurchase / `ServiceOrder.status=paid` только из `fulfill_intent` после paid-path: ResultURL (Password2) или `POST /payments/simulate` при `PAYMENT_TEST=true`.
3. `POST /beats/{id}/purchase` и `POST /courses/{id}/purchase` с `payment_success` на платный товар → 400. `POST /payment/process-cart` → 400.
4. `POST /payments/simulate` при `PAYMENT_TEST` не true → 403, без fulfill.
5. ResultURL: плохая подпись → 400, без Purchase. `OutSum` ≠ quoted amount → 400, intent failed.
6. Повторный fulfill того же pending→paid intent — один Purchase (идемпотентность).
7. Exclusive (`allow_multiple_purchases=false`): один Purchase на бит; повторная продажа не грантит доступ и не должна оставлять «paid без файла»; бит уходит из `GET /beats`.
8. Корзина: `beats_formats` задаёт `purchase_type`; после fulfill корзина пустая.
9. `GET /payments/intents/{id}` чужого пользователя → 403. Simulate чужого → 403. Simulate без JWT на чужой intent → 401.
10. Download бита/курса без своей покупки → 401/403. Файл не выдаётся по факту открытия success page.

## Access

11. `courses_visibility=hidden|admins_only` → публичный `GET /courses` 403; админ с admin JWT — ок.
12. Промо: `enabled=false` или вне `[starts_at, ends_at]` нет в `GET /promo-banners`. Админка видит все.
13. `/api/admin/*` без admin JWT (`type=admin`) → 401. Обычный `/login` токен не проходит.
14. Quote услуг: «бит в стиле трэп» = 15000 до предоплаты; дедлайн 7 дней (50%) = 35000, не слот 7–14.

## License

`purchase_type` ∈ `mp3|wav|exclusive`. Это не отдельная сущность License.
