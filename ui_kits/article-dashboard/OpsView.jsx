function OpsView() {
  const [articles, setArticles] = React.useState([
    { id: 1, year: '2026', title: '大稻埕老街的茶文化巡禮', status: '已上架', dateZh: '2026-01-15', dateEn: '2026-03-02' },
    { id: 2, year: '2026', title: '阿里山日出與鄒族文化', status: '已上架', dateZh: '2026-02-08', dateEn: '' },
    { id: 3, year: '2026', title: '台南府城小吃地圖', status: '翻譯中', dateZh: '2026-03-12', dateEn: '' },
    { id: 4, year: '2026', title: '花蓮縱谷咖啡產區走讀', status: '待上架', dateZh: '', dateEn: '' },
    { id: 5, year: '2026', title: '澎湖石滬與漁村常民', status: '待初審', dateZh: '', dateEn: '' },
    { id: 6, year: '2026', title: '屏東排灣族藝術祭', status: '待改稿', dateZh: '', dateEn: '' },
    { id: 7, year: '2025', title: '新北三峽藍染工坊記', status: '已上架', dateZh: '2025-04-10', dateEn: '2025-07-15' },
    { id: 8, year: '2026', title: '宜蘭冬山河自行車小旅行', status: '翻譯中', dateZh: '2026-04-05', dateEn: '' },
  ]);
  const [q, setQ] = React.useState('');
  const [st, setSt] = React.useState('');
  const [modal, setModal] = React.useState(null);
  const [year, setYear] = React.useState('all');

  const filtered = articles.filter(a => {
    if (year !== 'all' && a.year !== year) return false;
    if (q && !a.title.toLowerCase().includes(q.toLowerCase())) return false;
    if (st && a.status !== st) return false;
    return true;
  });

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <span style={{ fontSize: 12, color: '#6B6B6B', marginRight: 4 }}>年份篩選</span>
        {['all', '2024', '2025', '2026'].map(y => (
          <button key={y} onClick={() => setYear(y)} style={{ padding: '5px 14px', fontSize: 12, borderRadius: 2, cursor: 'pointer', border: `1px solid ${year === y ? '#C8621E' : '#E2E0DC'}`, background: year === y ? '#C8621E' : '#fff', color: year === y ? '#fff' : '#6B6B6B', fontWeight: year === y ? 500 : 400 }}>{y === 'all' ? '全部' : y}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.25rem' }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="搜尋標題…" style={{ width: 180, fontSize: 12, padding: '4px 10px', height: 32, borderRadius: 8, border: '1px solid #D3D1C7', background: '#fff', outline: 'none' }} />
        <select value={st} onChange={e => setSt(e.target.value)} style={{ fontSize: 12, padding: '4px 10px', height: 32, borderRadius: 8, border: '1px solid #D3D1C7', background: '#fff', outline: 'none' }}>
          <option value="">全部狀態</option>
          <option>已上架</option><option>待上架</option><option>待改稿</option><option>待初審</option><option>翻譯中</option>
        </select>
        <button style={{ fontSize: 12, padding: '4px 12px', height: 32, borderRadius: 8, cursor: 'pointer', border: '1px solid #D3D1C7', background: '#fff' }}>匯出 CSV</button>
        <button onClick={() => setModal({ title: '', status: '待上架', year: '2026', dateZh: '', dateEn: '' })} style={{ fontSize: 12, padding: '4px 12px', height: 32, borderRadius: 8, cursor: 'pointer', border: '1px solid #B5D4F4', background: '#E6F1FB', color: '#185FA5', fontWeight: 500 }}>+ 新增文章</button>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #E8E8E4', background: '#fff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {['年份', '標題', '狀態', '中文上架日', '英文上架日', ''].map((h, i) => (
                <th key={i} style={{ textAlign: 'left', fontSize: 11, fontWeight: 500, color: '#888780', padding: '10px', borderBottom: '1px solid #E8E8E4', background: '#FAFAF8' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id} style={{ borderBottom: '1px solid #F1EFE8' }}>
                <td style={{ padding: '9px 10px', color: '#6B6B6B' }}>{a.year}</td>
                <td style={{ padding: '9px 10px', color: '#1C1C1C' }}>{a.title}</td>
                <td style={{ padding: '9px 10px' }}><ArticleBadge status={a.status} /></td>
                <td style={{ padding: '9px 10px', color: '#6B6B6B' }}>{a.dateZh || '—'}</td>
                <td style={{ padding: '9px 10px', color: '#6B6B6B' }}>{a.dateEn || '—'}</td>
                <td style={{ padding: '9px 10px' }}>
                  <button onClick={() => setModal(a)} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 2, cursor: 'pointer', border: '1px solid #E2E0DC', background: '#fff', color: '#6B6B6B' }}>編輯</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.3)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setModal(null)}>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8E8E4', padding: '1.5rem', width: 340, boxShadow: '0 8px 32px rgba(0,0,0,.12)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: '1rem', marginTop: 0 }}>{modal.id ? '編輯文章' : '新增文章'}</h3>
            {[['標題', 'title', 'text'], ['中文上架日', 'dateZh', 'date'], ['英文上架日', 'dateEn', 'date']].map(([l, k, t]) => (
              <div key={k} style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', fontSize: 11, color: '#888780', marginBottom: 4 }}>{l}</label>
                <input type={t} defaultValue={modal[k]} style={{ width: '100%', fontSize: 13, padding: '7px 10px', borderRadius: 8, border: '1px solid #D3D1C7', background: '#fff', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
              <button onClick={() => setModal(null)} style={{ background: '#fff', border: '1px solid #D3D1C7', color: '#888780', fontSize: 13, padding: '7px 18px', borderRadius: 8, cursor: 'pointer' }}>取消</button>
              <button onClick={() => setModal(null)} style={{ background: '#E6F1FB', border: '1px solid #B5D4F4', color: '#185FA5', fontSize: 13, padding: '7px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 500 }}>儲存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QAView() {
  const [open, setOpen] = React.useState(0);
  const highlights = [
    '本年度中文內容已上架 80 篇，達成年度目標 200 篇的 40%。',
    '英文內容至今僅 23 篇，達成率 12%，翻譯節奏明顯落後。',
    '目前有 28 篇文章僅完成中文上架而英文版本尚未完成。',
    '英譯庫存 11 篇，接近警戒線，需優先補充翻譯。',
  ];
  const qaPairs = [
    { q: '2026 年度總體上架進度為何？', a: '中文內容已上架 80 篇，英文內容為 23 篇。' },
    { q: '中文內容的目標達成率為何？', a: '中文已上架 80 篇，達成年度目標 200 篇的 40%。' },
    { q: '中英文上架數量差距如何？', a: '中文比英文多上架 57 篇，轉譯率為 29%。' },
    { q: '目前內容管道是否有卡關？', a: '有 28 篇中文上架超過 7 天仍無英文上架日，需追蹤翻譯進度。' },
  ];
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ background: '#fff', border: '1px solid #E8E8E4', borderRadius: 12, padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>2026 年度重點摘要</div>
            <div style={{ fontSize: 10, color: '#9A9A96' }}>更新於 2026-04-15 17:32</div>
          </div>
          {highlights.map((h, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid #F1EFE8' }}>
              <div style={{ width: 6, height: 6, background: '#C8621E', flexShrink: 0, marginTop: 5 }} />
              <div style={{ fontSize: 13, color: '#1C1C1C', lineHeight: 1.6 }}>{h}</div>
            </div>
          ))}
        </div>
        <div style={{ background: '#fff', border: '1px solid #E8E8E4', borderRadius: 12, padding: '1.25rem' }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 14 }}>需注意項目</div>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#A35200', marginBottom: 6 }}>翻譯卡關（28 篇）</div>
          {['大稻埕老街的茶文化巡禮', '阿里山日出與鄒族文化', '宜蘭冬山河自行車小旅行'].map(t => (
            <div key={t} style={{ fontSize: 11, padding: '4px 0', borderBottom: '1px solid #F1EFE8', color: '#1C1C1C' }}>{t}</div>
          ))}
        </div>
      </div>
      <div style={{ background: '#fff', border: '1px solid #E8E8E4', borderRadius: 12, padding: '1.25rem' }}>
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>常見問答</div>
        <div style={{ fontSize: 11, color: '#6B6B6B', marginBottom: 14 }}>點選問題展開答案 · AI 根據最新數據自動產生</div>
        {qaPairs.map((p, i) => (
          <div key={i} style={{ border: '1px solid #E2E0DC', overflow: 'hidden', marginBottom: 8 }}>
            <div onClick={() => setOpen(open === i ? -1 : i)} style={{ background: '#F8F7F5', padding: '8px 12px', fontSize: 12, fontWeight: 500, color: '#1C1C1C', cursor: 'pointer' }}>
              <span style={{ color: '#C8621E', marginRight: 6 }}>Q</span>{p.q}
            </div>
            {open === i && (
              <div style={{ padding: '10px 12px', fontSize: 12, color: '#1C1C1C', lineHeight: 1.6, borderTop: '1px solid #F2F1EE' }}>
                <span style={{ color: '#2D2D2D', fontWeight: 500, marginRight: 6 }}>A</span>{p.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { OpsView, QAView });
