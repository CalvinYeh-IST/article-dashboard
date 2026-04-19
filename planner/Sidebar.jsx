// ============================================================
// Sidebar — 5 top-level entries per main.js structure
// ============================================================
const { useState, useEffect, useRef, useMemo } = React;

// Inline icons (lucide-style strokes)
const Icon = {
  docs:    (s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8M8 9h3"/></svg>,
  folder:  (s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  sparkle: (s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.5L19 10l-5.1 1.5L12 17l-1.9-5.5L5 10l5.1-1.5L12 3z"/><path d="M19 17l.7 2.1L22 20l-2.3.9L19 23l-.7-2.1L16 20l2.3-.9L19 17z"/></svg>,
  chart:   (s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 15l4-6 4 3 5-9"/></svg>,
  map:     (s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v16M15 6v16"/></svg>,
  close:   (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>,
  clock:   (s=12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
  pin:     (s=12) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-7-7-7-12a7 7 0 0 1 14 0c0 5-7 12-7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>,
  alert:   (s=13) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17v.01"/><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>,
  send:    (s=14) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>,
  search:  (s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>,
};

// Sidebar items — 5 top-level per user's spec
const NAV_ITEMS = [
  { key: 'reports',  label: '報告版',          sub: 'Reports',        icon: Icon.docs(16),    dashView: 'exec',    children: [
    { key: 'exec',   label: '長官報告版',       sub: 'Executive' },
    { key: 'mgr',    label: '主管報告版',       sub: 'Manager' },
  ]},
  { key: 'manage',   label: '文章管理',         sub: 'Articles',       icon: Icon.folder(16),  dashView: 'search',  children: [
    { key: 'search', label: '文章查詢',         sub: 'Search & Filter' },
    { key: 'ops',    label: '後台編輯版',       sub: 'Content Ops' },
  ]},
  { key: 'qa',       label: 'AI 數據摘要',       sub: 'AI Summary',     icon: Icon.sparkle(16), dashView: 'qa'   },
  { key: 'dbstats',  label: '資料庫統計視覺化', sub: 'Database Stats', icon: Icon.chart(16),   dashView: 'dbstats' },
  { key: 'planner',  label: 'AI 行程規劃',      sub: 'Itinerary Planner', icon: Icon.map(16) },
];

function Sidebar({ view, subView, setView, setSubView }) {
  return (
    <aside style={{
      width: 240, flexShrink: 0,
      background: '#fff',
      borderRight: '1px solid #E8E8E4',
      display: 'flex', flexDirection: 'column',
      padding: '22px 14px',
      overflow: 'auto',
    }}>
      <div style={{ padding: '0 8px 20px', borderBottom: '1px solid #F1EFE8', marginBottom: 16 }}>
        <div style={{ fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#C8621E', fontWeight: 600 }}>IST</div>
        <div style={{ fontSize: 13, color: '#1C1C1C', fontWeight: 500, marginTop: 2, letterSpacing: '.01em' }}>看見台灣基金會</div>
        <div style={{ fontSize: 10, color: '#9A9A96', marginTop: 1 }}>Content Platform</div>
      </div>

      {NAV_ITEMS.map(it => {
        const active = view === it.key;
        return (
          <div key={it.key}>
            <button
              onClick={() => {
                setView(it.key);
                if (it.children && it.children.length > 0) {
                  setSubView(it.children[0].key);
                }
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px',
                marginBottom: 2,
                border: 'none',
                background: active ? '#FBF0E8' : 'transparent',
                color: active ? '#C8621E' : '#1C1C1C',
                borderRadius: 0,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'left',
                width: '100%',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#F8F7F5'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ color: active ? '#C8621E' : '#888780', display: 'flex' }}>{it.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: active ? 500 : 400, letterSpacing: '.01em' }}>{it.label}</div>
                <div style={{ fontSize: 9, color: active ? '#C8621E' : '#9A9A96', opacity: .8, marginTop: 1, letterSpacing: '.04em' }}>{it.sub}</div>
              </div>
            </button>

            {/* Sub-nav */}
            {active && it.children && it.children.length > 0 && (
              <div style={{ marginBottom: 6, paddingLeft: 38 }}>
                {it.children.map(sub => {
                  const subActive = subView === sub.key;
                  return (
                    <button
                      key={sub.key}
                      onClick={() => setSubView(sub.key)}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '6px 8px',
                        border: 'none',
                        background: 'transparent',
                        color: subActive ? '#C8621E' : '#6B6B6B',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: subActive ? 500 : 400,
                        letterSpacing: '.02em',
                        borderLeft: subActive ? '2px solid #C8621E' : '2px solid #F1EFE8',
                        marginBottom: 1,
                      }}
                    >
                      {sub.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div style={{ marginTop: 'auto', padding: '10px 8px 0', borderTop: '1px solid #F1EFE8', fontSize: 9, color: '#9A9A96', letterSpacing: '.04em', lineHeight: 1.5 }}>
        {(window.ENRICHED_ARTICLES||[]).length} 篇文章 · 最後同步 2026-04-19
      </div>
    </aside>
  );
}

// ========== Pending-estimate badge ==========
function EstimatedBadge({ compact }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: compact ? 9 : 10,
      padding: compact ? '1px 6px' : '2px 8px',
      borderRadius: 0,
      background: '#FEF3C7',
      border: '1px solid #FDE68A',
      color: '#854F0B',
      fontWeight: 500,
      letterSpacing: '.02em',
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#A35200' }} />
      AI 預估 · 待管理員確認
    </span>
  );
}

Object.assign(window, { Sidebar, EstimatedBadge, Icon, NAV_ITEMS });
