---
name: beatstore-payments
description: Use when adding, changing, or debugging BeatStore checkout, acquiring, Robokassa, YooKassa, webhooks, payment success/failure pages, or switching test vs live payments.
---

# BeatStore payments

Public UI is V2. Money moves only after a **signed provider callback**, never after the browser says so.

## Hard rules

- Do not trust `payment_success` from the client.
- Create a `PaymentIntent` first. Amount is quoted **on the server**.
- Fulfill purchases only from ResultURL / webhook (or `/payments/simulate` when `PAYMENT_TEST=true`).
- Success page **polls** intent status. It does not grant files.
- Live vs test is env, not a code fork. Same URLs, same pages.

## Provider switch

| Env | Now | Later |
|---|---|---|
| `PAYMENT_PROVIDER` | `robokassa` | `yookassa` later |
| `PAYMENT_TEST` | `true` | `false` |
| Robokassa | `ROBOKASSA_*` + `IsTest=1` | same keys, test passwords → live passwords, `PAYMENT_TEST=false` |

Empty MerchantLogin + `PAYMENT_TEST=true` → public demo shop `demo`, checkout still goes to `auth.robokassa.ru`. Local `/payment/pay` is only a manual simulator.

## Flow

```text
Buy → POST /payments/create → checkout_url
  Robokassa hosted: auth.robokassa.ru (IsTest=1 if PAYMENT_TEST)
Provider ResultURL → POST /payments/robokassa/result → OK{InvId}
Browser → /payment/success?InvId= → GET /payments/intents/{id} until paid|failed
```

## Pages (V2 only)

`src/v2/Payment*.jsx` — success, failure, pending, pay terminal. Copy: Russian, what happened + next action. Test badge if `test: true`.

## Do not

- Grant a Purchase because SuccessURL loaded.
- Keep `/test-payment` as a real checkout.
- Put secrets in the repo. `.env` only.
- Mix V1 gray cards or V3 tokens into payment chrome.
