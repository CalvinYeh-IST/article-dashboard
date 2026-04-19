// ============================================================
// Planner view — composes Map + ChatBar + ItineraryPanel
// Handles conversational state, AI intent parsing, plan generation
// ============================================================

// Refinement intent — applied on top of an existing plan
// Looks for: "再加一天", "改成X天", "加入美食", "換成高鐵", "去掉XX", "多一點自然", "慢一點"
function parseRefinement(prompt, prevIntent) {
  const text = prompt;
  const next = { ...prevIntent };
  let changed = false;

  // Days change
  const mDays = text.match(/(\d+)\s*天/);
  if (mDays) { next.days = Math.min(7, Math.max(1, parseInt(mDays[1], 10))); changed = true; }
  else if (/再加一天|多一天|加一天/.test(text)) { next.days = Math.min(7, next.days + 1); changed = true; }
  else if (/少一天|減一天/.test(text))          { next.days = Math.max(1, next.days - 1); changed = true; }

  // Pace
  if (/慢遊|放鬆|悠閒|輕鬆|慢一點/.test(text)) { next.pace = 'relaxed'; changed = true; }
  else if (/緊湊|趕|高效|密集|多跑幾個|多一點景點/.test(text)) { next.pace = 'packed'; changed = true; }

  // Transport
  if (/高鐵/.test(text)) { next.transport = 'hsr'; changed = true; }
  else if (/台鐵|環島|火車/.test(text)) { next.transport = 'train'; changed = true; }
  else if (/客運|大眾|公車|捷運|無車/.test(text)) { next.transport = 'mixed'; changed = true; }
  else if (/開車|自駕/.test(text)) { next.transport = 'car'; changed = true; }

  // Add regions (accumulate)
  const addRegion = (r) => { if (!next.regions.includes(r)) { next.regions = [...next.regions, r]; changed = true; } };
  if (/北部|台北|新北|桃園/.test(text)) addRegion('北部');
  if (/中部|台中|彰化|南投/.test(text)) addRegion('中部');
  if (/南部|台南|高雄|嘉義|屏東/.test(text)) addRegion('南部');
  if (/東部|花蓮|台東|宜蘭/.test(text)) addRegion('東部');
  if (/離島|澎湖|金門|馬祖/.test(text)) addRegion('離島');

  // Add themes (accumulate)
  const addTheme = (t) => { if (!next.themes.includes(t)) { next.themes = [...next.themes, t]; changed = true; } };
  if (/美食|小吃|咖啡|茶|吃/.test(text)) addTheme('文化美食');
  if (/自然|山|海|生態|風景/.test(text)) addTheme('自然生態');
  if (/老街|文化|藝術|藝文|歷史/.test(text)) addTheme('藝術文化');
  if (/常民|市場|日常|生活/.test(text)) addTheme('常民生活');

  // Remove themes
  if (/不要.*?美食|去掉美食/.test(text)) { next.themes = next.themes.filter(t => t !== '文化美食'); changed = true; }
  if (/不要.*?自然|去掉自然/.test(text)) { next.themes = next.themes.filter(t => t !== '自然生態'); changed = true; }

  return { intent: next, changed };
}

// Very simple intent parser — extracts regions/themes/days/transport from Chinese prompt
function parseIntent(prompt) {
  const text = prompt;
  const regions = [];
  if (/北部|台北|新北|基隆|桃園|新竹|苗栗|北臺灣|北台灣/.test(text)) regions.push('北部');
  if (/中部|台中|臺中|彰化|南投|雲林/.test(text)) regions.push('中部');
  if (/南部|台南|臺南|高雄|嘉義|屏東|阿里山|墾丁/.test(text)) regions.push('南部');
  if (/東部|花蓮|台東|臺東|宜蘭/.test(text)) regions.push('東部');
  if (/離島|澎湖|金門|馬祖/.test(text)) regions.push('離島');

  const themes = [];
  if (/美食|小吃|咖啡|茶|吃/.test(text)) themes.push('文化美食');
  if (/自然|山|海|生態|風景/.test(text)) themes.push('自然生態');
  if (/老街|文化|藝術|藝文|歷史/.test(text)) themes.push('藝術文化');
  if (/常民|市場|日常|生活/.test(text)) themes.push('常民生活');

  // days
  let days = 2;
  const d = text.match(/(\d+)\s*天/);
  if (d) days = Math.min(7, Math.max(1, parseInt(d[1], 10)));
  else if (/週末|周末/.test(text)) days = 2;
  else if (/一天|單日|當日/.test(text)) days = 1;

  // pace
  let pace = 'balanced';
  if (/慢遊|放鬆|悠閒|輕鬆/.test(text)) pace = 'relaxed';
  else if (/緊湊|趕|高效|密集/.test(text)) pace = 'packed';

  // transport
  let transport = 'car';
  if (/高鐵/.test(text)) transport = 'hsr';
  else if (/台鐵|環島|火車/.test(text)) transport = 'train';
  else if (/客運|大眾|公車|捷運/.test(text)) transport = 'mixed';

  // start city
  let startCity = '台北';
  const cities = ['台北','臺北','台中','臺中','台南','臺南','高雄','花蓮','台東','臺東','宜蘭'];
  for (const c of cities) { if (text.includes(c)) { startCity = c.replace('臺','台'); break; } }

  return { regions, themes, days, pace, transport, startCity, rawPrompt: prompt };
}

function buildItinerary(intent) {
  let pool = window.ENRICHED_ARTICLES.filter(a => a.status === '已上架');
  // If regions specified, filter; otherwise keep all
  if (intent.regions.length) pool = pool.filter(a => (a.region || []).some(r => intent.regions.includes(r)));
  if (pool.length === 0) pool = window.ENRICHED_ARTICLES.filter(a => a.status === '已上架');

  // Rank
  const ranked = pool
    .map(a => ({ a, s: window.scoreArticle(a, intent) }))
    .sort((x, y) => y.s - x.s)
    .map(x => x.a);

  // Pick top N based on pace / days
  const p = window.PACE[intent.pace];
  const target = Math.min(ranked.length, p.stopsPerDay * intent.days);
  const picked = ranked.slice(0, target);

  const warnings = window.assessFeasibility({ articles: picked, days: intent.days, pace: intent.pace, transport: intent.transport });

  const plan = window.planItinerary({
    articles: picked,
    pace: intent.pace, transport: intent.transport,
    days: intent.days, startCity: intent.startCity,
  });

  // Title + summary
  const regionLabel = intent.regions.length ? intent.regions.join('、') : '全台';
  const themeLabel = intent.themes.length ? intent.themes.join(' · ') : '綜合體驗';
  const title = `${regionLabel} ${intent.days} 日行程：${themeLabel}`;
  const cityFirst = plan.stops[0]?.city;
  const cityLast = plan.stops[plan.stops.length - 1]?.city;
  const summary = plan.stops.length
    ? `從 ${cityFirst} 出發，${plan.stops.length > 1 ? `最終抵達 ${cityLast}` : ''}，共 ${plan.meta.totalStops} 站、總移動 ${plan.meta.totalKm} 公里。以${p.label}、${window.TRANSPORT[intent.transport].label}為主的節奏。`
    : '資料庫中沒有符合條件的景點，請嘗試調整描述。';

  return { ...plan, warnings, title, summary, params: intent };
}

function PlannerView({ onOpenArticle }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [itinerary, setItinerary] = useState(null);
  const [activeId, setActiveId] = useState(null);

  const handleSend = (prompt) => {
    setMessages(m => [...m, { role: 'user', text: prompt }]);
    setLoading(true);
    setTimeout(() => {
      let intent, isRefinement = false;
      if (itinerary?.params) {
        const r = parseRefinement(prompt, itinerary.params);
        if (r.changed) { intent = r.intent; isRefinement = true; }
      }
      if (!intent) intent = parseIntent(prompt);
      const plan = buildItinerary(intent);
      setItinerary(plan);
      setActiveId(plan.stops[0]?.id || null);
      const replyParts = [];
      if (isRefinement) {
        const changes = [];
        if (intent.days !== itinerary.params.days) changes.push(`調整為 ${intent.days} 天`);
        if (intent.pace !== itinerary.params.pace) changes.push(`節奏改為${window.PACE[intent.pace].label}`);
        if (intent.transport !== itinerary.params.transport) changes.push(`交通改為${window.TRANSPORT[intent.transport].label}`);
        const prevR = new Set(itinerary.params.regions), nowR = new Set(intent.regions);
        const addedR = [...nowR].filter(x => !prevR.has(x));
        if (addedR.length) changes.push(`加入 ${addedR.join('、')}`);
        const prevT = new Set(itinerary.params.themes), nowT = new Set(intent.themes);
        const addedT = [...nowT].filter(x => !prevT.has(x));
        if (addedT.length) changes.push(`加入 ${addedT.join(' · ')} 主題`);
        replyParts.push(`已更新：${changes.join('、') || '行程偏好'}，共 ${plan.meta.totalStops} 站、${plan.meta.days} 天。`);
      } else {
        replyParts.push(`已為您規劃「${plan.title}」，共 ${plan.meta.totalStops} 站、${plan.meta.days} 天。`);
      }
      if (plan.warnings.length) replyParts.push(`留意：${plan.warnings[0].msg}`);
      if (plan.unplaced.length) replyParts.push(`有 ${plan.unplaced.length} 個景點未能排入，已列於右側面板底部。`);
      setMessages(m => [...m, { role: 'ai', text: replyParts.join(' ') }]);
      setLoading(false);
    }, 2000);
  };

  const handleClear = () => {
    setItinerary(null); setActiveId(null); setMessages([]);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <MapWithMarkers
        stops={itinerary?.stops}
        activeId={activeId}
        onMarkerClick={id => setActiveId(id)}
      />
      <ChatBar messages={messages} onSend={handleSend} loading={loading} />
      <ItineraryPanel
        itinerary={itinerary}
        activeId={activeId}
        onHover={setActiveId}
        onOpenArticle={onOpenArticle}
        onClear={handleClear}
      />
    </div>
  );
}

Object.assign(window, { PlannerView, parseIntent, buildItinerary });
