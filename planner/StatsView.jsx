// ============================================================
// View 2: Database Stats — KPI + charts computed from ENRICHED_ARTICLES
// ============================================================
function StatsView() {
  const arts = window.ENRICHED_ARTICLES;
  const stats = useMemo(() => {
    const total = arts.length;
    const zh = arts.filter(a => hasDate(a.dateZh)).length;
    const en = arts.filter(a => hasDate(a.dateEn)).length;
    const pending = arts.filter(a => a.coordsEstimated).length;

    const byTheme = {}, byRegion = {}, bySeason = {}, byStatus = {};
    arts.forEach(a => {
      (a.theme  || []).forEach(t => byTheme[t]  = (byTheme[t]  || 0) + 1);
      (a.region || []).forEach(r => byRegion[r] = (byRegion[r] || 0) + 1);
      (a.season || []).forEach(s => bySeason[s] = (bySeason[s] || 0) + 1);
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;
    });
    return { total, zh, en, pending, byTheme, byRegion, bySeason, byStatus };
  }, [arts]);

  const Kpi = ({ label, val, sub, color = '#1a1a1a' }) => (
    <div style={{ background: '#fff', border: '1px solid #E8E8E4', borderRadius: 10, padding: '16px 18px' }}>
      <div style={{ fontSize: 10, color: '#888780', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 300, color, letterSpacing: '-.02em', lineHeight: 1 }}>{val}</div>
      {sub && <div style={{ fontSize: 11, color: '#9A9A96', marginTop: 6 }}>{sub}</div>}
    </div>
  );

  const Bar = ({ data, color = '#C8621E', max }) => {
    const m = max || Math.max(...Object.values(data), 1);
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {entries.map(([k, v]) => (
          <div key={k} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 40px', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 11, color: '#6B6B6B' }}>{k}</div>
            <div style={{ height: 8, background: '#F2F1EE', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${v / m * 100}%`, background: color, transition: 'width .5s' }} />
            </div>
            <div style={{ fontSize: 11, color: '#1a1a1a', textAlign: 'right', fontWeight: 500 }}>{v}</div>
          </div>
        ))}
      </div>
    );
  };

  const Panel = ({ title, sub, children }) => (
    <div style={{ background: '#fff', border: '1px solid #E8E8E4', borderRadius: 10, padding: '16px 20px' }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>{title}</div>
        {sub && <div style={{ fontSize: 10, color: '#9A9A96', marginTop: 2 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );

  return (
    <div style={{ padding: '28px 36px', background: '#F8F7F5', minHeight: '100%' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#C8621E', fontWeight: 600, marginBottom: 4 }}>Database Stats</div>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: '#1a1a1a', margin: 0, letterSpacing: '-.005em' }}>資料庫統計視覺化</h1>
        <p style={{ fontSize: 12, color: '#6B6B6B', margin: '4px 0 0' }}>全資料庫即時統計 · 按主題、區域、時令、狀態分類</p>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
        <Kpi label="資料庫總數" val={stats.total} sub="篇文章" />
        <Kpi label="中文已上架" val={stats.zh} color="#C8621E" sub={`${Math.round(stats.zh / stats.total * 100)}%`} />
        <Kpi label="英文已上架" val={stats.en} color="#3D3D3D" sub={`${Math.round(stats.en / stats.total * 100)}%`} />
        <Kpi label="座標待確認" val={stats.pending} color="#A35200" sub="AI 預估 · 待管理員" />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <Panel title="主題分布" sub="Theme">
          <Bar data={stats.byTheme} color="#C8621E" />
        </Panel>
        <Panel title="區域分布" sub="Region">
          <Bar data={stats.byRegion} color="#185FA5" />
        </Panel>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <Panel title="時令分布" sub="Season">
          <Bar data={stats.bySeason} color="#1D9E75" />
        </Panel>
        <Panel title="狀態分布" sub="Status">
          <Bar data={stats.byStatus} color="#534AB7" />
        </Panel>
      </div>

      {/* Coord estimation table */}
      <Panel title="座標 AI 預估 · 待管理員確認" sub={`${stats.pending} 筆文章缺少實際 lat/lng，系統已依據城市與鄉鎮區推測大致位置`}>
        {stats.pending === 0 ? (
          <div style={{ fontSize: 12, color: '#9A9A96', padding: '10px 0' }}>所有文章都有實際座標，無需確認。</div>
        ) : (
          <div style={{ borderTop: '1px solid #F1EFE8' }}>
            {arts.filter(a => a.coordsEstimated).map(a => (
              <div key={a.id} style={{
                display: 'grid', gridTemplateColumns: '2fr 1fr 1.3fr auto',
                gap: 12, padding: '10px 2px', borderBottom: '1px solid #F1EFE8',
                alignItems: 'center',
              }}>
                <div style={{ fontSize: 12.5, color: '#1a1a1a' }}>{a.title}</div>
                <div style={{ fontSize: 11, color: '#6B6B6B' }}>{a.city} · {a.area}</div>
                <div style={{ fontSize: 11, color: '#888780', fontFamily: 'ui-monospace, monospace' }}>
                  {a.lat.toFixed(4)}, {a.lng.toFixed(4)}
                </div>
                <EstimatedBadge compact />
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

Object.assign(window, { StatsView });
