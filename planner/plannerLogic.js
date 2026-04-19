// ============================================================
// AI Planner logic: conversational state machine + feasibility
// ============================================================

// Haversine distance in km
function distKm(a, b) {
  const R = 6371;
  const toRad = x => x * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat), la2 = toRad(b.lat);
  const h = Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Pace presets → daily km/travel-time caps
const PACE = {
  relaxed: { label: '放鬆慢遊',  dailyKm: 120, stopsPerDay: 3, avgStopMin: 90 },
  balanced:{ label: '均衡節奏',  dailyKm: 220, stopsPerDay: 4, avgStopMin: 70 },
  packed:  { label: '緊湊高效',  dailyKm: 350, stopsPerDay: 5, avgStopMin: 50 },
};

// Transport mode → km/h average + feasibility note
const TRANSPORT = {
  car:    { label: '自駕 / 租車', kmh: 55, icon: '🚗', note: '國道 + 省道平均速度' },
  hsr:    { label: '高鐵為主',    kmh: 180, icon: '🚄', note: '限台北↔高雄西部幹線' },
  train:  { label: '台鐵環島',    kmh: 65, icon: '🚆', note: '含東部幹線' },
  mixed:  { label: '大眾運輸混搭', kmh: 50, icon: '🚌', note: '台鐵 + 客運 + 在地交通' },
};

// Score how well an article matches user's interests/regions/themes
function scoreArticle(a, { regions = [], themes = [] } = {}) {
  let s = 0;
  regions.forEach(r => { if ((a.region || []).includes(r)) s += 3; });
  themes.forEach(t => { if ((a.theme || []).includes(t)) s += 2; });
  // prefer 已上架 for itinerary (published content)
  if (a.status === '已上架') s += 1;
  return s;
}

// Nearest-neighbour ordering from a starting city
function greedyRoute(articles, startLat, startLng) {
  const remaining = [...articles];
  const ordered = [];
  let cur = { lat: startLat, lng: startLng };
  while (remaining.length) {
    remaining.sort((a, b) => distKm(cur, a) - distKm(cur, b));
    const next = remaining.shift();
    ordered.push(next);
    cur = next;
  }
  return ordered;
}

// Assign articles to days given pace / transport
function planItinerary({ articles, pace = 'balanced', transport = 'car', days = 2, startCity = '台北' }) {
  const p = PACE[pace], t = TRANSPORT[transport];
  const start = window.CITY_COORDS[startCity] || window.CITY_COORDS['台北'];
  const ordered = greedyRoute(articles, start.lat, start.lng);

  const plan = [];
  let dayIdx = 1;
  let dayKm = 0;
  let dayStops = 0;
  let prev = start;
  let dayStart = '09:00';

  const timeStrAdd = (hhmm, minutes) => {
    const [h, m] = hhmm.split(':').map(Number);
    const total = h*60 + m + minutes;
    const nh = Math.floor(total / 60) % 24, nm = total % 60;
    return `${String(nh).padStart(2,'0')}:${String(nm).padStart(2,'0')}`;
  };

  let curTime = dayStart;
  let unplaced = [];

  for (const a of ordered) {
    const legKm = distKm(prev, a);
    const legMin = Math.round(legKm / t.kmh * 60);
    const wouldKm = dayKm + legKm;
    const wouldStops = dayStops + 1;

    // If overflows, advance day
    if (wouldKm > p.dailyKm || wouldStops > p.stopsPerDay) {
      if (dayIdx >= days) {
        // ran out of days; mark remaining as unplaced
        unplaced.push(a);
        continue;
      }
      dayIdx++;
      dayKm = 0;
      dayStops = 0;
      curTime = '09:00';
      prev = start; // assume returns to base hotel each morning (simplification)
      const legKm2 = distKm(prev, a);
      const legMin2 = Math.round(legKm2 / t.kmh * 60);
      curTime = timeStrAdd(curTime, legMin2);
      plan.push({ ...a, day: dayIdx, time: curTime, travelMin: legMin2, travelKm: +legKm2.toFixed(1) });
      curTime = timeStrAdd(curTime, p.avgStopMin);
      dayKm = legKm2;
      dayStops = 1;
      prev = a;
    } else {
      curTime = timeStrAdd(curTime, legMin);
      plan.push({ ...a, day: dayIdx, time: curTime, travelMin: legMin, travelKm: +legKm.toFixed(1) });
      curTime = timeStrAdd(curTime, p.avgStopMin);
      dayKm = wouldKm;
      dayStops = wouldStops;
      prev = a;
    }
  }

  return {
    stops: plan,
    unplaced,
    meta: {
      totalKm: Math.round(plan.reduce((s, x) => s + x.travelKm, 0)),
      totalStops: plan.length,
      days: Math.max(...plan.map(x => x.day), 1),
      pace: p.label,
      transport: t.label,
    },
  };
}

// Feasibility checks → warnings
function assessFeasibility({ articles, days, pace, transport }) {
  const warnings = [];
  const p = PACE[pace], t = TRANSPORT[transport];

  const maxPossible = p.stopsPerDay * days;
  if (articles.length > maxPossible) {
    warnings.push({
      level: 'warn',
      msg: `您選的 ${articles.length} 個景點，以「${p.label}」${days} 天的節奏最多只能安排 ${maxPossible} 站。建議：拉長行程或改成「緊湊高效」節奏。`,
    });
  }

  // Rough span check: if articles span more than ~500km north-south, warn
  const lats = articles.map(a => a.lat), lngs = articles.map(a => a.lng);
  const spanKm = distKm(
    { lat: Math.min(...lats), lng: Math.min(...lngs) },
    { lat: Math.max(...lats), lng: Math.max(...lngs) }
  );
  if (spanKm > 400 && days < 3) {
    warnings.push({
      level: 'warn',
      msg: `這些景點橫跨 ${Math.round(spanKm)} 公里（約全台南北長度），${days} 天會很趕。建議至少 ${Math.ceil(spanKm/200)} 天。`,
    });
  }

  if (transport === 'hsr' && articles.some(a => ['東部','離島'].includes((a.region || [])[0]))) {
    warnings.push({
      level: 'warn',
      msg: '您選了高鐵，但行程包含東部或離島景點，高鐵無法抵達。建議改成「台鐵環島」或「自駕」。',
    });
  }

  return warnings;
}

Object.assign(window, { distKm, PACE, TRANSPORT, scoreArticle, planItinerary, assessFeasibility });
