const { useState: useStateLock } = React;

function LockScreen({ onUnlock }) {
  const [val, setVal] = useStateLock('');
  const [err, setErr] = useStateLock('');

  const tryUnlock = () => {
    if (!val) { setErr('請輸入密碼'); return; }
    if (val === 'IST2026') { onUnlock(); return; }
    setErr('密碼錯誤，請重試');
    setVal('');
    setTimeout(() => setErr(''), 3000);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#F8F7F5', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ background: '#fff', border: '1px solid #E2E0DC', padding: '2.5rem 2rem', width: 320, textAlign: 'center' }}>
        <div style={{ fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: '#C8621E', fontWeight: 500, marginBottom: 6 }}>IST · 看見台灣基金會</div>
        <div style={{ fontSize: 18, fontWeight: 400, color: '#1C1C1C', marginBottom: 4, letterSpacing: '.01em' }}>內容進度控管系統</div>
        <div style={{ fontSize: 11, color: '#9A9A96', marginBottom: '1.75rem', letterSpacing: '.02em' }}>Content Operations Dashboard</div>
        <input
          type="password"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && tryUnlock()}
          placeholder="請輸入存取密碼"
          style={{
            width: '100%', fontSize: 14, padding: '10px 12px',
            border: '1px solid #E2E0DC', background: '#fff', color: '#1C1C1C',
            outline: 'none', letterSpacing: '.12em', textAlign: 'center',
            boxSizing: 'border-box', marginBottom: 10,
          }}
        />
        <button
          onClick={tryUnlock}
          style={{
            width: '100%', padding: 11, background: '#C8621E', color: '#fff',
            border: 'none', fontSize: 13, fontWeight: 500, letterSpacing: '.06em',
            cursor: 'pointer', textTransform: 'uppercase',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#9C4A12'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#C8621E'}
        >進入</button>
        <div style={{ fontSize: 11, color: '#B91C1C', marginTop: 8, minHeight: 16, letterSpacing: '.02em' }}>{err}</div>
        <div style={{ fontSize: 10, color: '#C0BDB8', marginTop: '1.5rem', letterSpacing: '.06em', textTransform: 'uppercase' }}>IST Internal Use Only</div>
        <div style={{ fontSize: 10, color: '#C0BDB8', marginTop: 8, letterSpacing: '.04em' }}>提示：demo 密碼為 IST2026</div>
      </div>
    </div>
  );
}

Object.assign(window, { LockScreen });
