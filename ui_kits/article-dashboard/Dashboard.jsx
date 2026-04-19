function Dashboard() {
  const [unlocked, setUnlocked] = React.useState(false);
  const [tab, setTab] = React.useState('exec');

  if (!unlocked) return <LockScreen onUnlock={() => setUnlocked(true)} />;

  const tabs = [
    { k: 'exec', l: '長官報告版' },
    { k: 'mgr', l: '主管報告版' },
    { k: 'ops', l: '後台編輯版' },
    { k: 'qa', l: 'AI 數據摘要' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F3', fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang TC", "Noto Sans TC", "Segoe UI", sans-serif', color: '#1a1a1a', fontSize: 14 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem' }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <h1 style={{ fontSize: 20, fontWeight: 500, color: '#1a1a1a', margin: 0, marginBottom: 4 }}>文章進度控管儀表板</h1>
          <p style={{ fontSize: 12, color: '#888780', margin: 0 }}>截至 2026年4月19日</p>
        </div>
        <div style={{ display: 'flex', borderBottom: '1px solid #E0DFD8', marginBottom: '1.5rem' }}>
          {tabs.map(t => (
            <button key={t.k} onClick={() => setTab(t.k)} style={{
              padding: '9px 20px', fontSize: 13, cursor: 'pointer',
              border: 'none', borderBottom: `2.5px solid ${tab === t.k ? '#C8621E' : 'transparent'}`,
              color: tab === t.k ? '#1a1a1a' : '#888780', background: 'none',
              marginBottom: -1, fontWeight: tab === t.k ? 500 : 400,
            }}>{t.l}</button>
          ))}
        </div>
        {tab === 'exec' && <ExecutiveView />}
        {tab === 'mgr' && <ManagerView />}
        {tab === 'ops' && <OpsView />}
        {tab === 'qa' && <QAView />}
      </div>
    </div>
  );
}

Object.assign(window, { Dashboard });
