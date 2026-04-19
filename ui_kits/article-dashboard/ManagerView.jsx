function ManagerView() {
  const totalT = 200, totalLZh = 80, totalLEn = 23;
  const pct = (a, t) => t > 0 ? Math.round(a / t * 100) : 0;

  const RateRow = ({ label, period, cnP, cnAct, cnTgt, enP, enAct, enTgt }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', borderBottom: '1px solid #F2F1EE', minHeight: 60 }}>
      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRight: '1px solid #F2F1EE' }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#1C1C1C' }}>{label}</div>
        {period && <div style={{ fontSize: 9, color: '#9A9A96', marginTop: 2, letterSpacing: '.03em' }}>{period}</div>}
      </div>
      {[
        { p: cnP, act: cnAct, tgt: cnTgt, color: '#C8621E', label: '中文稿' },
        { p: enP, act: enAct, tgt: enTgt, color: '#2D2D2D', label: '英譯稿' },
      ].map((c, i) => (
        <div key={i} style={{ padding: '10px 16px', borderRight: i === 0 ? '1px solid #F2F1EE' : 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
            <span style={{ fontSize: 10, color: c.color, fontWeight: 500, letterSpacing: '.04em' }}>{c.label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 16, fontWeight: 300, color: pctColor(c.p), letterSpacing: '-.01em' }}>{c.p}%</span>
              <StatusTag tone={c.p >= 100 ? 'ok' : c.p >= 80 ? 'warn' : 'danger'}>{pctText(c.p)}</StatusTag>
            </div>
          </div>
          <ProgressBar pct={c.p} color={c.color} height={3} />
          <div style={{ fontSize: 9, color: '#9A9A96', marginTop: 3 }}>已上架 {c.act} / 目標 {c.tgt} 篇</div>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem' }}>
        <span style={{ fontSize: 12, padding: '3px 14px', borderRadius: 2, background: '#C8621E', color: '#fff', fontWeight: 500 }}>2026</span>
        <span style={{ fontSize: 11, color: '#9A9A96' }}>主管報告版 · 固定顯示當年度</span>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2E0DC', overflow: 'hidden', marginBottom: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', background: '#F2F1EE', borderBottom: '1px solid #E2E0DC' }}>
          <div style={{ padding: '10px 14px', fontSize: 9, color: '#6B6B6B', fontWeight: 500, borderRight: '1px solid #E2E0DC', letterSpacing: '.1em', textTransform: 'uppercase' }}>達標率概覽</div>
          <div style={{ padding: '10px 16px', fontSize: 10, fontWeight: 600, color: '#C8621E', borderRight: '1px solid #E2E0DC', display: 'flex', alignItems: 'center', gap: 5, letterSpacing: '.08em', textTransform: 'uppercase' }}>
            <span style={{ width: 8, height: 8, background: '#C8621E', display: 'inline-block' }} />中文稿
          </div>
          <div style={{ padding: '10px 16px', fontSize: 10, fontWeight: 600, color: '#2D2D2D', display: 'flex', alignItems: 'center', gap: 5, letterSpacing: '.08em', textTransform: 'uppercase' }}>
            <span style={{ width: 8, height: 8, background: '#2D2D2D', display: 'inline-block' }} />英譯稿
          </div>
        </div>
        <RateRow label="全年 KPI" period={`目標 ${totalT} / ${totalT} 篇`} cnP={pct(totalLZh, totalT)} cnAct={totalLZh} cnTgt={totalT} enP={pct(totalLEn, totalT)} enAct={totalLEn} enTgt={totalT} />
        <RateRow label="本季 KPI" period="Q2" cnP={42} cnAct={25} cnTgt={60} enP={0} enAct={0} enTgt={80} />
        <RateRow label="本月進度" period="4月" cnP={65} cnAct={13} cnTgt={20} enP={0} enAct={0} enTgt={27} />
        <RateRow label="本週進度（W16）" period="4/13–4/19" cnP={100} cnAct={7} cnTgt={7} enP={0} enAct={0} enTgt={6} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#FEF3C7', borderTop: '2px solid #FDE68A' }}>
          <div style={{ padding: '12px 16px', borderRight: '1px solid #FDE68A' }}>
            <Eyebrow color="#A35200">英譯稿庫存水位</Eyebrow>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 32, fontWeight: 300, color: '#A35200', letterSpacing: '-.02em' }}>11</span>
              <span style={{ fontSize: 12, color: '#A35200' }}>篇可上架</span>
            </div>
            <div style={{ fontSize: 10, color: '#A35200', marginTop: 3 }}>接近警戒，建議補充 · 待翻 528 篇</div>
          </div>
          <div style={{ padding: '12px 16px' }}>
            <Eyebrow>中英轉譯率（累計）</Eyebrow>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 32, fontWeight: 300, color: '#A35200', letterSpacing: '-.02em' }}>73%</span>
              <StatusTag tone="warn">偏低</StatusTag>
            </div>
            <div style={{ fontSize: 9, color: '#9A9A96' }}>英譯稿 113 ÷ 中文稿 154（全資料庫）</div>
          </div>
        </div>
      </div>

      {/* Weekly card */}
      <div style={{ background: '#fff', border: '1px solid #E2E0DC', overflow: 'hidden', marginBottom: '1rem' }}>
        <div style={{ padding: '12px 18px', background: '#F2F1EE', borderBottom: '1px solid #E2E0DC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#9C4A12', letterSpacing: '.06em' }}>2026-W16</span>
            <span style={{ fontSize: 11, color: '#6B6B6B', marginLeft: 8 }}>4/13–4/19</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 2, background: 'rgba(200,98,30,.12)', color: '#C8621E' }}>中文 100%</span>
            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 2, background: 'rgba(50,50,50,.1)', color: '#2D2D2D' }}>英譯 0%</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          {[
            { label: '中文稿', color: '#C8621E', bg: '#FBF0E8', border: '#EDB896', rows: [['本週計畫上架', '7 篇', null], ['本週實際上架', '7 篇', 'ok'], ['預計審閱 (Ready)', '2 篇', null], ['待編修 (Raw)', '451 篇', null]] },
            { label: '英譯稿', color: '#2D2D2D', bg: '#F2F1EE', border: '#E2E0DC', rows: [['本週計畫上架', '6 篇', null], ['本週實際上架', '0 篇', 'danger'], ['已翻譯可上架', '11 篇', 'warn'], ['等待翻譯 (待翻)', '528 篇', null]] },
          ].map((side, i) => (
            <div key={i} style={{ borderRight: i === 0 ? '1px solid #F2F1EE' : 'none' }}>
              <div style={{ padding: '7px 14px', background: side.bg, borderBottom: `1px solid ${side.border}` }}>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: side.color }}>{side.label}</span>
              </div>
              {side.rows.map(([l, v, tone], j) => (
                <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: '1px solid #F2F1EE' }}>
                  <span style={{ width: 7, height: 7, background: tone ? (tone === 'ok' ? '#1A6B45' : tone === 'warn' ? '#A35200' : '#B91C1C') : '#CCC' }} />
                  <div style={{ flex: 1, fontSize: 11, color: '#6B6B6B' }}>{l}</div>
                  <span style={{ fontSize: 18, fontWeight: 300, color: tone ? (tone === 'ok' ? '#1A6B45' : tone === 'warn' ? '#A35200' : '#B91C1C') : side.color, letterSpacing: '-.01em' }}>{v}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Action advisory */}
      <div style={{ background: '#fff', border: '1px solid #E2E0DC', padding: '1.25rem' }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: '#6B6B6B', marginBottom: 12 }}>本週行動建議</div>
        {[
          { tone: 'urgent', msg: '英譯稿達成率 0%，請確認翻譯卡關原因並調整排程。', fg: '#B91C1C', bg: '#FEE2E2', bd: '#FECACA' },
          { tone: 'warn', msg: '英譯庫存 11 篇，接近警戒線，建議本週補充翻譯 3 篇以上。', fg: '#A35200', bg: '#FEF3C7', bd: '#FDE68A' },
          { tone: 'warn', msg: '共 28 篇中文上架超過 7 天仍無英文上架日，需追蹤翻譯進度。', fg: '#A35200', bg: '#FEF3C7', bd: '#FDE68A' },
        ].map((a, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', background: a.bg, border: `1px solid ${a.bd}`, marginBottom: 7 }}>
            <div style={{ width: 6, height: 6, flexShrink: 0, marginTop: 4, background: a.fg }} />
            <div style={{ fontSize: 12, lineHeight: 1.6, color: a.fg }}>{a.msg}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { ManagerView });
