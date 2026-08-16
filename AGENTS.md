# BeatStore — agent instructions

Official premium beat store for **XWinner** (`XWinner.beats.please`). Not a marketplace.

```text
V1 — original UI
V2 — current UI (partial dark shell in src/v2)
V3 — target UI (DESIGN.md, to be built in src/v3)

Current UI: V2
Target UI: V3
```

## Always

- Read `DESIGN.md` before UI work.
- Read `.cursor/rules/` — V3 positioning, frontend tokens, visual QA, backend safety.
- Reuse API, SQLite, JWT, and React contexts. Do not mix V2 visuals into V3.
- Skills: `ui-ux-pro-max`, `frontend-design`, `superdesign`, `playwright-cli`. Superpowers process skills live in `.cursor/skills/`.

## Visual QA

`npx playwright-cli` — open, click, type, screenshot, resize. A screen is done only after real browser review.

## Superdesign

CLI: `npx superdesign`. Requires `npx superdesign login` (user action). Canonical design system is root `DESIGN.md`.
