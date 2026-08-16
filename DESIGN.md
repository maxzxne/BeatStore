# BeatStore V3 — Design System

Canonical source of truth for all V3 UI.

```text
V1 — первоначальная версия
V2 — текущая версия (indigo + acid green)
V3 — 2026 music-tech product UI

Current UI: V2
Target UI: V3
```

V3 — **modern digital music product** для аудитории 18–35 (Spotify / Apple Music / Ableton / FL / TikTok).  
Не marketplace, не лейбл 2015, не luxury hotel, не fashion magazine, не ecommerce template.

Не смешивать V1/V2 визуал. Не использовать `design-system/beatstore-v2`.

---

## 1. Positioning

**Product:** XWinner.beats.please — official beat store бренда XWinner.

Ощущение:

> Это крутой сайт современного продюсера. Хочется сразу слушать.

Не:

> Интернет-магазин музыкальных товаров / сайт лейбла / премиальный журнал.

### Direction

**2026 music-tech:** Spotify density + artist site media + DAW precision + fashion crop + modern ecommerce speed.

Характеристики: dark, sharp, dense, contrast, contemporary, minimal but not boring, producer-native.

### Anti-patterns (hard ban)

- serif-heavy / Cormorant as hero
- beige-brown luxury, gold luxury, tungsten-as-brand
- editorial magazine / newspaper layout
- music label website 2012–2018
- generic rounded ecommerce cards
- glassmorphism, neumorphism, huge gradients
- purple AI, acid green (`#22C55E`), indigo glow
- Inter-only, Poppins, Syne, Righteous
- слово Marketplace в public UI
- fade-in каждой секции
- «три карточки / секция / три карточки»

### Signature

**Sticky DAW-style player + oversized cropped artwork.**  
Waveform — инструмент, не декорация.

---

## 2. Color

Cold near-black. Monochrome. Accent = white interaction, не золото.

| Token | Hex | Role |
|---|---|---|
| `--bg` | `#09090B` | page |
| `--surface` | `#111113` | rows, header |
| `--surface-2` | `#18181B` | hover, elevated |
| `--surface-3` | `#27272A` | overlay |
| `--border` | `#27272A` | hairline |
| `--border-strong` | `#3F3F46` | strong |
| `--text` | `#FAFAFA` | primary |
| `--text-muted` | `#A1A1AA` | secondary |
| `--text-faint` | `#71717A` | meta |
| `--accent` | `#FAFAFA` | play, CTA, playhead, active |
| `--accent-hover` | `#E4E4E7` | hover CTA |
| `--on-accent` | `#09090B` | text on CTA |
| `--accent-soft` | `rgba(250,250,250,0.08)` | playing row |
| `--danger` | `#F87171` | destroy |
| `--success` | `#4ADE80` | confirm only, never play |
| `--ring` | `#FAFAFA` | focus |

Playing state: row `--accent-soft`, waveform played = `--text`, unplayed = `--border-strong`.  
Не красить интерфейс акцентом. White — только interaction.

---

## 3. Typography

Только modern grotesk + mono. Serif запрещён как основной язык.

| Role | Family | Usage |
|---|---|---|
| Display / UI | **Space Grotesk** 400–700 | hero title, nav, tracks, buttons |
| Data | **IBM Plex Mono** 400–500 | BPM, key, time, price |

```css
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Space+Grotesk:wght@400;500;600;700&display=swap');
```

| Token | Size | Tracking |
|---|---|---|
| `--type-hero` | clamp(44px, 7vw, 84px) | -0.05em |
| `--type-h1` | clamp(28px, 3vw, 40px) | -0.04em |
| `--type-h2` | 22px | -0.03em |
| `--type-body` | 15px | 0 |
| `--type-sm` | 13px | 0.01em |
| `--type-xs` | 11px | 0.12em uppercase |
| `--type-data` | 12px | 0.04em |

Hero title — Space Grotesk 700, not italic serif.  
BPM/KEY — mono, always.

---

## 4. Space, radius, density

Public store: **dense**. Не magazine whitespace.

| Token | Value |
|---|---|
| `--space-1`–`--space-6` | 4 / 8 / 12 / 16 / 24 / 32 |
| `--header` | 52px |
| `--player` | 64px |
| `--content` | 1200px |

Radius: `--r-sm: 2px`, `--r-md: 4px`, `--r-full` только для play hit на artwork.  
Не rounded-xl cards. Не pill CTA.

Hero: edge-to-edge, asymmetric, oversized crop.  
Catalog: track rows, не grid квадратных карточек.

---

## 5. Components

### Buttons

- Primary: white bg, black text, 40px, radius 4px, weight 600. Hover: scale 1.02, 140ms.
- Secondary: transparent + hairline.
- Icon: 40×40, square-ish 4px, `aria-label`.

### Header

Solid `--bg`, no blur. Wordmark `XW` compact + `XWINNER` from md.  
Active nav: white, не золотое подчёркивание.  
Mobile: wordmark + login/cart; links second row.

### Beat track (not ecommerce card)

Горизонтальный ряд: artwork 64–72 · play · title · BPM · key · price · fav/cart.  
Hover: surface-2, art scale 1.06, play visible.  
Playing: left 2px white bar.  
Tap play работает без hover (mobile).

### Player

Sticky, full-bleed, 64px, top hairline, **0 radius**.  
Artwork 48, title, waveform flex-1, time, volume, close.  
Keyboard: Space, ←/→ ±5s, M.  
Не spin cover. Не native `<audio controls>`.

Waveform: 160–200 real peaks, thin columns, played white.

### Filters

Text tabs, не chips. Search — underline field, не rounded box.

---

## 6. Motion

Fast, spring-like, restrained.

`--ease: cubic-bezier(0.22, 1.1, 0.36, 1)`  
`--t-fast: 120ms` `--t: 160ms`

Разрешено: hover scale, playhead, art crop, button press, row highlight.  
Запрещено: fade-in всех секций, ken-burns luxury, bounce, spin, layout-shift height.

`prefers-reduced-motion: reduce` — сразу конечное состояние.

---

## 7. Homepage

Первый экран = **featured listen + начало каталога**, не landing value prop.

- Oversized cropped artwork, но не full-viewport poster
- `--stage: min(48dvh, 520px, calc(100dvh - header - 380px))` — в первом viewport видны catalog chrome и минимум 2 строки треков
- Track title grotesk
- Floating BPM / key
- Waveform на media
- Catalog как tracklist сразу под ним

Не hero «Official Beat Store» + две CTA. Не `min-height: 82vh` на stage.

---

## 8. Accessibility / responsive

Контраст 4.5:1, focus ring, 44px touch, no horizontal scroll, `user-select` разрешён.  
Breakpoints: 375 / 390 / 430 / 768 / 1024 / 1280 / 1440 / 1920.

---

## 9. Copy

Слушать / В корзину. Не Get started, не Marketplace.

---

## 10. Implementation

Токены: `html.ui-v3` в `src/v3/v3.css`.  
Код: `src/v3/**`. Contexts + API reuse. Lucide. Backend не трогать ради UI.

Quality gate: «22-летний битмейкер хочет этим пользоваться?» Если нет — переделать, не полировать luxury.
