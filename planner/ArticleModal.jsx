// ============================================================
// Article detail modal — shared across all 3 views
// ============================================================
function ArticleModal({ article, onClose }) {
  useEffect(() => {
    const h = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  if (!article) return null;
  const a = article;
  const s = { '已上架': { bg: '#EAF3DE', fg: '#3B6D11' }, '待上架': { bg: '#FAEEDA', fg: '#854F0B' }, '待初審': { bg: '#E6F1FB', fg: '#185FA5' }, '審稿中': { bg: '#EEEDFE', fg: '#3C3489' } }[a.status] || { bg: '#F2F1EE', fg: '#6B6B6B' };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 5000,
        background: 'rgba(28,28,28,.55)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 40,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 14, width: '100%', maxWidth: 720,
          maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 60px -10px rgba(0,0,0,.4)',
          fontFamily: 'inherit',
        }}
      >
        <div style={{ position: 'relative', height: 240, backgroundImage: `url(${a.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
          <button onClick={onClose} style={{
            position: 'absolute', top: 14, right: 14,
            width: 30, height: 30, borderRadius: '50%',
            background: 'rgba(255,255,255,.9)', border: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#1a1a1a',
          }}>{Icon.close(14)}</button>
          <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', gap: 6 }}>
            <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 10, background: s.bg, color: s.fg, fontWeight: 500 }}>{a.status}</span>
            {a.coordsEstimated && <EstimatedBadge compact />}
          </div>
        </div>
        <div style={{ padding: '22px 28px 24px', overflowY: 'auto' }}>
          <div style={{ fontSize: 10.5, color: '#888780', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            {a.city} · {a.area} · {a.author} · {a.readTime}
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 500, color: '#1a1a1a', margin: '0 0 10px', letterSpacing: '-.01em', lineHeight: 1.3 }}>{a.title}</h2>
          <p style={{ fontSize: 13, color: '#6B6B6B', margin: '0 0 18px', lineHeight: 1.6 }}>{a.description}</p>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 18 }}>
            {[...(a.theme||[]), ...(a.region||[]), ...(a.season||[])].map((t, i) => (
              <span key={i} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: '#F2F1EE', color: '#6B6B6B' }}>{t}</span>
            ))}
          </div>
          <div style={{ borderTop: '1px solid #F1EFE8', paddingTop: 16 }}>
            {(a.content || []).map((p, i) => (
              <p key={i} style={{ fontSize: 13.5, color: '#1a1a1a', lineHeight: 1.75, margin: '0 0 14px' }}>{p}</p>
            ))}
          </div>
          <div style={{ marginTop: 18, padding: '12px 14px', background: '#F8F7F5', borderRadius: 10, fontSize: 11, color: '#6B6B6B', fontFamily: 'ui-monospace, monospace', letterSpacing: '.02em', display: 'flex', justifyContent: 'space-between' }}>
            <span>座標 {a.lat.toFixed(4)}, {a.lng.toFixed(4)}</span>
            <span>ID {a.id}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ArticleModal });
