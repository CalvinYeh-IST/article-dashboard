# IST 看見台灣基金會 — Design System

A design system derived from the internal tooling of **IST 看見台灣基金會 (Taiwan-Seeing Foundation)** — a non-profit publishing bilingual (中/英) editorial content about Taiwanese culture, cuisine, nature, and everyday life.

The source artifact is an internal **content operations dashboard** (`article-dashboard`) that tracks Chinese + English article pipeline progress. Its visual language — warm neutral paper tones, a single burnt-orange accent, small caps eyebrows, and hairline flat borders — is the root of this system.

> **Use this system when** designing any IST-facing interface: editorial dashboards, public-facing travel / article sites, AI itinerary planners, reader-facing tools. The aesthetic is quiet, editorial, Taiwanese-warm — not "SaaS blue".

---

## Sources

- **GitHub:** `CalvinYeh-IST/article-dashboard@main` — the internal content-operations dashboard. Root CSS + inline styles in `index.html` + `main.js` were the primary source of truth for tokens.
- **Brand identity lifted from the dashboard lock-screen:** `IST · 看見台灣基金會`, `Content Operations Dashboard`, `IST Internal Use Only`.
- **Font files:** None were bundled in the repo — the dashboard uses the system font stack (`-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica Neue, Arial`). For CJK rendering we recommend **Noto Sans TC** or **PingFang TC** (macOS default). ⚠️ No custom font substitution needed; but if the foundation has a bespoke brand face, please supply it.

---

## Index

| File / Folder | What's in it |
|---|---|
| `README.md` | This file — brand + visual foundations + content guide |
| `colors_and_type.css` | CSS custom properties for color + type + spacing + radii |
| `SKILL.md` | Cross-compatible Agent Skill description |
| `preview/` | Small HTML cards registered in the Design System tab |
| `ui_kits/article-dashboard/` | Pixel-level recreation of the internal dashboard |
| `assets/` | Logos, SVG icons, decorative assets |

---

## Content Fundamentals

The IST voice is **institutional-warm, bilingual, and understated.** It reads like a well-run public foundation's internal memo — never marketing copy.

### Tone & register
- **Traditional Chinese (zh-TW)** is the primary language. English supports it as a secondary label, not a translation of every string.
- **Formal, third-person, impersonal.** The dashboard never says 「你」or「我」. Everything is phrased as a system reporting status. e.g. 「本週英譯稿達成率 {n}%」, 「請確認翻譯卡關原因」.
- **Polite imperatives** with 請: 「請輸入存取密碼」, 「請主管提供後替換 hash」, 「請確認上架流程是否順暢」.
- **Data-first sentences.** Numbers and percentages are load-bearing. Example: 「中文內容已上架 55 篇，達成年度目標 135 篇的 41%」.
- **Status verbs are stable and reused:** 達標 / 接近 / 落後 / 危險 / 注意 / 正常 / 健康 / 偏低 / 警告.

### Casing & formatting
- **English labels use UPPERCASE with letter-spacing** as an eyebrow above Chinese values: `CONTENT OPERATIONS DASHBOARD`, `CHINESE ARTICLES LIVE`.
- **Chinese headings use weight 500 (medium), never 700 (bold).** Bold reads as shouty; IST stays quiet.
- **Mix of 半形/全形 punctuation is consistent:** 「」for quoted titles, ／ for bilingual separators, · (middle dot) between metadata fields.
- **Numbers always wear units.** Never bare `55` — always `55 篇`, `41%`, `8 小時`.

### Copy examples (verbatim from source)
- Lock screen: `IST · 看見台灣基金會` / `內容進度控管系統` / `Content Operations Dashboard` / `IST Internal Use Only`
- Empty state: `尚無 2026 週別庫存記錄`
- Loading: `載入資料中，請稍候…`
- CTA labels: `進入` / `儲存` / `取消` / `匯出 CSV` / `+ 新增文章`
- Status badges: `已上架` / `待上架` / `待改稿` / `待初審` / `翻譯中` / `審稿/校稿`
- Action advisories: `英譯庫存僅剩 {n} 篇，已低於警戒線 5 篇，需優先送譯至少 5 篇。`

### Emoji
**Not used.** The codebase explicitly refactored away from emoji in favour of CSS colour squares and text labels. Status is conveyed via tiny filled squares (6–8px) + coloured text, never 🟢🟡🔴.

---

## Visual Foundations

### Colour

The palette is **warm paper + burnt orange + chart accents.** Think 書法 / 宣紙 on your desk, not a tech startup.

- **Primary — `#C8621E` burnt orange (brand 橘).** Used for Chinese-content accents, primary CTAs, active tab indicators, lock-screen button. Hovers to `#9C4A12`.
- **Ink — `#1C1C1C` for headings, `#2D2D2D / #3D3D3D` for English-content series.**
- **Paper neutrals — `#F8F7F5` (app bg) → `#F2F1EE` (surface) → `#E2E0DC` (primary border) → `#9A9A96` (tertiary text) → `#6B6B6B` (caption strong).** All slightly warm; no pure greys.
- **Chart accents:** `#1D9E75` (English series green), `#7F77DD / #534AB7` (review / translate lanes), `#EF9F27` (pending amber).
- **Status:** `#1A6B45 / #D1FAE5` green, `#A35200 / #FEF3C7` amber, `#B91C1C / #FEE2E2` red. Borders always supplied (`#6EE7B7`, `#FDE68A`, `#FECACA`).

**Rule of thumb:** at most one "vivid" colour per screen. The page should feel beige, with orange punctuation.

### Type

- **System font stack** (`-apple-system, BlinkMacSystemFont, Segoe UI, PingFang TC, Noto Sans TC`). Flags as a substitution if a proper brand face is supplied later.
- **Hero numerals are thin (300)** with tight letter-spacing (`-0.02em`) to read as editorial, not dashboard.
- **Body/labels are 11–14px.** Very dense by web standards. Line-height 1.6–1.7 on prose.
- **UPPERCASE small-caps eyebrow** at 9–10px, letter-spacing `0.08–0.10em`, colour `#6B6B6B` — used above every stat block.
- **No serif, no display font.** System sans is the whole type system.

### Spacing & layout
- **4px base, never beyond 32px in a card.** Cards breathe on a 16–24px gutter.
- **Max page width ≈ 1100px.** It's a dashboard, not a web canvas.
- **Dense tables** with 10px row padding, 11px headers.
- **Grid usage:** `grid-template-columns: repeat(4, minmax(0,1fr))` for stat rows, `1fr 1fr` for dual-lang comparisons (中文 | 英譯 pattern is a recurring motif).

### Borders, radii, shadows
- **Flat by default.** The modern IST direction (see `executive` and `manager` views) uses `border-radius: 0` + 1px hairline borders. Buttons are 2px.
- **Legacy surfaces** (AI Q&A, modals, older blocks) use `12px` rounded cards — kept for components that need to float.
- **Shadows are barely there:** `0 1px 4px rgba(0,0,0,0.08)` for floating chips, `0 8px 32px rgba(0,0,0,0.12)` for modals. No glow, no coloured shadow.

### Backgrounds & imagery
- **Flat warm paper.** No gradients, no patterns, no textures. Hero areas are just bigger type on `#F8F7F5`.
- **Imagery policy:** The article-side content uses high-quality square thumbnails (landscape photography, Taiwanese scenery). Warm-leaning, naturalistic — no filters, no duotone. When unavailable, use a beige placeholder block — never an SVG illustration.

### Motion
- **Nearly none.** The only transitions in the codebase are: progress bar width `.4s`, button background `.15s`, modal overlay fade. No springs, no bounces.
- **Loading = pulsing text string,** not spinners or skeleton shimmers (though skeleton is acceptable for new surfaces).

### Interaction states
- **Hover:** background shifts one step lighter/warmer (e.g. `#fff → #f1efe8`, `#E6F1FB → #B5D4F4`). Never opacity changes.
- **Active/press:** background shifts one step darker (orange `#C8621E → #9C4A12`).
- **Focus:** border colour swaps to the active accent (`border-color: #185FA5` or `#C8621E`). No glow rings.
- **Selected tabs:** border-bottom accent in brand orange/blue, 2.5px thick.

### Transparency & blur
- **Used sparingly.** The cream callouts inside the "已上架文章" banner use `background: rgba(255,255,255,0.8)` to create a paper-on-paper feel. No backdrop-filter blur anywhere in the source.

### Cards
- `background: #fff; border: 1px solid #E2E0DC; padding: 1.25rem;`
- Radii: `0` for modern surfaces, `12px` for floating/modal surfaces
- No drop shadow by default — the hairline border does all the lifting.

---

## Iconography

- **The dashboard uses almost no iconography.** Deliberately. The one icon in the whole app is a text-glyph settings gear `⚙` rendered as 16px text. This is a stylistic choice — information density is communicated via colour blocks and typography, not icons.
- **Status indicators are CSS squares,** 6–10px filled blocks (e.g. `.ld` class, inline `<span style="background:var(--ist-orange); width:8px; height:8px;">`).
- **No icon font is bundled.** No emoji.
- **If icons are needed for new surfaces** (maps, media players, search), use **Lucide** (linked via CDN in prototypes) at stroke-width 1.5, colour `currentColor`, sized 14–18px. Lucide's hairline aesthetic matches IST's flat-border language better than Heroicons (which are chunkier).
- ⚠️ **Flagged substitution:** Lucide is our CDN fallback — it is NOT what the dashboard uses (the dashboard uses none). Please confirm IST has no preferred icon set before shipping Lucide to production.

### Logos
- No logo file exists in the source. The wordmark is text-only: **`IST · 看見台灣基金會`** rendered in the system font at weight 400–500. We've stored this as SVG text in `assets/logo-wordmark.svg` so it can be swapped later.

---

## Products covered

**One product** — the `article-dashboard` internal tool. The UI kit recreates:
- Lock / password screen
- Executive report view (long-numeral hero + KPI blocks + line chart mock)
- Manager report view (達標率 table + weekly card)
- Back-office article table (filter bar + status badges)
- AI Q&A view (summary + Q&A accordion)
- Modal component (新增文章)

The prototype in the pasted prompt (**Taiwan Travel Articles & AI Itinerary Planner**) is a *new* surface — not a recreation. We've placed a starter file at `ui_kits/article-dashboard/Planner.html` using these tokens so the aesthetic carries across.
