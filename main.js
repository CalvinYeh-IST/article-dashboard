const QS = ['Q1','Q2','Q3','Q4'];
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

let articles        = [];
let config          = {};
let summary         = {};
let weeklyData      = {};
let contentArticles = [];
let contentSummary  = {};
let activeThemes    = new Set();
let activeRegions   = new Set();
let activeSeasons   = new Set();
let activeHas       = new Set();
let currentYear     = '';
let currentTab      = 'exec';
let execChart       = null;
let mgrChart        = null;
let trendChart      = null;
let achieveChart    = null;
let editingId       = null;

const THEMES   = ['文化美食','自然生態','常民生活','藝術文化','綜覽台灣'];
const REGIONS  = ['北部','中部','南部','東部','離島'];
const SEASONS  = ['春','夏','秋','冬'];
const HAS_OPTS = ['店家','小吃','伴手禮','景點','活動'];
const AI_CACHE = new Map();
const AI_CACHE_LIMIT = 30;

document.getElementById('date-label').textContent =
  '截至 ' + new Date().toLocaleDateString('zh-TW', {year:'numeric',month:'long',day:'numeric'});

Promise.all([
  fetch('data.json').then(r => r.json()),
  fetch('config.json').then(r => r.json()),
  fetch('summary.json').then(r => r.json()).catch(() => null),
  fetch('weekly.json').then(r => r.json()).catch(() => null),
  fetch('content.json').then(r => r.json()).catch(() => []),
  fetch('content_summary.json').then(r => r.json()).catch(() => null),
]).then(([data, cfg, sum, weekly, content, contentSum]) => {
  articles        = data;
  config          = cfg;
  summary         = sum || {};
  weeklyData      = weekly || {};
  contentArticles = content || [];
  contentSummary  = contentSum || {};
  currentYear     = cfg.years[cfg.years.length - 1];
  init();
}).catch(err => {
  document.getElementById('app').innerHTML =
    `<div class="error-screen">資料載入失敗：${err.message}<br>請確認 data.json 與 config.json 存在。</div>`;
});

function init() {
  document.getElementById('app').innerHTML = `
    <div class="top-nav">
      <div class="year-tabs" id="year-tabs"></div>
      <div style="font-size:11px;color:#b4b2a9" id="year-stat"></div>
    </div>
    <div class="tab-bar">
      <button class="tab active" onclick="switchTab('exec',this)">長官報告版</button>
      <button class="tab" onclick="switchTab('mgr',this)">主管報告版</button>
      <button class="tab" onclick="switchTab('ops',this)">後台編輯版</button>
      <button class="tab" onclick="switchTab('qa',this)">AI 數據摘要</button>
      <button class="tab" onclick="switchTab('search',this)">文章查詢</button>
    </div>
    <div id="view-exec"   class="view active"></div>
    <div id="view-mgr"    class="view"></div>
    <div id="view-ops"    class="view"></div>
    <div id="view-qa"     class="view"></div>
    <div id="view-search" class="view"></div>
  `;
  buildYearTabs();
  renderExec();
}

function filtered() { return articles.filter(a => a.year === currentYear); }

function getStats(arts) {
  const lzQ={},leQ={},fzQ={},feQ={};
  QS.forEach(q => { lzQ[q]=0; leQ[q]=0; fzQ[q]=0; feQ[q]=0; });
  arts.forEach(a => {
    if (a.liveZh) lzQ[a.q]++;
    if (a.liveEn) leQ[a.q]++;
    if (a.dateZh || a.liveZh) fzQ[a.q]++;
    if (a.dateEn || a.liveEn) feQ[a.q]++;
  });
  return {lzQ,leQ,fzQ,feQ};
}

function pct(a,t) { return t > 0 ? Math.round(a/t*100) : 0; }
function pill(p) {
  const c = p>=100?'pct-ok':p>=60?'pct-warn':'pct-danger';
  return `<span class="pct-pill ${c}">${p}%</span>`;
}

function buildYearTabs() {
  const el = document.getElementById('year-tabs');
  if (!el) return;
  el.innerHTML = config.years.map(y =>
    `<button class="yr${y===currentYear?' active':''}" onclick="setYear('${y}')">${y}</button>`
  ).join('');
  const arts = filtered();
  const lz = arts.filter(a => a.liveZh).length;
  const le = arts.filter(a => a.liveEn).length;
  const stat = document.getElementById('year-stat');
  if (stat) stat.textContent = `${currentYear} 共 ${arts.length} 篇｜中文上架 ${lz}｜英文上架 ${le}`;
}

function setYear(y) {
  currentYear = y;
  buildYearTabs();
  if      (currentTab==='exec')   renderExec();
  else if (currentTab==='mgr')    renderMgr();
  else if (currentTab==='ops')    renderOps();
  else if (currentTab==='qa')     renderQA();
  else if (currentTab==='search') renderSearch();
}

function kpiBlock(lang, stats, elId) {
  const kpi        = config.kpi[currentYear][lang];
  const isZh       = lang === 'zh';
  const liveByQ    = isZh ? stats.lzQ : stats.leQ;
  const fcByQ      = isZh ? stats.fzQ : stats.feQ;
  const totalT     = Object.values(kpi).reduce((a,b)=>a+b,0);
  const totalL     = Object.values(liveByQ).reduce((a,b)=>a+b,0);
  const totalF     = Object.values(fcByQ).reduce((a,b)=>a+b,0);
  const color      = isZh ? '#185FA5' : '#1D9E75';
  const colorLight = isZh ? '#B5D4F4' : '#9FE1CB';
  const rows = QS.map(q => {
    const t=kpi[q], l=liveByQ[q]||0, f=fcByQ[q]||0;
    const lp=Math.min(100,pct(l,t)), fp=Math.min(100,pct(f,t));
    return `<div class="progress-row">
      <span class="p-label">${q} 目標 ${t}</span>
      <div class="p-track">
        <div class="p-fc" style="width:${fp}%;background:${colorLight}"></div>
        <div class="p-ac" style="width:${lp}%;background:${color}"></div>
      </div>
      <div class="p-nums">已上架 <strong>${l}</strong>，預計達 <strong>${f}</strong></div>
      ${pill(pct(l,t))}
    </div>`;
  }).join('');
  document.getElementById(elId).innerHTML = `
    <div class="kpi-header">
      <span class="kpi-title">${isZh?'中文稿':'英文稿'} ${currentYear} KPI</span>
      <span class="kpi-meta">目標 ${totalT} 篇｜已上架 ${totalL}，預計可達 ${totalF}</span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px">
      <div style="background:#f5f5f3;border-radius:8px;padding:.75rem;text-align:center">
        <div style="font-size:10px;color:#888780;margin-bottom:4px">全年目標</div>
        <div style="font-size:22px;font-weight:500;color:#1a1a1a">${totalT}</div>
      </div>
      <div style="background:#f5f5f3;border-radius:8px;padding:.75rem;text-align:center">
        <div style="font-size:10px;color:#888780;margin-bottom:4px">已上架</div>
        <div style="font-size:22px;font-weight:500;color:${color}">${totalL}</div>
        <div style="font-size:10px;color:#b4b2a9">${pct(totalL,totalT)}% 達成</div>
      </div>
      <div style="background:#f5f5f3;border-radius:8px;padding:.75rem;text-align:center">
        <div style="font-size:10px;color:#888780;margin-bottom:4px">預計可達</div>
        <div style="font-size:22px;font-weight:500;color:#1a1a1a">${totalF}</div>
        <div style="font-size:10px;color:#b4b2a9">${pct(totalF,totalT)}% 預估</div>
      </div>
    </div>
    ${rows}
    <div class="legend-row">
      <span><span class="ld" style="background:${color}"></span>已上架</span>
      <span><span class="ld" style="background:${colorLight}"></span>預計達成</span>
    </div>`;
}

function buildCumData(lang, arts) {
  const kpi = config.kpi[currentYear][lang];
  const lbm = Array(12).fill(0);
  arts.forEach(a => {
    const ds = lang==='zh' ? a.dateZh : a.dateEn;
    const lv = lang==='zh' ? a.liveZh : a.liveEn;
    if (lv && ds) { const m = new Date(ds).getMonth(); if(m>=0&&m<12) lbm[m]++; }
  });
  const cumA=[]; let s=0;
  lbm.forEach(v => { s+=v; cumA.push(s); });
  const cumT=[]; let ts=0;
  QS.forEach(q => { const pm=kpi[q]/3; [0,1,2].forEach(()=>{ ts+=pm; cumT.push(Math.round(ts)); }); });
  return {cumA, cumT};
}

function renderExec() {
  const arts   = filtered();
  const stats  = getStats(arts);
  const kpi    = config.kpi[currentYear];
  const totalLZh = Object.values(stats.lzQ).reduce((a,b)=>a+b,0);
  const totalLEn = Object.values(stats.leQ).reduce((a,b)=>a+b,0);
  const totalTZh = Object.values(kpi.zh).reduce((a,b)=>a+b,0);
  const totalTEn = Object.values(kpi.en).reduce((a,b)=>a+b,0);
  const pZh = pct(totalLZh,totalTZh), pEn = pct(totalLEn,totalTEn);
  const dZh = buildCumData('zh',arts), dEn = buildCumData('en',arts);
  document.getElementById('view-exec').innerHTML = `
    <div class="mcard-grid">
      <div class="mcard"><div class="mcard-label">中文全年目標</div><div class="mcard-val">${totalTZh}</div><div class="mcard-sub">篇</div></div>
      <div class="mcard ${pZh>=80?'ok':pZh>=50?'warn':'danger'}"><div class="mcard-label">中文已上架</div><div class="mcard-val">${totalLZh}</div><div class="mcard-sub">${pZh}% 達成</div></div>
      <div class="mcard"><div class="mcard-label">英文全年目標</div><div class="mcard-val">${totalTEn}</div><div class="mcard-sub">篇</div></div>
      <div class="mcard ${pEn>=80?'ok':pEn>=50?'warn':'danger'}"><div class="mcard-label">英文已上架</div><div class="mcard-val">${totalLEn}</div><div class="mcard-sub">${pEn}% 達成</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem">
      <div class="kpi-block" id="exec-kpi-zh"></div>
      <div class="kpi-block" id="exec-kpi-en"></div>
    </div>
    <div class="kpi-block">
      <div class="kpi-header">
        <span class="kpi-title">${currentYear} 全年累積上架進度</span>
        <span class="kpi-meta">實際累積 vs 目標進度線（依月均攤）</span>
      </div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:11px;color:#888780;margin-bottom:10px">
        <span><span class="ld" style="background:#185FA5"></span>中文實際累積</span>
        <span><span class="ld" style="background:#1D9E75"></span>英文實際累積</span>
        <span><span class="ld" style="background:#D3D1C7"></span>中文目標</span>
        <span><span class="ld" style="background:#9FE1CB"></span>英文目標</span>
      </div>
      <div class="chart-wrap" style="height:230px"><canvas id="exec-chart"></canvas></div>
    </div>
    <div class="watermark">${currentYear} 年度數據 · 每週更新</div>`;
  kpiBlock('zh', stats, 'exec-kpi-zh');
  kpiBlock('en', stats, 'exec-kpi-en');
  if (execChart) execChart.destroy();
  execChart = new Chart(document.getElementById('exec-chart').getContext('2d'), {
    type:'line',
    data:{labels:MONTH_LABELS, datasets:[
      {data:dZh.cumT, borderColor:'#B4B2A9', borderDash:[5,4], borderWidth:1.5, pointRadius:0, fill:false, tension:0},
      {data:dEn.cumT, borderColor:'#9FE1CB', borderDash:[5,4], borderWidth:1.5, pointRadius:0, fill:false, tension:0},
      {data:dZh.cumA, borderColor:'#185FA5', backgroundColor:'rgba(24,95,165,0.07)', borderWidth:2, pointRadius:3, pointBackgroundColor:'#185FA5', fill:true, tension:0.3},
      {data:dEn.cumA, borderColor:'#1D9E75', backgroundColor:'rgba(29,158,117,0.07)', borderWidth:2, pointRadius:3, pointBackgroundColor:'#1D9E75', fill:true, tension:0.3},
    ]},
    options:{responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}, tooltip:{mode:'index',intersect:false}},
      scales:{
        x:{grid:{display:false}, ticks:{color:'#888780',font:{size:11}}},
        y:{grid:{color:'rgba(136,135,128,0.12)'}, ticks:{color:'#888780',font:{size:11},stepSize:20}, min:0}
      }}
  });
}

function renderMgr() {
  const weeks   = (weeklyData.weeks || []);
  const arts    = filtered();
  const stats   = getStats(arts);
  const today   = new Date(); today.setHours(0,0,0,0);
  const overdue = arts.filter(a=>!a.liveZh&&a.dateZh&&new Date(a.dateZh)<today).length;
  const stuck   = arts.filter(a=>a.status==='翻譯中'&&a.dateZh&&(today-new Date(a.dateZh))/86400000>7).length;

  document.getElementById('view-mgr').innerHTML = `
    <div id="mgr-weekly-section"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
      <div class="kpi-block" id="mgr-kpi-zh"></div>
      <div class="kpi-block" id="mgr-kpi-en"></div>
    </div>
    <div class="kpi-block">
      <div class="kpi-header"><span class="kpi-title">各季文章狀態分布</span><span class="kpi-meta">${currentYear} 年度</span></div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:11px;color:#888780;margin-bottom:10px">
        <span><span class="ld" style="background:#185FA5"></span>中文上架</span>
        <span><span class="ld" style="background:#1D9E75"></span>英文上架</span>
        <span><span class="ld" style="background:#EF9F27"></span>翻譯/待上架</span>
        <span><span class="ld" style="background:#7F77DD"></span>審稿中</span>
      </div>
      <div class="chart-wrap" style="height:200px"><canvas id="mgr-chart"></canvas></div>
    </div>`;

  kpiBlock('zh', stats, 'mgr-kpi-zh');
  kpiBlock('en', stats, 'mgr-kpi-en');

  if (mgrChart) mgrChart.destroy();
  mgrChart = new Chart(document.getElementById('mgr-chart').getContext('2d'), {
    type:'bar',
    data:{labels:QS, datasets:[
      {label:'中文上架',    data:QS.map(q=>stats.lzQ[q]||0), backgroundColor:'#185FA5'},
      {label:'英文上架',    data:QS.map(q=>stats.leQ[q]||0), backgroundColor:'#1D9E75'},
      {label:'翻譯/待上架', data:QS.map(q=>arts.filter(a=>a.q===q&&(a.status==='翻譯中'||a.status==='待上架')).length), backgroundColor:'#EF9F27'},
      {label:'審稿中',      data:QS.map(q=>arts.filter(a=>a.q===q&&a.status==='審稿/校稿').length), backgroundColor:'#7F77DD'},
    ]},
    options:{responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}, tooltip:{mode:'index',intersect:false}},
      scales:{
        x:{stacked:true, grid:{display:false}, ticks:{color:'#888780',font:{size:11}}},
        y:{stacked:true, grid:{color:'rgba(136,135,128,0.12)'}, ticks:{color:'#888780',font:{size:11},stepSize:5}}
      }}
  });

  const yearWeeks = weeks.filter(w => w.week.startsWith(currentYear));
  if (yearWeeks.length > 0) renderWeeklySection(yearWeeks, overdue, stuck);
  else document.getElementById('mgr-weekly-section').innerHTML = `
    <div class="kpi-block" style="margin-bottom:1rem;text-align:center;padding:2rem">
      <div style="font-size:13px;color:#888780">尚無週別記錄</div>
      <div style="font-size:11px;color:#b4b2a9;margin-top:6px">請在 Excel 的「週別記錄」工作表填入數據後執行 sync.py</div>
    </div>`;
}

function renderWeeklySection(weeks, overdue, stuck) {
  let idx = weeks.length - 1;

  function pCtColor(p) { return p>=100?'#0F6E56':p>=80?'#854F0B':'#A32D2D'; }
  function pCtBadge(p) { return `font-size:10px;padding:2px 7px;border-radius:8px;font-weight:500;background:${p>=100?'#EAF3DE':p>=80?'#FAEEDA':'#FCEBEB'};color:${pCtColor(p)}`; }

  function weekCard(w) {
    const tc = w.transRate>=80?'#1D9E75':w.transRate>=50?'#EF9F27':'#E24B4A';
    const ed = w.enDanger, ew = w.enWarn && !ed;
    const sc = ed?'#A32D2D':ew?'#854F0B':'#1D9E75';
    const sb = `font-size:10px;padding:2px 7px;border-radius:8px;font-weight:500;background:${ed?'#FCEBEB':ew?'#FAEEDA':'#EAF3DE'};color:${sc}`;

    const actions = [];
    if (ed) actions.push({t:'urgent', m:`EN 庫存僅剩 ${w.enStock} 篇，已低於警戒線 5 篇。需從待翻譯排程（${w.enPending} 篇）優先送譯至少 5 篇，避免下週斷稿。`});
    else if (ew) actions.push({t:'warn', m:`EN 庫存 ${w.enStock} 篇，接近警戒線。建議本週補充翻譯 3 篇以上，維持安全水位。`});
    if (w.transRate < 80) actions.push({t:'warn', m:`中英轉譯率 ${w.transRate}%，低於建議值 80%。中文產出速度超前英譯，建議評估增加翻譯資源。`});
    if (w.enAchieve < 80) actions.push({t:'urgent', m:`本週 EN 達成率僅 ${w.enAchieve}%，請確認翻譯卡關原因，調整下週排程補足缺口。`});
    if (w.cnAchieve >= 100 && w.cnReady > 15) actions.push({t:'normal', m:`CN 達成率 ${w.cnAchieve}%，Ready 庫存充裕（${w.cnReady} 篇）。可主動推進這批稿件進入翻譯流程。`});
    if (overdue > 0) actions.push({t:'warn', m:`共 ${overdue} 篇逾期未上架，請確認處理進度。`});
    if (stuck > 0) actions.push({t:'warn', m:`共 ${stuck} 篇翻譯超過 7 天未更新，需追蹤。`});
    if (actions.length === 0) actions.push({t:'normal', m:'本週各項指標正常，請維持現有節奏。'});

    const row = (label, hint, cnContent, enContent) => `
      <div style="display:grid;grid-template-columns:180px 1fr 1fr;border-bottom:1px solid #f1efe8">
        <div style="padding:12px 16px;display:flex;align-items:center"><div><strong style="display:block;font-size:12px;color:#1a1a1a">${label}</strong>${hint?`<span style="font-size:10px;color:#888780">${hint}</span>`:''}</div></div>
        <div style="padding:12px 16px;border-left:1px solid #f1efe8;display:flex;align-items:center;gap:8px">${cnContent}</div>
        <div style="padding:12px 16px;border-left:1px solid #f1efe8;display:flex;align-items:center;gap:8px">${enContent}</div>
      </div>`;

    const progressCell = (act, plan, color) => `
      <div style="flex:1">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:22px;font-weight:500;color:${pCtColor(pct(act,plan))}">${act}</span>
          <span style="${pCtBadge(pct(act,plan))}">${pct(act,plan)}%</span>
        </div>
        <div style="height:5px;background:#f1efe8;border-radius:3px;margin-top:6px;overflow:hidden">
          <div style="height:100%;width:${Math.min(100,pct(act,plan))}%;background:${pCtColor(pct(act,plan))};border-radius:3px"></div>
        </div>
        <div style="font-size:10px;color:#b4b2a9;margin-top:3px">計畫 ${plan} 篇</div>
      </div>`;

    return `
      <div style="background:#fff;border:1px solid #e8e8e4;border-radius:12px;overflow:hidden;margin-bottom:1rem">
        <div style="display:grid;grid-template-columns:180px 1fr 1fr;border-bottom:1px solid #e8e8e4">
          <div style="padding:12px 16px;font-size:12px;font-weight:500;color:#888780"><span style="font-size:10px;color:#b4b2a9;display:block;margin-bottom:2px">${w.week}</span>指標項目</div>
          <div style="padding:12px 16px;font-size:12px;font-weight:500;background:#E6F1FB;color:#0C447C;border-left:1px solid #e8e8e4"><span style="font-size:10px;font-weight:400;display:block;margin-bottom:2px">中文內容</span>CN 中文稿</div>
          <div style="padding:12px 16px;font-size:12px;font-weight:500;background:#E1F5EE;color:#085041;border-left:1px solid #e8e8e4"><span style="font-size:10px;font-weight:400;display:block;margin-bottom:2px">英譯內容</span>EN 英譯稿</div>
        </div>
        <div style="font-size:10px;color:#888780;padding:5px 16px;background:#fafaf8;border-bottom:1px solid #f1efe8;font-weight:500">本週產出</div>
        ${row('本週預計上架','週計畫目標',`<span style="font-size:22px;font-weight:500;color:#185FA5">${w.cnPlan}</span><span style="font-size:11px;color:#888780">篇</span>`,`<span style="font-size:22px;font-weight:500;color:#1D9E75">${w.enPlan}</span><span style="font-size:11px;color:#888780">篇</span>`)}
        <div style="display:grid;grid-template-columns:180px 1fr 1fr;border-bottom:1px solid #f1efe8">
          <div style="padding:12px 16px;display:flex;align-items:center"><div><strong style="display:block;font-size:12px;color:#1a1a1a">本週實際上架</strong><span style="font-size:10px;color:#888780">已完成發出</span></div></div>
          <div style="padding:12px 16px;border-left:1px solid #f1efe8">${progressCell(w.cnAct,w.cnPlan,'#185FA5')}</div>
          <div style="padding:12px 16px;border-left:1px solid #f1efe8">${progressCell(w.enAct,w.enPlan,'#1D9E75')}</div>
        </div>
        <div style="font-size:10px;color:#888780;padding:5px 16px;background:#fafaf8;border-bottom:1px solid #f1efe8;font-weight:500">累計總量</div>
        ${row('累計總上架','',`<span style="font-size:22px;font-weight:500;color:#185FA5">${w.cnCum.toLocaleString()}</span><span style="font-size:10px;color:#888780">篇（計畫 ${w.cnPlanCum}）</span>`,`<span style="font-size:22px;font-weight:500;color:#1D9E75">${w.enCum.toLocaleString()}</span><span style="font-size:10px;color:#888780">篇（計畫 ${w.enPlanCum}）</span>`)}
        <div style="display:grid;grid-template-columns:180px 1fr;border-bottom:1px solid #f1efe8">
          <div style="padding:12px 16px;display:flex;align-items:center"><div><strong style="display:block;font-size:12px;color:#1a1a1a">中英轉譯率</strong><span style="font-size:10px;color:#888780">EN累計 ÷ CN累計</span></div></div>
          <div style="padding:12px 16px;border-left:1px solid #f1efe8">
            <div style="display:flex;align-items:center;gap:10px">
              <span style="font-size:26px;font-weight:500;color:${tc}">${w.transRate}%</span>
              <span style="font-size:10px;padding:2px 7px;border-radius:8px;font-weight:500;background:${w.transRate>=80?'#EAF3DE':w.transRate>=50?'#FAEEDA':'#FCEBEB'};color:${tc}">${w.transRate>=80?'健康':w.transRate>=50?'偏低':'警告'}</span>
              <span style="font-size:11px;color:#b4b2a9">EN ${w.enCum} ÷ CN ${w.cnCum}</span>
            </div>
            <div style="height:8px;background:#f1efe8;border-radius:4px;margin-top:8px;overflow:hidden"><div style="height:100%;width:${Math.min(100,w.transRate)}%;background:${tc};border-radius:4px"></div></div>
          </div>
        </div>
        <div style="font-size:10px;color:#888780;padding:5px 16px;background:#fafaf8;border-bottom:1px solid #f1efe8;font-weight:500">庫存水位</div>
        ${row('目前可用庫存','Ready，隨時可發',`<span style="font-size:22px;font-weight:500;color:#185FA5">${w.cnReady}</span><span style="font-size:11px;color:#888780">篇</span>`,`<span style="font-size:22px;font-weight:500;color:${sc}">${w.enStock}</span><span style="${sb}">庫存${ed?'危險':ew?'注意':'正常'}</span>`)}
        ${row('待翻譯排程','已有中文、待譯','<span style="font-size:14px;color:#d3d1c7">—</span>',`<span style="font-size:22px;font-weight:500;color:#534AB7">${w.enPending}</span><span style="font-size:11px;color:#888780">篇排隊中</span>`)}
      </div>
      <div style="background:#fff;border:1px solid #e8e8e4;border-radius:12px;padding:1.25rem;margin-bottom:1rem">
        <div style="font-size:13px;font-weight:500;margin-bottom:12px">本週行動建議</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${actions.map(a=>`
            <div style="display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:8px;border:1px solid;${a.t==='urgent'?'background:#FCEBEB;border-color:#F7C1C1':a.t==='warn'?'background:#FAEEDA;border-color:#FAC775':'background:#EAF3DE;border-color:#C0DD97'}">
              <div style="width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:3px;background:${a.t==='urgent'?'#E24B4A':a.t==='warn'?'#EF9F27':'#639922'}"></div>
              <div style="font-size:12px;line-height:1.6;color:${a.t==='urgent'?'#A32D2D':a.t==='warn'?'#854F0B':'#3B6D11'}">${a.m}</div>
            </div>`).join('')}
        </div>
      </div>`;
  }

  const selectorHtml = `
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:1.25rem;flex-wrap:wrap">
      <span style="font-size:12px;color:#888780;margin-right:4px">切換週別</span>
      ${weeks.filter(w=>w.week.startsWith(currentYear)).map((w,i)=>`<button id="wbtn-${i}" onclick="selectWeekBtn(${i})"
        style="padding:5px 14px;font-size:12px;border-radius:20px;cursor:pointer;border:1px solid #d3d1c7;background:${i===idx?'#185FA5':'#fff'};color:${i===idx?'#fff':'#888780'};font-weight:${i===idx?'500':'400'}"
        >${w.week}</button>`).join('')}
    </div>`;

  const chartHtml = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
      <div class="kpi-block">
        <div class="kpi-header"><span class="kpi-title">累計上架趨勢</span></div>
        <div style="display:flex;gap:12px;font-size:11px;color:#888780;margin-bottom:8px">
          <span><span class="ld" style="background:#185FA5"></span>CN累計</span>
          <span><span class="ld" style="background:#1D9E75"></span>EN累計</span>
          <span><span class="ld" style="background:#B5D4F4"></span>CN計畫</span>
          <span><span class="ld" style="background:#9FE1CB"></span>EN計畫</span>
        </div>
        <div class="chart-wrap" style="height:160px"><canvas id="w-trend-chart"></canvas></div>
      </div>
      <div class="kpi-block">
        <div class="kpi-header"><span class="kpi-title">週別達成率</span></div>
        <div style="display:flex;gap:12px;font-size:11px;color:#888780;margin-bottom:8px">
          <span><span class="ld" style="background:#185FA5"></span>CN</span>
          <span><span class="ld" style="background:#1D9E75"></span>EN</span>
        </div>
        <div class="chart-wrap" style="height:160px"><canvas id="w-achieve-chart"></canvas></div>
      </div>
    </div>`;

  document.getElementById('mgr-weekly-section').innerHTML =
    selectorHtml +
    `<div id="week-detail">${weekCard(weeks[idx])}</div>` +
    chartHtml;

  window.selectWeekBtn = function(i) {
    idx = i;
    weeks.forEach((_,j) => {
      const b = document.getElementById(`wbtn-${j}`);
      if (b) { b.style.background=j===i?'#185FA5':'#fff'; b.style.color=j===i?'#fff':'#888780'; b.style.fontWeight=j===i?'500':'400'; }
    });
    document.getElementById('week-detail').innerHTML = weekCard(weeks[i]);
  };

  const labels  = weeks.map(w=>w.week.replace('2026-',''));
  if (trendChart) trendChart.destroy();
  trendChart = new Chart(document.getElementById('w-trend-chart').getContext('2d'), {
    type:'line',
    data:{labels, datasets:[
      {data:weeks.map(w=>w.cnPlanCum), borderColor:'#B5D4F4', borderDash:[5,3], borderWidth:1.5, pointRadius:0, fill:false, tension:0},
      {data:weeks.map(w=>w.enPlanCum), borderColor:'#9FE1CB', borderDash:[5,3], borderWidth:1.5, pointRadius:0, fill:false, tension:0},
      {data:weeks.map(w=>w.cnCum), borderColor:'#185FA5', backgroundColor:'rgba(24,95,165,0.06)', borderWidth:2, pointRadius:4, pointBackgroundColor:'#185FA5', fill:true, tension:0.3},
      {data:weeks.map(w=>w.enCum), borderColor:'#1D9E75', backgroundColor:'rgba(29,158,117,0.06)', borderWidth:2, pointRadius:4, pointBackgroundColor:'#1D9E75', fill:true, tension:0.3},
    ]},
    options:{responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}, tooltip:{mode:'index',intersect:false}},
      scales:{x:{grid:{display:false},ticks:{color:'#888780',font:{size:10}}},y:{grid:{color:'rgba(136,135,128,0.12)'},ticks:{color:'#888780',font:{size:10}},min:0}}}
  });
  if (achieveChart) achieveChart.destroy();
  achieveChart = new Chart(document.getElementById('w-achieve-chart').getContext('2d'), {
    type:'bar',
    data:{labels, datasets:[
      {label:'CN', data:weeks.map(w=>w.cnAchieve), backgroundColor:'#185FA5'},
      {label:'EN', data:weeks.map(w=>w.enAchieve), backgroundColor:'#1D9E75'},
    ]},
    options:{responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}, tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${c.raw}%`}}},
      scales:{x:{grid:{display:false},ticks:{color:'#888780',font:{size:10}}},y:{grid:{color:'rgba(136,135,128,0.12)'},ticks:{color:'#888780',font:{size:10},callback:v=>v+'%'},min:0,max:130}}}
  });
}

function renderOps() {
  const opsEl = document.getElementById('view-ops');
  if (!opsEl.querySelector('table')) {
    opsEl.innerHTML = `
      <div class="filter-bar">
        <input type="text" id="ops-search" placeholder="搜尋標題…" style="width:140px" oninput="renderOps()">
        <select id="ops-status" onchange="renderOps()"><option value="">全部狀態</option><option>審稿/校稿</option><option>翻譯中</option><option>待上架</option><option>已上架</option></select>
        <select id="ops-q" onchange="renderOps()"><option value="">全部季度</option><option>Q1</option><option>Q2</option><option>Q3</option><option>Q4</option></select>
        <button class="btn-sm" onclick="exportCSV()">匯出 CSV</button>
        <button class="btn-sm btn-blue" onclick="openModal(null)">+ 新增文章</button>
      </div>
      <div class="tbl-wrap">
        <table>
          <thead><tr>
            <th style="width:6%">年份</th><th style="width:25%">標題</th><th style="width:11%">狀態</th>
            <th style="width:6%">季度</th><th style="width:12%">中文上架日</th><th style="width:12%">英文上架日</th>
            <th style="width:8%;text-align:center">中文</th><th style="width:8%;text-align:center">英文</th><th style="width:6%"></th>
          </tr></thead>
          <tbody id="ops-tbody"></tbody>
        </table>
      </div>`;
    const mY = document.getElementById('m-year');
    if (mY) mY.innerHTML = config.years.map(y=>`<option${y===currentYear?' selected':''}>${y}</option>`).join('');
  }
  const q  = (document.getElementById('ops-search')||{}).value||'';
  const st = (document.getElementById('ops-status')||{}).value||'';
  const qt = (document.getElementById('ops-q')||{}).value||'';
  const smap = {'審稿/校稿':'s0','翻譯中':'s1','待上架':'s2','已上架':'s3'};
  const f = articles.filter(a => {
    if (a.year!==currentYear) return false;
    if (q && !a.title.toLowerCase().includes(q.toLowerCase())) return false;
    if (st && a.status!==st) return false;
    if (qt && a.q!==qt) return false;
    return true;
  });
  document.getElementById('ops-tbody').innerHTML = f.map(a=>`
    <tr>
      <td style="color:#888780">${a.year}</td>
      <td title="${a.title}">${a.title}</td>
      <td><span class="sbadge ${smap[a.status]||''}">${a.status}</span></td>
      <td style="color:#888780">${a.q}</td>
      <td style="color:#888780">${a.dateZh||'—'}</td>
      <td style="color:#888780">${a.dateEn||'—'}</td>
      <td style="text-align:center">${a.liveZh?'<span style="color:#0F6E56;font-weight:500">✓</span>':'<span style="color:#d3d1c7">—</span>'}</td>
      <td style="text-align:center">${a.liveEn?'<span style="color:#0F6E56;font-weight:500">✓</span>':'<span style="color:#d3d1c7">—</span>'}</td>
      <td><button style="font-size:11px;padding:2px 8px;border-radius:6px;cursor:pointer;border:1px solid #d3d1c7;background:#fff;color:#888780" onclick="openModal(${a.id})">編輯</button></td>
    </tr>`).join('');
}

function renderQA() {
  const yearData = summary.data?.[currentYear];
  const updated  = summary.updated || '尚未同步';
  if (!yearData) {
    document.getElementById('view-qa').innerHTML = `<div class="qa-wrap"><div class="qa-title">AI 數據摘要</div><div style="font-size:12px;color:#b4b2a9;padding:24px 0;text-align:center">尚未產生 ${currentYear} 年度摘要，請執行 sync.py 後重新整理頁面。</div></div>`;
    return;
  }
  const highlights = yearData.highlights||[];
  const qaPairs    = yearData.qa_pairs||[];
  const stats      = yearData.stats||{};
  const hlHtml     = highlights.length>0 ? highlights.map(h=>`<div style="display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:0.5px solid #f1efe8"><div style="width:6px;height:6px;border-radius:50%;background:#185FA5;flex-shrink:0;margin-top:5px"></div><div style="font-size:13px;color:#1a1a1a;line-height:1.6">${h}</div></div>`).join('') : '<div style="font-size:12px;color:#b4b2a9;padding:12px 0">摘要產生中</div>';
  const qaHtml     = qaPairs.length>0 ? qaPairs.map((p,i)=>`<div style="border:1px solid #e8e8e4;border-radius:8px;overflow:hidden;margin-bottom:8px"><div style="background:#f5f5f3;padding:8px 12px;font-size:12px;font-weight:500;color:#1a1a1a;cursor:pointer" onclick="toggleQA(${i})"><span style="color:#185FA5;margin-right:6px">Q</span>${p.q}</div><div id="qa-ans-${i}" style="display:none;padding:10px 12px;font-size:12px;color:#1a1a1a;line-height:1.6;border-top:1px solid #f1efe8"><span style="color:#1D9E75;font-weight:500;margin-right:6px">A</span>${p.a}</div></div>`).join('') : '<div style="font-size:12px;color:#b4b2a9;padding:12px 0">問答產生中</div>';
  const od = (stats.overdue||[]).slice(0,5);
  const sk = (stats.stuck||[]).slice(0,5);
  document.getElementById('view-qa').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
      <div class="qa-wrap">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><div class="qa-title">${currentYear} 年度重點摘要</div><div style="font-size:10px;color:#b4b2a9">更新於 ${updated}</div></div>
        ${hlHtml}
      </div>
      <div class="qa-wrap">
        <div class="qa-title" style="margin-bottom:14px">需注意項目</div>
        ${od.length>0?`<div style="font-size:11px;font-weight:500;color:#A32D2D;margin-bottom:6px">逾期未上架（${stats.overdue?.length||0} 篇）</div>${od.map(t=>`<div style="font-size:11px;padding:4px 0;border-bottom:0.5px solid #f1efe8">${t}</div>`).join('')}`:'<div style="font-size:12px;color:#b4b2a9;margin-bottom:12px">無逾期文章</div>'}
        ${sk.length>0?`<div style="font-size:11px;font-weight:500;color:#854F0B;margin-top:12px;margin-bottom:6px">翻譯卡關（${stats.stuck?.length||0} 篇）</div>${sk.map(t=>`<div style="font-size:11px;padding:4px 0;border-bottom:0.5px solid #f1efe8">${t}</div>`).join('')}`:'<div style="font-size:12px;color:#b4b2a9;margin-top:12px">無翻譯卡關</div>'}
      </div>
    </div>
    <div class="qa-wrap"><div class="qa-title" style="margin-bottom:4px">常見問答</div><div style="font-size:11px;color:#888780;margin-bottom:14px">點選問題展開答案 · AI 根據最新數據自動產生</div>${qaHtml}</div>`;
}

function toggleQA(i) {
  const el = document.getElementById(`qa-ans-${i}`);
  if (el) el.style.display = el.style.display==='none'?'block':'none';
}

function renderSearch() {
  const el = document.getElementById('view-search');
  if (el.querySelector('.search-hero')) { refreshSearchResults(); return; }
  const presetQA = (contentSummary.qa_pairs||[]);
  el.innerHTML = `
    <div class="search-hero" style="background:#fff;border:1px solid #e8e8e4;border-radius:12px;padding:1.25rem;margin-bottom:1rem">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><div style="font-size:14px;font-weight:500">AI 自然語言查詢</div><span style="font-size:11px;padding:3px 10px;border-radius:12px;background:#f1efe8;color:#888780">全資料庫 · 不受年份篩選影響</span></div>
      <div style="font-size:11px;color:#888780;margin-bottom:12px">直接用說話的方式問問題，AI 自動比對 ${contentArticles.length} 篇文章回答</div>
      ${presetQA.length>0?`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">${presetQA.slice(0,6).map(p=>`<button onclick="askContentAI(this)" data-q="${p.q.replace(/"/g,'&quot;')}" style="font-size:11px;padding:4px 10px;border-radius:14px;border:1px solid #d3d1c7;background:#fff;color:#888780;cursor:pointer">${p.q}</button>`).join('')}</div>`:''}
      <div style="display:flex;gap:8px">
        <input id="search-ai-q" style="flex:1;font-size:13px;padding:10px 14px;border-radius:8px;border:1px solid #d3d1c7;background:#fff;color:#1a1a1a;outline:none" placeholder="例如：台北有伴手禮的文章有哪些？" onkeydown="if(event.key==='Enter')runContentAI()">
        <button id="search-ai-btn" onclick="runContentAI()" style="font-size:12px;padding:10px 18px;border-radius:8px;border:1px solid #B5D4F4;background:#E6F1FB;color:#185FA5;cursor:pointer;font-weight:500;white-space:nowrap">AI 查詢</button>
      </div>
      <div id="search-ai-result" style="display:none;margin-top:12px;padding:12px 14px;background:#f5f5f3;border-radius:8px;font-size:12px;color:#1a1a1a;line-height:1.7"></div>
    </div>
    <div style="background:#fff;border:1px solid #e8e8e4;border-radius:12px;padding:1.25rem;margin-bottom:1rem">
      <div style="font-size:13px;font-weight:500;margin-bottom:12px">條件篩選</div>
      <div style="margin-bottom:12px"><div style="font-size:11px;font-weight:500;color:#888780;margin-bottom:7px">主題探索</div><div style="display:flex;flex-wrap:wrap;gap:6px">${THEMES.map(t=>`<button class="fchip" data-group="theme" data-val="${t}" onclick="toggleFChip(this)">${t}</button>`).join('')}</div></div>
      <div style="margin-bottom:12px"><div style="font-size:11px;font-weight:500;color:#888780;margin-bottom:7px">地方探索</div><div style="display:flex;flex-wrap:wrap;gap:6px">${REGIONS.map(r=>`<button class="fchip" data-group="region" data-val="${r}" onclick="toggleFChip(this)">${r}</button>`).join('')}</div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:12px">
        <div><div style="font-size:11px;font-weight:500;color:#888780;margin-bottom:7px">時令探索</div><div style="display:flex;flex-wrap:wrap;gap:6px">${SEASONS.map(s=>`<button class="fchip" data-group="season" data-val="${s}" onclick="toggleFChip(this)">${s}</button>`).join('')}</div></div>
        <div><div style="font-size:11px;font-weight:500;color:#888780;margin-bottom:7px">包含內容</div><div style="display:flex;flex-wrap:wrap;gap:6px">${HAS_OPTS.map(h=>`<button class="fchip" data-group="has" data-val="${h}" onclick="toggleFChip(this)">${h}</button>`).join('')}</div></div>
      </div>
      <div><div style="font-size:11px;font-weight:500;color:#888780;margin-bottom:7px">關鍵字搜尋</div><input id="f-kw" style="width:100%;font-size:12px;padding:6px 10px;border-radius:8px;border:1px solid #d3d1c7;background:#fff;color:#1a1a1a;outline:none" placeholder="例如：台北、九份" oninput="refreshSearchResults()"></div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div style="font-size:12px;color:#888780" id="s-count">共 <strong style="color:#1a1a1a">0</strong> 篇</div>
      <button onclick="clearSearch()" style="font-size:11px;padding:3px 10px;border-radius:8px;border:1px solid #d3d1c7;background:#fff;color:#888780;cursor:pointer">清除篩選</button>
    </div>
    <div id="s-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px"></div>`;
  injectFChipStyle();
  refreshSearchResults();
}

function injectFChipStyle() {
  if (document.getElementById('fchip-style')) return;
  const s = document.createElement('style');
  s.id = 'fchip-style';
  s.textContent = `.fchip{font-size:11px;padding:4px 10px;border-radius:14px;border:1px solid #d3d1c7;cursor:pointer;color:#888780;background:#fff}.fchip:hover{background:#f1efe8;color:#1a1a1a}.fchip.on{background:#185FA5;border-color:#185FA5;color:#fff}.fchip[data-group="season"].on{background:#3B6D11;border-color:#3B6D11}.fchip[data-group="has"].on{background:#0F6E56;border-color:#0F6E56}.fchip[data-group="theme"].on{background:#534AB7;border-color:#534AB7}`;
  document.head.appendChild(s);
}

function toggleFChip(btn) {
  const map = {theme:activeThemes, region:activeRegions, season:activeSeasons, has:activeHas};
  const set = map[btn.dataset.group];
  if (set.has(btn.dataset.val)) { set.delete(btn.dataset.val); btn.classList.remove('on'); }
  else { set.add(btn.dataset.val); btn.classList.add('on'); }
  refreshSearchResults();
}

function filterContent() {
  const kl = ((document.getElementById('f-kw')||{}).value||'').toLowerCase().trim();
  return contentArticles.filter(a => {
    if (activeThemes.size  && ![...activeThemes].some(t  => a.theme.includes(t)))   return false;
    if (activeRegions.size && ![...activeRegions].some(r => a.region.includes(r)))  return false;
    if (activeSeasons.size && ![...activeSeasons].some(s => a.season.includes(s)))  return false;
    for (const h of activeHas) {
      if (h==='店家'  && !a.hasStore)  return false;
      if (h==='小吃'  && !a.hasSnack)  return false;
      if (h==='伴手禮'&& !a.hasGift)   return false;
      if (h==='景點'  && !a.hasSight)  return false;
      if (h==='活動'  && !a.hasEvent)  return false;
    }
    if (kl) {
      const blob = [a.title,a.city,a.area,a.storeKw,a.snackKw,a.giftKw,a.sightKw,a.eventKw].join(' ').toLowerCase();
      if (!blob.includes(kl)) return false;
    }
    return true;
  });
}

function makeCard(a) {
  const tags = [...a.theme.map(t=>`<span style="font-size:10px;padding:2px 7px;border-radius:8px;font-weight:500;background:#EEEDFE;color:#3C3489">${t}</span>`),...a.region.map(r=>`<span style="font-size:10px;padding:2px 7px;border-radius:8px;font-weight:500;background:#E6F1FB;color:#185FA5">${r}</span>`),...a.season.map(s=>`<span style="font-size:10px;padding:2px 7px;border-radius:8px;font-weight:500;background:#EAF3DE;color:#3B6D11">${s}</span>`),`<span style="font-size:10px;padding:2px 7px;border-radius:8px;font-weight:500;background:#F1EFE8;color:#5F5E5A">${a.city}${a.area?'・'+a.area:''}</span>`].join('');
  const badges = [{has:a.hasStore,label:'店家'},{has:a.hasSnack,label:'小吃'},{has:a.hasGift,label:'伴手禮'},{has:a.hasSight,label:'景點'},{has:a.hasEvent,label:'活動'}].map(b=>`<span style="font-size:10px;padding:2px 7px;border-radius:6px;${b.has?'background:#EAF3DE;color:#3B6D11':'background:#f1efe8;color:#b4b2a9'}">${b.has?'✓':''} ${b.label}</span>`).join('');
  const kwList = [a.storeKw,a.snackKw,a.giftKw,a.sightKw,a.eventKw].filter(Boolean).join('、');
  const yearTag = a.year ? `<span style="font-size:10px;padding:2px 7px;border-radius:8px;font-weight:500;background:#FAEEDA;color:#854F0B">${a.year}</span>` : '';
  return `<div style="background:#fff;border:1px solid #e8e8e4;border-radius:12px;padding:1rem"><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;gap:8px"><div style="font-size:13px;font-weight:500;color:#1a1a1a;line-height:1.4;flex:1">${a.title}</div>${yearTag}</div><div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">${tags}</div><div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px">${badges}</div>${kwList?`<div style="font-size:10px;color:#b4b2a9;line-height:1.6">${kwList}</div>`:''}</div>`;
}

function refreshSearchResults() {
  const INIT_COUNT = 8;
  const results = filterContent();
  const cnt = document.getElementById('s-count');
  if (cnt) cnt.innerHTML = `共 <strong style="color:#1a1a1a">${results.length}</strong> 篇`;
  const grid = document.getElementById('s-grid');
  if (!grid) return;
  if (results.length===0) { grid.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:40px 0;color:#b4b2a9;font-size:13px">沒有符合條件的文章</div>'; return; }
  const visible  = results.slice(0, INIT_COUNT);
  const hidden   = results.slice(INIT_COUNT);
  const hiddenId = 'search-hidden-grid';

  let hiddenHtml = '';
  if (hidden.length > 0) {
    hiddenHtml = `
      <div style="grid-column:1/-1;margin-top:0">
        <div id="${hiddenId}" style="display:none">
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;margin-bottom:12px">
            ${hidden.map(a=>makeCard(a)).join('')}
          </div>
        </div>
        <button id="search-expand-btn" onclick="toggleSearchExpand()"
          style="width:100%;padding:10px;border-radius:8px;border:1px solid #d3d1c7;background:#fff;color:#888780;font-size:12px;cursor:pointer">
          顯示更多 ${hidden.length} 篇結果
        </button>
      </div>`;
  }

  grid.innerHTML = visible.map(a => makeCard(a)).join('') + hiddenHtml;

  window._searchExpanded = false;
  window.toggleSearchExpand = function() {
    const hiddenGrid = document.getElementById(hiddenId);
    const btn        = document.getElementById('search-expand-btn');
    if (!hiddenGrid || !btn) return;
    window._searchExpanded = !window._searchExpanded;
    hiddenGrid.style.display = window._searchExpanded ? 'block' : 'none';
    btn.textContent = window._searchExpanded
      ? '收合結果'
      : `顯示更多 ${hidden.length} 篇結果`;
    btn.style.color        = window._searchExpanded ? '#185FA5' : '#888780';
    btn.style.borderColor  = window._searchExpanded ? '#B5D4F4' : '#d3d1c7';
  };
}

function clearSearch() {
  activeThemes.clear(); activeRegions.clear(); activeSeasons.clear(); activeHas.clear();
  document.querySelectorAll('.fchip.on').forEach(b=>b.classList.remove('on'));
  const kw=document.getElementById('f-kw'); if(kw) kw.value='';
  const aiQ=document.getElementById('search-ai-q'); if(aiQ) aiQ.value='';
  const aiR=document.getElementById('search-ai-result'); if(aiR) aiR.style.display='none';
  refreshSearchResults();
}

function askContentAI(btn) {
  const input = document.getElementById('search-ai-q');
  if (input) input.value = btn.dataset.q;
  runContentAI();
}

async function runContentAI() {
  const input=document.getElementById('search-ai-q'), btn=document.getElementById('search-ai-btn'), res=document.getElementById('search-ai-result');
  if (!input||!btn||!res) return;
  const q = input.value.trim();
  if (!q) return;
  if (AI_CACHE.has(q)) { res.style.display='block'; res.innerHTML=AI_CACHE.get(q); return; }
  btn.disabled=true; res.style.display='block'; res.textContent='AI 比對資料庫中…';
  const GEMINI_KEY = window.__GEMINI_KEY__ || localStorage.getItem('gemini_key') || '';
  if (!GEMINI_KEY) { res.textContent='尚未設定 Gemini API Key，請點右上角齒輪圖示設定'; btn.disabled=false; return; }
  const context = contentArticles.map(a=>`- 《${a.title}》｜${a.city}${a.area}｜主題:${a.theme.join('+')}｜地方:${a.region.join('+')}｜時令:${a.season.join('+')}｜`+(a.hasStore?`店家(${a.storeKw}) `:'')+( a.hasSnack?`小吃(${a.snackKw}) `:'')+( a.hasGift?`伴手禮(${a.giftKw}) `:'')+( a.hasSight?`景點(${a.sightKw}) `:'')+( a.hasEvent?`活動(${a.eventKw}) `:'')).join('\n');
  const MODELS=['gemini-2.0-flash','gemini-2.5-flash','gemini-2.0-flash-lite','gemini-2.5-flash-lite'];
  const prompt=`你是內容資料庫助理。根據以下 ${contentArticles.length} 篇文章清單，用繁體中文精確回答問題。列出相關文章時請顯示標題與關鍵資訊，格式清晰，若無符合文章請直接說明。\n\n【文章資料庫】\n${context}\n\n【問題】${q}`;
  let answered=false;
  for (const model of MODELS) {
    try {
      const url=`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
      const resp=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}]})});
      const data=await resp.json();
      if (data.error) { console.warn(model,data.error.code); continue; }
      const answer=data.candidates?.[0]?.content?.parts?.[0]?.text||'無法取得回答';
      const formatted=answer.replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>');
      res.innerHTML=formatted;
      if (AI_CACHE.size>=AI_CACHE_LIMIT) AI_CACHE.delete(AI_CACHE.keys().next().value);
      AI_CACHE.set(q,formatted);
      answered=true; break;
    } catch(e) { console.warn(model,e.message); }
  }
  if (!answered) res.textContent='所有模型今日額度已滿，請明天再試。';
  btn.disabled=false;
}

function switchTab(t, el) {
  document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('view-'+t).classList.add('active');
  currentTab=t;
  if      (t==='exec')   renderExec();
  else if (t==='mgr')    renderMgr();
  else if (t==='ops')    renderOps();
  else if (t==='qa')     renderQA();
  else if (t==='search') renderSearch();
}

function openModal(id) {
  editingId=id;
  const m=id?articles.find(a=>a.id===id):null;
  document.getElementById('modal-title').textContent=id?'編輯文章':'新增文章';
  const mY=document.getElementById('m-year');
  if (mY) mY.innerHTML=config.years.map(y=>`<option${(m?m.year:currentYear)===y?' selected':''}>${y}</option>`).join('');
  document.getElementById('m-title').value    =m?m.title :'';
  document.getElementById('m-status').value   =m?m.status:'審稿/校稿';
  document.getElementById('m-q').value        =m?m.q     :'Q1';
  document.getElementById('m-date-zh').value  =m?m.dateZh:'';
  document.getElementById('m-date-en').value  =m?m.dateEn:'';
  document.getElementById('m-live-zh').checked=m?m.liveZh:false;
  document.getElementById('m-live-en').checked=m?m.liveEn:false;
  document.getElementById('ops-modal').classList.add('open');
}
function closeModal() { document.getElementById('ops-modal').classList.remove('open'); }
function saveArticle() {
  const title=document.getElementById('m-title').value.trim();
  if (!title) return;
  const data={year:document.getElementById('m-year').value,title,status:document.getElementById('m-status').value,q:document.getElementById('m-q').value,dateZh:document.getElementById('m-date-zh').value,dateEn:document.getElementById('m-date-en').value,liveZh:document.getElementById('m-live-zh').checked,liveEn:document.getElementById('m-live-en').checked};
  if (editingId) { const i=articles.findIndex(a=>a.id===editingId); articles[i]={...articles[i],...data}; }
  else articles.push({id:Date.now(),...data});
  closeModal(); renderOps(); buildYearTabs();
}
function exportCSV() {
  const rows=[['年份','標題','狀態','季度','中文上架日','英文上架日','中文已上架','英文已上架']];
  articles.filter(a=>a.year===currentYear).forEach(a=>rows.push([a.year,a.title,a.status,a.q,a.dateZh,a.dateEn,a.liveZh?'是':'否',a.liveEn?'是':'否']));
  const csv=rows.map(r=>r.map(c=>`"${c}"`).join(',')).join('\n');
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`articles_${currentYear}.csv`; a.click();
}
