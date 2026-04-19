function ExecutiveView() {
  const total = 662, cnPub = 154, enPub = 113;
  const unpub = total - cnPub;
  const kpiZh = { Q1: { t: 20, l: 55 }, Q2: { t: 60, l: 25 }, Q3: { t: 60, l: 0 }, Q4: { t: 60, l: 0 } };
  const kpiEn = { Q1: { t: 20, l: 23 }, Q2: { t: 80, l: 0 }, Q3: { t: 80, l: 0 }, Q4: { t: 80, l: 0 } };
  const pct = (a, t) => t > 0 ? Math.round(a / t * 100) : 0;

  const Row = ({ q, data, color }) => {
    const p = Math.min(100, pct(data.l, data.t));
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 140px 50px', alignItems: 'center', gap: 10, marginBottom: 9 }}>
        <span style={{ fontSize: 11, color: '#888780' }}>{q} / <strong>{data.t}</strong> 篇</span>
        <div style={{ height: 6, background: '#F2F1EE', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${p}%`, background: color, transition: 'width .4s' }} />
        </div>
        <div style={{ fontSize: 11, color: '#1C1C1C' }}>已上架 <strong style={{ color }}>{data.l}</strong> 篇</div>
        <Pill tone={p >= 100 ? 'ok' : p >= 60 ? 'warn' : 'danger'}>{pct(data.l, data.t)}%</Pill>
      </div>
    );
  };

  const KpiBlock = ({ lang }) => {
    const kpi = lang === 'zh' ? kpiZh : kpiEn;
    const color = lang === 'zh' ? '#C8621E' : '#3D3D3D';
    const totalT = Object.values(kpi).reduce((a, b) => a + b.t, 0);
    const totalL = Object.values(kpi).reduce((a, b) => a + b.l, 0);
    return (
      <div style={{ background: '#fff', border: '1px solid #E8E8E4', borderRadius: 12, padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{lang === 'zh' ? '中文稿 ·' : '英譯稿 ·'} 2026 KPI</span>
          <span style={{ fontSize: 11, color: '#888780' }}>全年目標 {totalT} 篇｜已上架 {totalL} 篇（{pct(totalL, totalT)}%）</span>
        </div>
        {['Q1', 'Q2', 'Q3', 'Q4'].map(q => <Row key={q} q={q} data={kpi[q]} color={color} />)}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem' }}>
        <span style={{ fontSize: 12, padding: '3px 14px', borderRadius: 2, background: '#C8621E', color: '#fff', fontWeight: 500 }}>2026</span>
        <span style={{ fontSize: 11, color: '#9A9A96' }}>長官報告版 · 固定顯示當年度</span>
      </div>

      {/* Hero */}
      <div style={{ background: '#fff', border: '1px solid #E2E0DC', padding: '1.25rem 1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Eyebrow>全資料庫總文章數</Eyebrow>
          <div style={{ fontSize: 52, fontWeight: 300, color: '#1C1C1C', lineHeight: 1, letterSpacing: '-.02em' }}>{total}</div>
          <div style={{ fontSize: 11, color: '#9A9A96', marginTop: 4 }}>歷年累積 · 含所有狀態</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { lbl: 'CHINESE LIVE', v: cnPub, c: '#C8621E' },
            { lbl: 'ENGLISH LIVE', v: enPub, c: '#2D2D2D' },
          ].map((s) => (
            <div key={s.lbl} style={{ textAlign: 'center', padding: '10px 18px', background: '#F8F7F5', border: '1px solid #E2E0DC' }}>
              <div style={{ fontSize: 9, letterSpacing: '.08em', textTransform: 'uppercase', color: '#6B6B6B', marginBottom: 5 }}>{s.lbl}</div>
              <div style={{ fontSize: 28, fontWeight: 300, color: s.c, letterSpacing: '-.01em' }}>{s.v}</div>
              <div style={{ fontSize: 10, color: '#9A9A96', marginTop: 3 }}>{pct(s.v, total)}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Published / unpublished */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ background: '#FBF0E8', border: '1px solid #EDB896', padding: '1.25rem' }}>
          <Eyebrow color="#C8621E">已上架文章</Eyebrow>
          <div style={{ fontSize: 40, fontWeight: 300, color: '#C8621E', lineHeight: 1, marginBottom: 14, letterSpacing: '-.02em' }}>{cnPub + enPub}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ background: 'rgba(255,255,255,.8)', padding: '.875rem' }}>
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: '#C8621E', marginBottom: 4 }}>中文稿</div>
              <div style={{ fontSize: 24, fontWeight: 300, color: '#C8621E' }}>{cnPub}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,.8)', padding: '.875rem' }}>
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: '#1A6B45', marginBottom: 4 }}>英譯稿</div>
              <div style={{ fontSize: 24, fontWeight: 300, color: '#1A6B45' }}>{enPub}</div>
            </div>
          </div>
        </div>
        <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', padding: '1.25rem' }}>
          <Eyebrow color="#A35200">未上架文章</Eyebrow>
          <div style={{ fontSize: 40, fontWeight: 300, color: '#A35200', lineHeight: 1, marginBottom: 8, letterSpacing: '-.02em' }}>{unpub}</div>
          <div style={{ fontSize: 10, color: '#A35200', marginBottom: 10 }}>= 總數 {total} − 中文稿上架 {cnPub}</div>
          {[['待上架', '長官尚未簽核', 180], ['待初審', '長官尚未審閱', 210], ['待改稿', '編輯尚未潤稿', 118]].map(([s, h, n]) => (
            <div key={s} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,.7)', padding: '6px 10px', marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: '#A35200' }}>{s}<span style={{ fontSize: 9, color: '#C8782A', marginLeft: 3 }}>({h})</span></span>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#A35200' }}>{n} 篇</span>
            </div>
          ))}
        </div>
      </div>

      {/* KPI blocks */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <KpiBlock lang="zh" />
        <KpiBlock lang="en" />
      </div>

      {/* Chart mock */}
      <div style={{ background: '#fff', border: '1px solid #E8E8E4', borderRadius: 12, padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>2026 全年累積上架進度</span>
          <span style={{ fontSize: 11, color: '#888780' }}>實際累積 vs 目標進度線 · 未來月份不顯示</span>
        </div>
        <svg viewBox="0 0 800 200" style={{ width: '100%', height: 200 }}>
          {/* grid */}
          {[40, 80, 120, 160].map(y => <line key={y} x1="40" x2="760" y1={y} y2={y} stroke="rgba(0,0,0,.05)" />)}
          {/* x ticks */}
          {Array.from({ length: 12 }).map((_, i) => (
            <text key={i} x={40 + i * 60 + 10} y={192} fontSize="10" fill="#9A9A96">{i + 1}月</text>
          ))}
          {/* target lines dashed */}
          <path d="M 40 180 L 100 160 L 160 140 L 220 100 L 280 90 L 340 80 L 400 65 L 460 55 L 520 45 L 580 35 L 640 25 L 700 15" stroke="#EDB896" strokeWidth="1.5" strokeDasharray="4 4" fill="none"/>
          <path d="M 40 180 L 100 165 L 160 150 L 220 115 L 280 100 L 340 85 L 400 70 L 460 55 L 520 40 L 580 28 L 640 15 L 700 5" stroke="#B4B2A9" strokeWidth="1.5" strokeDasharray="4 4" fill="none"/>
          {/* actual orange */}
          <path d="M 40 180 L 100 150 L 160 120 L 220 100" stroke="#C8621E" strokeWidth="2.5" fill="none" />
          <path d="M 40 180 L 100 150 L 160 120 L 220 100 L 220 195 L 40 195 Z" fill="rgba(200,98,30,.07)" />
          {[40, 100, 160, 220].map(x => {
            const y = { 40: 180, 100: 150, 160: 120, 220: 100 }[x];
            return <circle key={x} cx={x} cy={y} r="4" fill="#C8621E" />;
          })}
          {/* actual english dark */}
          <path d="M 40 190 L 100 175 L 160 160 L 220 150" stroke="#3D3D3D" strokeWidth="2.5" fill="none" />
          {[40, 100, 160, 220].map(x => {
            const y = { 40: 190, 100: 175, 160: 160, 220: 150 }[x];
            return <circle key={x} cx={x} cy={y} r="4" fill="#3D3D3D" />;
          })}
        </svg>
        <div style={{ display: 'flex', gap: 20, fontSize: 11, color: '#6B6B6B', marginTop: 10 }}>
          <span><span style={{ display: 'inline-block', width: 10, height: 2, background: '#C8621E', marginRight: 6, verticalAlign: 'middle' }} />中文稿實際</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 2, background: '#3D3D3D', marginRight: 6, verticalAlign: 'middle' }} />英譯稿實際</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 0, borderTop: '2px dashed #EDB896', marginRight: 6, verticalAlign: 'middle' }} />中文稿目標</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 0, borderTop: '2px dashed #B4B2A9', marginRight: 6, verticalAlign: 'middle' }} />英譯稿目標</span>
        </div>
      </div>

      <div style={{ fontSize: 10, color: '#B4B2A9', textAlign: 'right', marginTop: '1.5rem' }}>資料更新：2026/4/19 · 來源：進度管理 Excel</div>
    </div>
  );
}

Object.assign(window, { ExecutiveView });
