# article-dashboard UI Kit

Recreation of IST 內容進度控管系統 — the internal content operations dashboard.

## Files
- `index.html` — interactive click-thru (lock → dashboard → tabs → modal)
- `Dashboard.jsx` — main shell with tab bar
- `ExecutiveView.jsx` — long-numeral hero + KPI + bilingual progress blocks
- `ManagerView.jsx` — 達標率 table + weekly card + action advisory
- `OpsView.jsx` — article table with filter bar + status badges + edit modal
- `QAView.jsx` — AI summary highlights + Q&A accordion
- `LockScreen.jsx` — password screen with IST wordmark
- `Primitives.jsx` — Pill, Badge, ProgressBar, StatCard, Button

Source fidelity lifted from `CalvinYeh-IST/article-dashboard@main` (index.html + main.js).

## Planner.html (separate)
The `Planner.html` file in this folder is the **Taiwan Travel Articles & AI Itinerary Planner** prototype described in the original prompt — a new surface built on IST tokens. It's not part of the dashboard recreation.
