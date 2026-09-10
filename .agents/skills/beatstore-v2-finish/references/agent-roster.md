# Agent roster

Lead держит план и merge. Субагенты не знают историю чата — клади контекст в промпт.

## Roster

| Role | When | Prompt must include |
|---|---|---|
| **scout** | P0 start | paths, staging URL, “report facts only” |
| **planner** | after scout | mission SKILL + acceptance → task list |
| **v2-cutover** | P0 | remove FF/V1/V3 product paths; keep API |
| **admin-shell** | P1 | new admin IA + layout in V2 style |
| **admin-entities** | P1 | one domain per agent (beats / courses / orders…) |
| **hero-cms** | P2 | API + admin form + HomePageV2 binding |
| **banners** | P3 | model + CRUD + public slider |
| **profile-polish** | P4 | profile/cart/auth pages to V2 bar |
| **qa-visual** | each slice + end | playwright-cli checklist, viewports |
| **shipper** | P5 | commit message, push main, Render smoke |

## Parallel OK

- `hero-cms` ∥ `banners` (разные таблицы/ключи)
- `admin-shell` ∥ backend banner model (если контракт API согласован в плане)
- `profile-polish` ∥ `admin-entities` (разные деревья)

## Parallel NOT OK

- Два агента в `backend/main.py` без разрезанных секций
- Два агента в `HomePageV2.jsx`
- Cutover V2 + одновременный крупный рефактор App.jsx без очереди

## Implementer brief template

```text
Repo: /Users/max/Projects/BeatStore
Mission skill: .cursor/skills/beatstore-v2-finish/SKILL.md
Task ID: …
Goal: …
Touch: [files]
Do not touch: [files]
API contract: …
DoD: …
Staging: https://beatstore-dpym.onrender.com/
After: self-review + note risks
```

## Reviewer brief template

```text
Check spec compliance vs task DoD + admin-cms.md / acceptance.md
Flag: auth regressions, purchase breaks, a11y, mobile overflow, Marketplace word, V3 leftover
Return: ✅ or list of blocking findings only
```
