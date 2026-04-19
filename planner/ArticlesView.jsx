// ============================================================
// View 1: Article Management — searchable grid of article cards
// Field compat with main.js: dateZh/dateEn, theme[], region[], season[], has[], status
// ============================================================
const S_BADGE = {
  '已上架': { bg: '#EAF3DE', fg: '#3B6D11' },
  '待上架': { bg: '#FAEEDA', fg: '#854F0B' },
  '待初審': { bg: '#E6F1FB', fg: '#185FA5' },
  '待改稿': { bg: '#EEEDFE', fg: '#3C3489' },
  '審稿中': { bg: '#EEEDFE', fg: '#3C3489' },
};
const hasDate = d => d && String(d).trim().length >= 6 && !/^[-—–/\ Na]+$/.test(String(d).trim());

function ArticleCard({ a, onOpen }) {
  const s = S_BADGE[a.status] || { bg: '#F2F1EE', fg: '#6B6B6B' };
  return (
    <div
      onClick={() => onOpen(a)}
      style={{
        background: '#fff',
        border: '1px solid #E8E8E4',
        borderRadius: 10,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform .15s, box-shadow .15s',
        display: 'flex', flexDirection: 'column',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 20px -4px rgba(28,28,28,.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <div style={{ height: 140, backgroundImage: `url(${a.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 4 }}>
          <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, background: s.bg, color: s.fg, fontWeight: 500 }}>{a.status}</span>
        </div>
        {a.coordsEstimated && (
          <div style={{ position: 'absolute', top: 10, right: 10 }}>
            <EstimatedBadge compact />
          </div>
        )}
      </div>
      <div style={{ padding: '12px 14px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 10, color: '#888780', letterSpacing: '.04em', marginBottom: 4 }}>
          {a.city} · {a.area}
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: '#1a1a1a', lineHeight: 1.4, marginBottom: 6 }}>{a.title}</div>
        <div style={{ fontSize: 11.5, color: '#6B6B6B', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 10 }}>
          {a.description}
        </div>
        <div style={{ marginTop: 'auto', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {(a.theme || []).slice(0, 2).map(t => (
            <span key={t} style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, background: '#F2F1EE', color: '#6B6B6B' }}>{t}</span>
          ))}
          {(a.region || []).slice(0, 1).map(r => (
            <span key={r} style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10, background: '#FBF0E8', color: '#C8621E' }}>{r}</span>
          ))}
        </div>
        <div style={{ marginTop: 8, fontSize: 10, color: '#9A9A96', display: 'flex', gap: 10 }}>
          <span>中: {hasDate(a.dateZh) ? a.dateZh : '—'}</span>
          <span>英: {hasDate(a.dateEn) ? a.dateEn : '—'}</span>
        </div>
      </div>
    </div>
  );
}

function ArticleChip({ label, active, onClick, color = '#185FA5' }) {
  return (
    <button onClick={onClick} style={{
      fontSize: 11, padding: '4px 11px', borderRadius: 14,
      border: `1px solid ${active ? color : '#d3d1c7'}`,
      background: active ? color : '#fff',
      color: active ? '#fff' : '#6B6B6B',
      cursor: 'pointer',
      fontFamily: 'inherit',
      fontWeight: active ? 500 : 400,
      transition: 'all .12s',
    }}>{label}</button>
  );
}

function ArticlesView({ onOpenArticle }) {
  const [q, setQ] = useState('');
  const [theme, setTheme] = useState(null);
  const [region, setRegion] = useState(null);
  const [status, setStatus] = useState(null);

  const THEMES = ['文化美食','自然生態','常民生活','藝術文化'];
  const REGIONS = ['北部','中部','南部','東部','離島'];
  const STATUSES = ['已上架','待上架','待初審','審稿中'];

  const filtered = useMemo(() => {
    return window.ENRICHED_ARTICLES.filter(a => {
      if (q && !(a.title.includes(q) || a.description.includes(q) || a.city.includes(q) || a.area.includes(q))) return false;
      if (theme && !(a.theme || []).includes(theme)) return false;
      if (region && !(a.region || []).includes(region)) return false;
      if (status && a.status !== status) return false;
      return true;
    });
  }, [q, theme, region, status]);

  return (
    <div style={{ padding: '28px 36px', background: '#F8F7F5', minHeight: '100%' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#C8621E', fontWeight: 600, marginBottom: 4 }}>Article Management</div>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: '#1a1a1a', margin: 0, letterSpacing: '-.005em' }}>文章管理</h1>
        <p style={{ fontSize: 12, color: '#6B6B6B', margin: '4px 0 0' }}>搜尋、篩選資料庫中的所有文章 · 支援主題、區域、狀態組合條件</p>
      </div>

      {/* Search */}
      <div style={{
        background: '#fff',
        border: '1px solid #E8E8E4',
        borderRadius: 10,
        padding: '14px 18px',
        marginBottom: 14,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ color: '#888780', display: 'flex' }}>{Icon.search(15)}</span>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="搜尋標題、描述、城市、鄉鎮區…"
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: '#1a1a1a', fontFamily: 'inherit', padding: '4px 0', background: 'transparent' }}
        />
        <span style={{ fontSize: 10, color: '#9A9A96', letterSpacing: '.04em' }}>{filtered.length} 筆結果</span>
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', border: '1px solid #E8E8E4', borderRadius: 10, padding: '14px 18px', marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 10, alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: '#888780', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 500 }}>主題</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            <ArticleChip label="全部" active={!theme} onClick={() => setTheme(null)} color="#C8621E" />
            {THEMES.map(t => <ArticleChip key={t} label={t} active={theme === t} onClick={() => setTheme(theme === t ? null : t)} color="#C8621E" />)}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 10, alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: '#888780', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 500 }}>區域</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            <ArticleChip label="全部" active={!region} onClick={() => setRegion(null)} />
            {REGIONS.map(r => <ArticleChip key={r} label={r} active={region === r} onClick={() => setRegion(region === r ? null : r)} />)}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 10, alignItems: 'center' }}>
          <div style={{ fontSize: 10, color: '#888780', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 500 }}>狀態</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            <ArticleChip label="全部" active={!status} onClick={() => setStatus(null)} />
            {STATUSES.map(s => <ArticleChip key={s} label={s} active={status === s} onClick={() => setStatus(status === s ? null : s)} />)}
          </div>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #E8E8E4', borderRadius: 10, padding: '60px 20px', textAlign: 'center', color: '#9A9A96', fontSize: 13 }}>
          沒有符合的文章。試試調整篩選條件。
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          {filtered.map(a => <ArticleCard key={a.id} a={a} onOpen={onOpenArticle} />)}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { ArticlesView, hasDate });
