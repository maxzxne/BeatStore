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
- Skills: `ui-ux-pro-max`, `frontend-design`, `superdesign`, `playwright-cli`, `beatstore-payments`, `beatstore-qa`. Superpowers process skills live in `.cursor/skills/`.
- Payments: webhook fulfills (`backend/payments`), V2 pages in `src/v2/Payment*.jsx`. Skill `.cursor/skills/beatstore-payments/SKILL.md`.
- QA: agent runs `backend/.venv/bin/python -m unittest discover -s backend/tests -v` (or `npm test`). Isolated SQLite, no live Robokassa cabinet / OAuth. User does final acceptance only. Skill `.cursor/skills/beatstore-qa/SKILL.md`.
- **Finish mission (V2-only + admin CMS + hero/banners + Render):** `.cursor/skills/beatstore-v2-finish/SKILL.md` — lead agent must orchestrate subagents, not solo-rewrite everything.

## Visual QA

`npx playwright-cli` — open, click, type, screenshot, resize. A screen is done only after real browser review.

## Superdesign

CLI: `npx superdesign`. Requires `npx superdesign login` (user action). Canonical design system is root `DESIGN.md`.
