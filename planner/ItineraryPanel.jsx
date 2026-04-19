// ============================================================
// Right-side itinerary panel (Anthropic aesthetic)
// Vertical timeline with thumbnails, times, travel legs
// ============================================================
function ItineraryPanel({ itinerary, activeId, onHover, onOpenArticle, onClear }) {
  const cardRefs = useRef({});
  const scrollRef = useRef(null);

  // Auto-scroll when activeId changes (from map click)
  useEffect(() => {
    if (!activeId) return;
    const el = cardRefs.current[activeId];
    if (el && scrollRef.current) {
      const parent = scrollRef.current;
      const top = el.offsetTop - parent.offsetTop - 12;
      parent.scrollTo({ top, behavior: 'smooth' });
    }
  }, [activeId]);

  if (!itinerary) {
    return (
      <div style={ipShell}>
        <div style={{ padding: 28, textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, margin: '0 auto 16px', borderRadius: 12, background: '#FBF0E8', color: '#C8621E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Icon.sparkle(22)}</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1a1a', marginBottom: 6 }}>尚未有行程</div>
          <div style={{ fontSize: 11.5, color: '#6B6B6B', lineHeight: 1.6 }}>在左上角搜尋框輸入您想去的地方，或選擇一個建議開始。AI 會從資料庫中的 {window.ENRICHED_ARTICLES.length} 篇文章為您規劃路線。</div>
        </div>
      </div>
    );
  }

  const { stops, unplaced, meta, title, summary, warnings, params } = itinerary;

  // Group by day
  const byDay = {};
  stops.forEach(s => { (byDay[s.day] = byDay[s.day] || []).push(s); });

  const copyLink = () => {
    const txt = `${title}\n${summary}\n\n` + stops.map((s, i) => `${i + 1}. ${s.time} · ${s.title} (${s.city} ${s.area})`).join('\n');
    navigator.clipboard && navigator.clipboard.writeText(txt);
  };

  return (
    <div style={ipShell}>
      <div ref={scrollRef} style={{ overflowY: 'auto', height: '100%' }}>
        {/* Header */}
        <div style={{ padding: '22px 22px 18px', borderBottom: '1px solid #F1EFE8' }}>
          <div style={{ fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: '#C8621E', fontWeight: 600, marginBottom: 8 }}>AI 規劃行程</div>
          <div style={{ fontSize: 17, fontWeight: 500, color: '#1a1a1a', lineHeight: 1.35, letterSpacing: '-.005em', textWrap: 'pretty', marginBottom: 8 }}>{title}</div>
          <div style={{ fontSize: 11.5, color: '#6B6B6B', lineHeight: 1.6, textWrap: 'pretty', marginBottom: 12 }}>{summary}</div>

          {/* Meta pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
            <MetaPill>{meta.days} 天</MetaPill>
            <MetaPill>{meta.totalStops} 站</MetaPill>
            <MetaPill>{meta.totalKm} km</MetaPill>
            <MetaPill>{meta.pace}</MetaPill>
            <MetaPill>{meta.transport}</MetaPill>
          </div>

          {/* Warnings */}
          {warnings && warnings.map((w, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '9px 11px', marginBottom: 8,
              background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8,
              color: '#854F0B', fontSize: 11, lineHeight: 1.55,
            }}>
              <span style={{ flexShrink: 0, marginTop: 1 }}>{Icon.alert(13)}</span>
              <span>{w.msg}</span>
            </div>
          ))}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
            <button style={btnDark}>Open route</button>
            <button style={btnWhite} onClick={copyLink}>Copy</button>
            <button style={{ ...btnWhite, padding: '7px 10px' }} onClick={onClear} title="清除行程">{Icon.close(12)}</button>
          </div>
        </div>

        {/* Timeline */}
        <div style={{ padding: '4px 22px 28px' }}>
          {Object.entries(byDay).map(([day, dayStops]) => (
            <div key={day}>
              <div style={{
                fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase',
                color: '#888780', fontWeight: 600, padding: '18px 0 10px',
              }}>Day {day}</div>

              {dayStops.map((s, i) => {
                const active = s.id === activeId;
                const isLast = i === dayStops.length - 1 && day == meta.days;
                return (
                  <div
                    key={s.id}
                    ref={el => (cardRefs.current[s.id] = el)}
                    onMouseEnter={() => onHover(s.id)}
                    onClick={() => onOpenArticle(s)}
                    style={{
                      display: 'grid', gridTemplateColumns: '56px 1fr',
                      gap: 10, cursor: 'pointer',
                      marginBottom: 4,
                    }}
                  >
                    {/* Left column — time + connector */}
                    <div style={{ position: 'relative', paddingTop: 6, textAlign: 'right', paddingRight: 2 }}>
                      <div style={{ fontSize: 10.5, color: active ? '#C8621E' : '#888780', fontWeight: active ? 600 : 500, letterSpacing: '.04em', fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>
                        {s.time}
                      </div>
                      <div style={{ fontSize: 9, color: '#C0BDB3', marginTop: 2 }}>
                        {s.travelKm > 0 ? `+${s.travelKm}km` : ''}
                      </div>
                      {/* Dot */}
                      <div style={{
                        position: 'absolute', right: -11, top: 9,
                        width: 10, height: 10, borderRadius: '50%',
                        background: active ? '#C8621E' : '#1a1a1a',
                        border: '2px solid #fff',
                        boxShadow: active ? '0 0 0 3px rgba(200,98,30,.2)' : 'none',
                        transition: 'all .2s',
                        zIndex: 2,
                      }} />
                      {/* Connector line */}
                      {!isLast && (
                        <div style={{
                          position: 'absolute', right: -7, top: 22, bottom: -26,
                          width: 2, background: '#E8E8E4',
                        }} />
                      )}
                    </div>

                    {/* Right column — card */}
                    <div style={{
                      background: active ? '#F8F7F5' : 'transparent',
                      border: active ? '1px solid #E8E8E4' : '1px solid transparent',
                      borderRadius: 10,
                      padding: 8,
                      transition: 'all .14s',
                      marginBottom: 16,
                    }}>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{
                          width: 64, height: 64, borderRadius: 8, flexShrink: 0,
                          backgroundImage: `url(${s.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center',
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 9.5, color: '#9A9A96', letterSpacing: '.04em', marginBottom: 2 }}>
                            {s.city} · {s.area}
                          </div>
                          <div style={{ fontSize: 12.5, fontWeight: 500, color: '#1a1a1a', lineHeight: 1.35, textWrap: 'pretty', marginBottom: 3 }}>
                            {s.title}
                          </div>
                          <div style={{ fontSize: 10.5, color: '#6B6B6B', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {s.description}
                          </div>
                        </div>
                      </div>
                      {s.coordsEstimated && (
                        <div style={{ marginTop: 7 }}>
                          <EstimatedBadge compact />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {unplaced && unplaced.length > 0 && (
            <div style={{
              marginTop: 14, padding: '12px 14px',
              background: '#F8F7F5', border: '1px dashed #D3D1C7', borderRadius: 10,
            }}>
              <div style={{ fontSize: 10.5, letterSpacing: '.08em', textTransform: 'uppercase', color: '#888780', fontWeight: 600, marginBottom: 6 }}>未安排 · 受時間限制</div>
              <div style={{ fontSize: 11, color: '#6B6B6B', marginBottom: 8, lineHeight: 1.55 }}>以下 {unplaced.length} 個景點因天數或節奏限制未能排入行程：</div>
              {unplaced.map(u => (
                <div key={u.id} style={{ fontSize: 11, color: '#1a1a1a', padding: '4px 0' }}>
                  · {u.title} <span style={{ color: '#9A9A96' }}>({u.city})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const ipShell = {
  position: 'absolute', top: 20, right: 20, bottom: 20, width: 380,
  background: '#fff', border: '1px solid #E8E8E4', borderRadius: 14,
  boxShadow: '0 10px 40px -8px rgba(28,28,28,.18), 0 2px 6px rgba(28,28,28,.04)',
  zIndex: 1000, overflow: 'hidden',
  fontFamily: 'inherit',
};
const btnDark = {
  padding: '8px 14px', borderRadius: 8, background: '#1a1a1a', color: '#fff',
  border: 'none', fontSize: 11.5, fontWeight: 500, fontFamily: 'inherit',
  cursor: 'pointer', letterSpacing: '.01em',
};
const btnWhite = {
  padding: '8px 14px', borderRadius: 8, background: '#fff', color: '#1a1a1a',
  border: '1px solid #d3d1c7', fontSize: 11.5, fontWeight: 500, fontFamily: 'inherit',
  cursor: 'pointer', letterSpacing: '.01em',
};
function MetaPill({ children }) {
  return <span style={{
    fontSize: 10, padding: '3px 9px', borderRadius: 12,
    background: '#F2F1EE', color: '#4a4a4a', fontWeight: 500, letterSpacing: '.02em',
  }}>{children}</span>;
}

Object.assign(window, { ItineraryPanel });
