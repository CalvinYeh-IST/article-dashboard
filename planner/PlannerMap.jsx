// ============================================================
// View 3: AI Itinerary Planner
// Full-screen Leaflet map + glassmorphism chat + right-side timeline panel
// ============================================================

function numberedDivIcon(n, active) {
  return L.divIcon({
    className: 'ist-num-marker',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    html: `<div style="
      width:34px;height:34px;border-radius:50%;
      background:${active ? '#C8621E' : '#1a1a1a'};
      color:#fff;display:flex;align-items:center;justify-content:center;
      font-family:Söhne,-apple-system,sans-serif;font-size:13px;font-weight:600;
      border:2px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,${active ? '.35' : '.25'});
      transition:background .2s, transform .2s;
      transform:${active ? 'scale(1.12)' : 'scale(1)'};
    ">${n}</div>`,
  });
}

function MapWithMarkers({ stops, activeId, onMarkerClick }) {
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const layerRef = useRef(null);
  const lineRef = useRef(null);

  // init map
  useEffect(() => {
    if (mapRef.current) return;
    const m = L.map('ist-map', {
      center: [23.8, 121.0], zoom: 7.3,
      zoomControl: false, attributionControl: false,
    });
    L.control.zoom({ position: 'bottomright' }).addTo(m);
    // Tonal carto voyager tiles — clean, neutral look matching Anthropic aesthetic
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd', maxZoom: 19,
    }).addTo(m);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd', maxZoom: 19, pane: 'shadowPane',
    }).addTo(m);
    mapRef.current = m;
    layerRef.current = L.layerGroup().addTo(m);
  }, []);

  // render markers + polyline whenever stops change
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !layerRef.current) return;
    layerRef.current.clearLayers();
    markersRef.current = {};
    if (!stops || stops.length === 0) {
      if (lineRef.current) { m.removeLayer(lineRef.current); lineRef.current = null; }
      return;
    }

    stops.forEach((s, i) => {
      const mk = L.marker([s.lat, s.lng], { icon: numberedDivIcon(i + 1, s.id === activeId) })
        .addTo(layerRef.current)
        .on('click', () => onMarkerClick && onMarkerClick(s.id));
      markersRef.current[s.id] = mk;
    });

    // connecting line
    if (lineRef.current) { m.removeLayer(lineRef.current); }
    lineRef.current = L.polyline(stops.map(s => [s.lat, s.lng]), {
      color: '#C8621E', weight: 2, opacity: .6, dashArray: '4 6',
    }).addTo(m);

    // fit
    const bounds = L.latLngBounds(stops.map(s => [s.lat, s.lng]));
    m.fitBounds(bounds, { padding: [120, 420], maxZoom: 11 });
  }, [stops]);

  // rerender active marker style
  useEffect(() => {
    if (!stops) return;
    stops.forEach((s, i) => {
      const mk = markersRef.current[s.id];
      if (mk) mk.setIcon(numberedDivIcon(i + 1, s.id === activeId));
    });
  }, [activeId, stops]);

  // flyTo active
  useEffect(() => {
    if (!activeId || !mapRef.current || !stops) return;
    const s = stops.find(x => x.id === activeId);
    if (s) mapRef.current.flyTo([s.lat, s.lng], 12, { duration: 1.1 });
  }, [activeId]);

  return <div id="ist-map" style={{ position: 'absolute', inset: 0, background: '#EFEFE9' }} />;
}

// ============================================================
// Glassmorphism chat — top-left
// ============================================================
function ChatBar({ messages, onSend, loading }) {
  const [val, setVal] = useState('');
  const scrollRef = useRef(null);
  const [expanded, setExpanded] = useState(messages.length > 0);

  useEffect(() => {
    setExpanded(messages.length > 0 || loading);
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const submit = () => {
    if (!val.trim() || loading) return;
    onSend(val.trim());
    setVal('');
  };

  const suggestions = [
    '規劃一趟台南 + 高雄的 2 天美食小旅行',
    '我想去東部看自然風景，3 天',
    '北部老街 + 茶文化，週末慢遊',
  ];

  return (
    <div style={{
      position: 'absolute',
      top: 20, left: 20,
      width: 440,
      zIndex: 1000,
      background: 'rgba(255,255,255,.72)',
      backdropFilter: 'blur(20px) saturate(1.4)',
      WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
      border: '1px solid rgba(255,255,255,.8)',
      borderRadius: 14,
      boxShadow: '0 8px 32px -4px rgba(28,28,28,.16), 0 2px 6px rgba(28,28,28,.06)',
      overflow: 'hidden',
      fontFamily: 'inherit',
    }}>
      {/* Header */}
      <div style={{ padding: '12px 14px 10px', borderBottom: expanded ? '1px solid rgba(0,0,0,.06)' : 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 8,
          background: 'linear-gradient(135deg, #C8621E 0%, #9B4511 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
        }}>{Icon.sparkle(13)}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1a1a', letterSpacing: '.01em' }}>AI 行程規劃</div>
          <div style={{ fontSize: 9, color: '#6B6B6B', letterSpacing: '.04em' }}>根據資料庫 {window.ENRICHED_ARTICLES.length} 篇文章為您推薦路線</div>
        </div>
      </div>

      {/* Messages — only if expanded */}
      {expanded && (
        <div ref={scrollRef} style={{ maxHeight: 260, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '88%',
              background: m.role === 'user' ? '#1a1a1a' : 'rgba(255,255,255,.9)',
              color: m.role === 'user' ? '#fff' : '#1a1a1a',
              fontSize: 12, lineHeight: 1.55, padding: '8px 12px', borderRadius: 10,
              border: m.role === 'user' ? 'none' : '1px solid rgba(0,0,0,.06)',
            }}>{m.text}</div>
          ))}
          {loading && (
            <div style={{
              alignSelf: 'flex-start', maxWidth: '88%',
              background: 'rgba(255,255,255,.9)', border: '1px solid rgba(0,0,0,.06)',
              fontSize: 12, padding: '8px 12px', borderRadius: 10,
              color: '#6B6B6B',
              animation: 'ist-pulse 1.4s ease-in-out infinite',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ color: '#C8621E', display: 'flex' }}>{Icon.sparkle(12)}</span>
              AI 正在為您規劃專屬行程…
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '10px 10px 10px 14px', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.45)', borderTop: expanded ? '1px solid rgba(0,0,0,.06)' : 'none' }}>
        <input
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder={messages.length ? '繼續調整行程…' : '告訴我您想去的地方、想要的節奏'}
          disabled={loading}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            fontSize: 12.5, fontFamily: 'inherit', color: '#1a1a1a', padding: '6px 0',
          }}
        />
        <button onClick={submit} disabled={loading || !val.trim()} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '7px 12px', borderRadius: 8,
          background: loading || !val.trim() ? '#CCC9C0' : '#1a1a1a',
          color: '#fff', border: 'none', cursor: loading || !val.trim() ? 'default' : 'pointer',
          fontSize: 11, fontWeight: 500, fontFamily: 'inherit', letterSpacing: '.02em',
          transition: 'background .12s',
        }}>
          {Icon.sparkle(12)} <span>規劃</span>
        </button>
      </div>

      {/* Suggestions — only when empty */}
      {!expanded && !loading && (
        <div style={{ padding: '4px 12px 12px', display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {suggestions.map(s => (
            <button key={s} onClick={() => onSend(s)} style={{
              fontSize: 10.5, padding: '4px 9px', borderRadius: 12,
              background: 'rgba(255,255,255,.6)', border: '1px solid rgba(0,0,0,.08)',
              color: '#6B6B6B', cursor: 'pointer', fontFamily: 'inherit',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.95)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.6)'}
            >{s}</button>
          ))}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { ChatBar, MapWithMarkers });
