# BeatStore — agent instructions

Official premium beat store for **XWinner** (`XWinner.beats.please`). Not a marketplace.

```text
V1 — original UI (legacy, not served)
V2 — shipped product UI (dark OLED + acid green, src/v2)
V3 — historical design docs / unused src/v3 (not product)

Current UI: V2
Target UI: V2 (shipped)
```

## Always

- Read `DESIGN.md` before UI work (V3 sections are historical; shipped chrome is V2).
- Read `.cursor/rules/` — frontend tokens, visual QA, backend safety.
- Reuse API, SQLite, JWT, and React contexts. Public UI = `src/v2` only.
- Skills: `ui-ux-pro-max`, `frontend-design`, `superdesign`, `playwright-cli`, `beatstore-payments`, `beatstore-qa`, `beatstore-admin-guide`. Superpowers process skills live in `.cursor/skills/`.
- Payments: webhook fulfills (`backend/payments`), V2 pages in `src/v2/Payment*.jsx`. Skill `.cursor/skills/beatstore-payments/SKILL.md`.
- QA: agent runs `backend/.venv/bin/python -m unittest discover -s backend/tests -v` (or `npm test`). Isolated SQLite, no live Robokassa cabinet / OAuth. User does final acceptance only. Skill `.cursor/skills/beatstore-qa/SKILL.md`.
- **Admin guide sync:** любое изменение поведения админки/витрины → сразу обновить `/admin/guide` (`src/v2/admin/guide/adminGuideContent.js`) в том же коммите/пуше. Skill `.cursor/skills/beatstore-admin-guide/SKILL.md`. Личные заметки админа — в БД, не в коде.
- **Finish mission (V2-only + admin CMS + hero/banners + Render):** largely shipped in code; remaining = staging Manual Deploy + smoke. Checklist: `.cursor/skills/beatstore-v2-finish/references/acceptance.md`. Orchestrator: `.cursor/skills/beatstore-v2-finish/SKILL.md`.

## Visual QA

`npx playwright-cli` — open, click, type, screenshot, resize. A screen is done only after real browser review.

## Superdesign

CLI: `npx superdesign`. Requires `npx superdesign login` (user action). Canonical design system is root `DESIGN.md`.
