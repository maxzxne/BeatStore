# BeatStore V2 Finish Implementation Plan

> **For agentic workers:** Use `beatstore-v2-finish` + `subagent-driven-development`. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Ship only V2 (screenshot look), rewrite admin, Hero CMS + dated banners, push `main`, smoke on Render.

**Architecture:** Public UI = `src/v2` only. Kill UiSwitch/UiVersion FF. Admin = new `src/v2/admin/*` shell. Marketing via `SiteSetting` JSON (hero) + `promo_banners` table. Staging: https://beatstore-dpym.onrender.com/

**Tech stack:** React 18 + Vite + Tailwind, FastAPI + SQLite, JWT admin.

---

## File map

| Area | Touch |
|---|---|
| Cutover | `src/App.jsx`, delete/stop using `UiSwitch`, simplify/remove `UiVersionContext`, `src/v2/UiPage.jsx`, docs |
| Hero | `backend/main.py`, `SiteSettingsContext`, `HomePageV2.jsx`, `src/v2/admin/HeroSettings.jsx` |
| Banners | `backend/models.py`, CRUD API, `PromoSliderV2.jsx`, admin CRUD page |
| Admin | `src/v2/admin/*`, routes under `/admin` |
| Docs | `AGENTS.md`, `DESIGN.md` header → shipped V2 |

---

### Task 1: V2-only cutover (P0)

**DoD:** No V1/V2/V3 switcher; all public+admin chrome is LayoutV2; default dark V2; no «Marketplace» eyebrow; App imports no v3 pages.

- [x] Wire `App.jsx` to `LayoutV2` + V2 pages only (fallback missing V2 pages → restyle v1 pages under LayoutV2 temporarily for cart/favorites/etc.)
- [x] Remove `<UiSwitch />` and `UiVersionProvider` usage (or force v2 class on html always)
- [x] Keep `html.ui-v2` + `v2.css` always on via `main.jsx` / LayoutV2
- [x] HomePageV2: replace `Marketplace` → `XWinner` (or empty/brand)
- [x] Update `AGENTS.md` + short note in `DESIGN.md`: Current=Target=V2 for this ship
- [x] Commit

### Task 2: Hero CMS backend + public (P2)

- [ ] `site_settings` key `home_hero` JSON (enabled, eyebrow, title, subtitle, image_url, cta_*)
- [ ] Public GET includes hero; admin PUT + image upload
- [ ] HomePageV2 reads settings; hide if disabled; image left layout
- [ ] Commit

### Task 3: Promo banners (P3)

- [ ] Model + migrate + public/admin API with date window filter
- [ ] `PromoSliderV2` on home
- [ ] Admin CRUD UI (can land with Task 4 shell)
- [ ] Commit

### Task 4: Admin redesign shell + marketing pages (P1)

- [ ] New sidebar IA: Обзор / Каталог / Продажи / Сайт / Система
- [ ] V2 visual density; Hero + Banners pages
- [ ] Re-home existing admin entity pages into new shell without breaking APIs
- [ ] Commit

### Task 5: Profile + storefront polish (P4)

- [ ] Profile/cart/favorites/login visual pass under V2
- [ ] Commit

### Task 6: Ship (P5)

- [ ] Push to GitHub `main` (merge feat branch)
- [ ] Render Dashboard → **Manual Deploy → Deploy latest commit** (`srv-d3hc3j2li9vc73e10l80`)
- [ ] Smoke live URL after Live badge
- [ ] Report

---

## Ruling

- Visual reference = user screenshot (dark OLED, acid green, Syne hero, pill search). V3 docs temporarily superseded for ship.
- Do not delete entire `src/v3` folder in Task 1 if risky — stop importing it; delete in follow-up cleanup commit.
