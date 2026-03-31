const QS = ['Q1','Q2','Q3','Q4'];
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

let articles = [];
let config   = {};
let summary  = {};
let contentArticles    = [];
let contentSummary     = {};
let activeThemes       = new Set();
let activeRegions      = new Set();
let activeSeasons      = new Set();
let activeHas          = new Set();
let currentYear = '';
let currentTab  = 'exec';
let execChart   = null;
let mgrChart    = null;
let editingId   = null;

const THEMES   = ['文化美食','自然生態','常民生活','藝術文化'];
const REGIONS  = ['北部','中部','南部','東部','離島'];
const SEASONS  = ['春','夏','秋','冬'];
const HAS_OPTS = ['店家','小吃','伴手禮','景點','活動'];

document.getElementById('date-label').textContent =
  '截至 ' + new Date().toLocaleDateString('zh-TW', {year:'numeric',month:'long',day:'numeric'});

Promise.all([
  fetch('data.json').then(r => r.json()),
  fetch('config.json').then(r => r.json()),
  fetch('summary.json').then(r => r.json()).catch(() => null),
  fetch('content.json').then(r => r.json()).catch(() => []),
  fetch('content_summary.json').then(r => r.json()).catch(() => null),
]).then(([data, cfg, sum, content, contentSum]) => {
  articles        = data;
  config          = cfg;
  summary         = sum || {};
  contentArticles = content || [];
  contentSummary  = contentSum || {};
  currentYear     = cfg.years[cfg.years.length - 1];
  init();
}).catch(err => {
  document.getElementById('app').innerHTML =
    `<div class="error-screen">資料載入失敗：${err.message}<br>請確認 data.json 與 config.json 存在且格式正確。</div>`;
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

function filtered() {
  return articles.filter(a => a.year === currentYear);
}

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
  if      (currentTab==='exec') renderExec();
  else if (currentTab==='mgr')  renderMgr();
  else if (currentTab==='ops')  renderOps();
  else if (currentTab==='qa')   renderQA();
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
  const arts  = filtered();
  const stats = getStats(arts);
  const kpi   = config.kpi[currentYear];
  const today = new Date(); today.setHours(0,0,0,0);
  const totalLZh = Object.values(stats.lzQ).reduce((a,b)=>a+b,0);
  const totalLEn = Object.values(stats.leQ).reduce((a,b)=>a+b,0);
  const totalTZh = Object.values(kpi.zh).reduce((a,b)=>a+b,0);
  const totalTEn = Object.values(kpi.en).reduce((a,b)=>a+b,0);
  const zhR = arts.filter(a=>a.status==='審稿/校稿').length;
  const zhP = arts.filter(a=>a.status==='待上架').length;
  const enT = arts.filter(a=>a.status==='翻譯中').length;
  const enP = arts.filter(a=>a.status==='待上架'&&a.dateEn).length;
  const overdue = arts.filter(a=>!a.liveZh&&a.dateZh&&new Date(a.dateZh)<today).length;
  const stuck   = arts.filter(a=>a.status==='翻譯中'&&a.dateZh&&(today-new Date(a.dateZh))/86400000>7).length;
  const maxV = Math.max(zhR,zhP,totalLZh,enT,enP,totalLEn,1);

  function bar(n,cls,label) {
    const w = Math.round(n/maxV*100);
    return `<div class="dual-bar-row">
      <div class="dual-bar-label">${label}</div>
      <div class="dual-bar-track"><div class="dual-bar-fill ${cls}" style="width:${w}%">${n>0?n+' 篇':''}</div></div>
      <div class="dual-bar-num">${n}</div>
    </div>`;
  }

  const alerts =
    (overdue>0?`<div class="alert-strip danger"><div><div class="a-title">逾期未上架</div><div class="a-detail">超過預計上架日</div></div><div class="a-count">${overdue} 篇</div></div>`:'')+
    (stuck>0?`<div class="alert-strip warn"><div><div class="a-title">翻譯卡關</div><div class="a-detail">翻譯中超過 7 天</div></div><div class="a-count">${stuck} 篇</div></div>`:'');

  document.getElementById('view-mgr').innerHTML = `
    <div class="pipeline-wrap">
      <div style="font-size:14px;font-weight:500;margin-bottom:2px">中英文章流程進度對比</div>
      <div style="font-size:11px;color:#888780;margin-bottom:14px">${currentYear} 年度 · 中文主線（上）與英文並行支線（下）</div>
      <div style="font-size:11px;font-weight:500;color:#185FA5;margin-bottom:8px">中文主線</div>
      ${bar(zhR,'rv-c','審稿/校稿')}${bar(zhP,'pd-c','待上架')}${bar(totalLZh,'zh-c','已上架(中)')}
      <div class="pipe-divider"><div class="pipe-divider-line"></div><div class="pipe-divider-label">英文並行支線</div><div class="pipe-divider-line"></div></div>
      <div style="font-size:11px;font-weight:500;color:#1D9E75;margin-bottom:8px">英文支線</div>
      ${bar(enT,'tr-c','翻譯中')}${bar(enP,'pd-c','待上架(英)')}${bar(totalLEn,'en-c','已上架(英)')}
      <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:11px;color:#888780;margin-top:12px;padding-top:10px;border-top:1px solid #e8e8e4">
        <span><span class="ld" style="background:#7F77DD"></span>審稿</span>
        <span><span class="ld" style="background:#534AB7"></span>翻譯中</span>
        <span><span class="ld" style="background:#EF9F27"></span>待上架</span>
        <span><span class="ld" style="background:#185FA5"></span>已上架(中)</span>
        <span><span class="ld" style="background:#1D9E75"></span>已上架(英)</span>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
      <div class="kpi-block" style="display:flex;flex-direction:column;gap:10px">
        <div style="font-size:13px;font-weight:500">上架成果與警示</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div style="background:#f5f5f3;border-radius:8px;padding:.875rem;text-align:center">
            <div style="font-size:10px;color:#888780;margin-bottom:4px">中文已上架</div>
            <div style="font-size:26px;font-weight:500;color:#185FA5">${totalLZh}</div>
            <div style="font-size:10px;color:#b4b2a9">目標 ${totalTZh} 篇</div>
          </div>
          <div style="background:#f5f5f3;border-radius:8px;padding:.875rem;text-align:center">
            <div style="font-size:10px;color:#888780;margin-bottom:4px">英文已上架</div>
            <div style="font-size:26px;font-weight:500;color:#1D9E75">${totalLEn}</div>
            <div style="font-size:10px;color:#b4b2a9">目標 ${totalTEn} 篇</div>
          </div>
        </div>
        ${alerts||'<div style="font-size:12px;color:#b4b2a9;text-align:center;padding:8px 0">目前無異常警示</div>'}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
        <div class="kpi-block" id="mgr-kpi-zh"></div>
        <div class="kpi-block" id="mgr-kpi-en"></div>
      </div>
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
      {label:'中文上架',   data:QS.map(q=>stats.lzQ[q]||0), backgroundColor:'#185FA5'},
      {label:'英文上架',   data:QS.map(q=>stats.leQ[q]||0), backgroundColor:'#1D9E75'},
      {label:'翻譯/待上架',data:QS.map(q=>arts.filter(a=>a.q===q&&(a.status==='翻譯中'||a.status==='待上架')).length), backgroundColor:'#EF9F27'},
      {label:'審稿中',     data:QS.map(q=>arts.filter(a=>a.q===q&&a.status==='審稿/校稿').length), backgroundColor:'#7F77DD'},
    ]},
    options:{responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}, tooltip:{mode:'index',intersect:false}},
      scales:{
        x:{stacked:true, grid:{display:false}, ticks:{color:'#888780',font:{size:11}}},
        y:{stacked:true, grid:{color:'rgba(136,135,128,0.12)'}, ticks:{color:'#888780',font:{size:11},stepSize:5}}
      }}
  });
}

function renderOps() {
  const opsEl = document.getElementById('view-ops');
  if (!opsEl.querySelector('table')) {
    opsEl.innerHTML = `
      <div class="filter-bar">
        <input type="text" id="ops-search" placeholder="搜尋標題…" style="width:140px" oninput="renderOps()">
        <select id="ops-status" onchange="renderOps()">
          <option value="">全部狀態</option>
          <option>審稿/校稿</option><option>翻譯中</option><option>待上架</option><option>已上架</option>
        </select>
        <select id="ops-q" onchange="renderOps()">
          <option value="">全部季度</option>
          <option>Q1</option><option>Q2</option><option>Q3</option><option>Q4</option>
        </select>
        <button class="btn-sm" onclick="exportCSV()">匯出 CSV</button>
        <button class="btn-sm btn-blue" onclick="openModal(null)">+ 新增文章</button>
      </div>
      <div class="tbl-wrap">
        <table>
          <thead><tr>
            <th style="width:6%">年份</th><th style="width:25%">標題</th>
            <th style="width:11%">狀態</th><th style="width:6%">季度</th>
            <th style="width:12%">中文上架日</th><th style="width:12%">英文上架日</th>
            <th style="width:8%;text-align:center">中文</th>
            <th style="width:8%;text-align:center">英文</th>
            <th style="width:6%"></th>
          </tr></thead>
          <tbody id="ops-tbody"></tbody>
        </table>
      </div>`;
    const mYearSel = document.getElementById('m-year');
    if (mYearSel) {
      mYearSel.innerHTML = config.years.map(y =>
        `<option${y===currentYear?' selected':''}>${y}</option>`
      ).join('');
    }
  }
  const q  = (document.getElementById('ops-search')||{}).value||'';
  const st = (document.getElementById('ops-status')||{}).value||'';
  const qt = (document.getElementById('ops-q')||{}).value||'';
  const smap = {'審稿/校稿':'s0','翻譯中':'s1','待上架':'s2','已上架':'s3'};
  const f = articles.filter(a => {
    if (a.year !== currentYear) return false;
    if (q  && !a.title.toLowerCase().includes(q.toLowerCase())) return false;
    if (st && a.status !== st) return false;
    if (qt && a.q !== qt) return false;
    return true;
  });
  document.getElementById('ops-tbody').innerHTML = f.map(a => `
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
    document.getElementById('view-qa').innerHTML = `
      <div class="qa-wrap">
        <div class="qa-title">AI 數據摘要</div>
        <div style="font-size:12px;color:#b4b2a9;padding:24px 0;text-align:center">
          尚未產生 ${currentYear} 年度摘要，請執行一次 sync.py 後重新整理頁面。
        </div>
      </div>`;
    return;
  }

  const highlights = yearData.highlights || [];
  const qaPairs    = yearData.qa_pairs   || [];
  const stats      = yearData.stats      || {};

  const highlightHtml = highlights.length > 0
    ? highlights.map(h => `
        <div style="display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:0.5px solid #f1efe8">
          <div style="width:6px;height:6px;border-radius:50%;background:#185FA5;flex-shrink:0;margin-top:5px"></div>
          <div style="font-size:13px;color:#1a1a1a;line-height:1.6">${h}</div>
        </div>`).join('')
    : '<div style="font-size:12px;color:#b4b2a9;padding:12px 0">摘要產生中，請稍後再試</div>';

  const qaHtml = qaPairs.length > 0
    ? qaPairs.map((pair,i) => `
        <div style="border:1px solid #e8e8e4;border-radius:8px;overflow:hidden;margin-bottom:8px">
          <div style="background:#f5f5f3;padding:8px 12px;font-size:12px;font-weight:500;color:#1a1a1a;cursor:pointer"
               onclick="toggleQA(${i})">
            <span style="color:#185FA5;margin-right:6px">Q</span>${pair.q}
          </div>
          <div id="qa-ans-${i}" style="display:none;padding:10px 12px;font-size:12px;color:#1a1a1a;line-height:1.6;border-top:1px solid #f1efe8">
            <span style="color:#1D9E75;font-weight:500;margin-right:6px">A</span>${pair.a}
          </div>
        </div>`).join('')
    : '<div style="font-size:12px;color:#b4b2a9;padding:12px 0">問答產生中，請稍後再試</div>';

  const overdueList = (stats.overdue||[]).slice(0,5);
  const stuckList   = (stats.stuck||[]).slice(0,5);

  document.getElementById('view-qa').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
      <div class="qa-wrap">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <div class="qa-title">${currentYear} 年度重點摘要</div>
          <div style="font-size:10px;color:#b4b2a9">更新於 ${updated}</div>
        </div>
        ${highlightHtml}
      </div>
      <div class="qa-wrap">
        <div class="qa-title" style="margin-bottom:14px">需注意項目</div>
        ${overdueList.length>0?`
          <div style="font-size:11px;font-weight:500;color:#A32D2D;margin-bottom:6px">逾期未上架（${stats.overdue?.length||0} 篇）</div>
          ${overdueList.map(t=>`<div style="font-size:11px;color:#1a1a1a;padding:4px 0;border-bottom:0.5px solid #f1efe8">${t}</div>`).join('')}
        `:'<div style="font-size:12px;color:#b4b2a9;margin-bottom:12px">無逾期文章</div>'}
        ${stuckList.length>0?`
          <div style="font-size:11px;font-weight:500;color:#854F0B;margin-top:12px;margin-bottom:6px">翻譯卡關（${stats.stuck?.length||0} 篇）</div>
          ${stuckList.map(t=>`<div style="font-size:11px;color:#1a1a1a;padding:4px 0;border-bottom:0.5px solid #f1efe8">${t}</div>`).join('')}
        `:'<div style="font-size:12px;color:#b4b2a9;margin-top:12px">無翻譯卡關</div>'}
      </div>
    </div>
    <div class="qa-wrap">
      <div class="qa-title" style="margin-bottom:4px">常見問答</div>
      <div style="font-size:11px;color:#888780;margin-bottom:14px">點選問題展開答案 · 由 AI 根據最新數據自動產生</div>
      ${qaHtml}
    </div>`;
}

function toggleQA(i) {
  const el = document.getElementById(`qa-ans-${i}`);
  if (el) el.style.display = el.style.display==='none' ? 'block' : 'none';
}

function switchTab(t, el) {
  document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('view-'+t).classList.add('active');
  currentTab = t;
  if      (t==='exec')   renderExec();
  else if (t==='mgr')    renderMgr();
  else if (t==='ops')    renderOps();
  else if (t==='qa')     renderQA();
  else if (t==='search') renderSearch();
}

function openModal(id) {
  editingId = id;
  const m = id ? articles.find(a=>a.id===id) : null;
  document.getElementById('modal-title').textContent = id ? '編輯文章' : '新增文章';
  const mYear = document.getElementById('m-year');
  if (mYear) mYear.innerHTML = config.years.map(y=>
    `<option${(m?m.year:currentYear)===y?' selected':''}>${y}</option>`
  ).join('');
  document.getElementById('m-title').value     = m ? m.title  : '';
  document.getElementById('m-status').value    = m ? m.status : '審稿/校稿';
  document.getElementById('m-q').value         = m ? m.q      : 'Q1';
  document.getElementById('m-date-zh').value   = m ? m.dateZh : '';
  document.getElementById('m-date-en').value   = m ? m.dateEn : '';
  document.getElementById('m-live-zh').checked = m ? m.liveZh : false;
  document.getElementById('m-live-en').checked = m ? m.liveEn : false;
  document.getElementById('ops-modal').classList.add('open');
}

function closeModal() {
  document.getElementById('ops-modal').classList.remove('open');
}

function saveArticle() {
  const title = document.getElementById('m-title').value.trim();
  if (!title) return;
  const data = {
    year:   document.getElementById('m-year').value,
    title,
    status: document.getElementById('m-status').value,
    q:      document.getElementById('m-q').value,
    dateZh: document.getElementById('m-date-zh').value,
    dateEn: document.getElementById('m-date-en').value,
    liveZh: document.getElementById('m-live-zh').checked,
    liveEn: document.getElementById('m-live-en').checked,
  };
  if (editingId) {
    const i = articles.findIndex(a=>a.id===editingId);
    articles[i] = {...articles[i], ...data};
  } else {
    articles.push({id: Date.now(), ...data});
  }
  closeModal();
  renderOps();
  buildYearTabs();
}

function exportCSV() {
  const rows = [['年份','標題','狀態','季度','中文上架日','英文上架日','中文已上架','英文已上架']];
  articles.filter(a=>a.year===currentYear).forEach(a =>
    rows.push([a.year,a.title,a.status,a.q,a.dateZh,a.dateEn,a.liveZh?'是':'否',a.liveEn?'是':'否'])
  );
  const csv  = rows.map(r=>r.map(c=>`"${c}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff'+csv], {type:'text/csv;charset=utf-8'});
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `articles_${currentYear}.csv`;
  a.click();
}

// ============================================================
//  文章查詢分頁
// ============================================================

function renderSearch() {
  const el = document.getElementById('view-search');
  if (el.querySelector('.search-hero')) {
    refreshSearchResults();
    return;
  }

  const presetQA = (contentSummary.qa_pairs || []);

  el.innerHTML = `
    <div class="search-hero" style="background:#fff;border:1px solid #e8e8e4;border-radius:12px;padding:1.25rem;margin-bottom:1rem">
      <div style="font-size:14px;font-weight:500;margin-bottom:4px">AI 自然語言查詢</div>
      <div style="font-size:11px;color:#888780;margin-bottom:12px">直接用說話的方式問問題，AI 自動比對 ${contentArticles.length} 篇文章回答</div>
      ${presetQA.length > 0 ? `
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
          ${presetQA.slice(0,6).map(p=>`
            <button onclick="askContentAI(this)" data-q="${p.q.replace(/"/g,'&quot;')}"
              style="font-size:11px;padding:4px 10px;border-radius:14px;border:1px solid #d3d1c7;background:#fff;color:#888780;cursor:pointer">${p.q}</button>
          `).join('')}
        </div>` : ''}
      <div style="display:flex;gap:8px;margin-bottom:0">
        <input id="search-ai-q" style="flex:1;font-size:13px;padding:10px 14px;border-radius:8px;border:1px solid #d3d1c7;background:#fff;color:#1a1a1a;outline:none"
          placeholder="例如：台北有伴手禮的文章有哪些？北部適合春天的自然生態文章？"
          onkeydown="if(event.key==='Enter')runContentAI()">
        <button id="search-ai-btn" onclick="runContentAI()"
          style="font-size:12px;padding:10px 18px;border-radius:8px;border:1px solid #B5D4F4;background:#E6F1FB;color:#185FA5;cursor:pointer;font-weight:500;white-space:nowrap">
          AI 查詢
        </button>
      </div>
      <div id="search-ai-result" style="display:none;margin-top:12px;padding:12px 14px;background:#f5f5f3;border-radius:8px;font-size:12px;color:#1a1a1a;line-height:1.7"></div>
    </div>

    <div style="background:#fff;border:1px solid #e8e8e4;border-radius:12px;padding:1.25rem;margin-bottom:1rem">
      <div style="font-size:13px;font-weight:500;margin-bottom:12px">條件篩選</div>
      <div style="margin-bottom:12px">
        <div style="font-size:11px;font-weight:500;color:#888780;margin-bottom:7px">主題探索</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px" id="f-theme">
          ${THEMES.map(t=>`<button class="fchip" data-group="theme" data-val="${t}" onclick="toggleFChip(this)">${t}</button>`).join('')}
        </div>
      </div>
      <div style="margin-bottom:12px">
        <div style="font-size:11px;font-weight:500;color:#888780;margin-bottom:7px">地方探索</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px" id="f-region">
          ${REGIONS.map(r=>`<button class="fchip" data-group="region" data-val="${r}" onclick="toggleFChip(this)">${r}</button>`).join('')}
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:12px">
        <div>
          <div style="font-size:11px;font-weight:500;color:#888780;margin-bottom:7px">時令探索</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px" id="f-season">
            ${SEASONS.map(s=>`<button class="fchip" data-group="season" data-val="${s}" onclick="toggleFChip(this)">${s}</button>`).join('')}
          </div>
        </div>
        <div>
          <div style="font-size:11px;font-weight:500;color:#888780;margin-bottom:7px">包含內容</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px" id="f-has">
            ${HAS_OPTS.map(h=>`<button class="fchip" data-group="has" data-val="${h}" onclick="toggleFChip(this)">${h}</button>`).join('')}
          </div>
        </div>
      </div>
      <div>
        <div style="font-size:11px;font-weight:500;color:#888780;margin-bottom:7px">關鍵字搜尋（標題、縣市、地區、店家、景點）</div>
        <input id="f-kw" style="width:100%;font-size:12px;padding:6px 10px;border-radius:8px;border:1px solid #d3d1c7;background:#fff;color:#1a1a1a;outline:none"
          placeholder="例如：台北、九份、高粱酒" oninput="refreshSearchResults()">
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div style="font-size:12px;color:#888780" id="s-count">共 <strong style="color:#1a1a1a">0</strong> 篇</div>
      <button onclick="clearSearch()" style="font-size:11px;padding:3px 10px;border-radius:8px;border:1px solid #d3d1c7;background:#fff;color:#888780;cursor:pointer">清除篩選</button>
    </div>
    <div id="s-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px"></div>
  `;

  injectFChipStyle();
  refreshSearchResults();
}

function injectFChipStyle() {
  if (document.getElementById('fchip-style')) return;
  const s = document.createElement('style');
  s.id = 'fchip-style';
  s.textContent = `
    .fchip{font-size:11px;padding:4px 10px;border-radius:14px;border:1px solid #d3d1c7;cursor:pointer;color:#888780;background:#fff;transition:all .15s}
    .fchip:hover{background:#f1efe8;color:#1a1a1a}
    .fchip.on{background:#185FA5;border-color:#185FA5;color:#fff}
    .fchip[data-group="season"].on{background:#3B6D11;border-color:#3B6D11}
    .fchip[data-group="has"].on{background:#0F6E56;border-color:#0F6E56}
    .fchip[data-group="theme"].on{background:#534AB7;border-color:#534AB7}
  `;
  document.head.appendChild(s);
}

function toggleFChip(btn) {
  const g   = btn.dataset.group;
  const val = btn.dataset.val;
  const map = {theme:activeThemes, region:activeRegions, season:activeSeasons, has:activeHas};
  const set = map[g];
  if (set.has(val)) { set.delete(val); btn.classList.remove('on'); }
  else              { set.add(val);    btn.classList.add('on'); }
  refreshSearchResults();
}

function filterContent() {
  const kw = (document.getElementById('f-kw')||{}).value||'';
  const kl = kw.toLowerCase().trim();
  return contentArticles.filter(a => {
    if (activeThemes.size  && ![...activeThemes].some(t  => a.theme.includes(t)))   return false;
    if (activeRegions.size && ![...activeRegions].some(r => a.region.includes(r)))  return false;
    if (activeSeasons.size && ![...activeSeasons].some(s => a.season.includes(s)))  return false;
    for (const h of activeHas) {
      if (h==='店家'   && !a.hasStore)  return false;
      if (h==='小吃'   && !a.hasSnack)  return false;
      if (h==='伴手禮' && !a.hasGift)   return false;
      if (h==='景點'   && !a.hasSight)  return false;
      if (h==='活動'   && !a.hasEvent)  return false;
    }
    if (kl) {
      const blob = [a.title,a.city,a.area,a.storeKw,a.snackKw,a.giftKw,a.sightKw,a.eventKw].join(' ').toLowerCase();
      if (!blob.includes(kl)) return false;
    }
    return true;
  });
}

function refreshSearchResults() {
  const results = filterContent();
  const cnt = document.getElementById('s-count');
  if (cnt) cnt.innerHTML = `共 <strong style="color:#1a1a1a">${results.length}</strong> 篇`;
  const grid = document.getElementById('s-grid');
  if (!grid) return;
  if (results.length === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px 0;color:#b4b2a9;font-size:13px">沒有符合條件的文章，試試調整篩選條件</div>';
    return;
  }
  grid.innerHTML = results.map(a => {
    const tags = [
      ...a.theme.map(t=>`<span style="font-size:10px;padding:2px 7px;border-radius:8px;font-weight:500;background:#EEEDFE;color:#3C3489">${t}</span>`),
      ...a.region.map(r=>`<span style="font-size:10px;padding:2px 7px;border-radius:8px;font-weight:500;background:#E6F1FB;color:#185FA5">${r}</span>`),
      ...a.season.map(s=>`<span style="font-size:10px;padding:2px 7px;border-radius:8px;font-weight:500;background:#EAF3DE;color:#3B6D11">${s}</span>`),
      `<span style="font-size:10px;padding:2px 7px;border-radius:8px;font-weight:500;background:#F1EFE8;color:#5F5E5A">${a.city}${a.area?'・'+a.area:''}</span>`,
    ].join('');
    const badges = [
      {has:a.hasStore, label:'店家',   kw:a.storeKw},
      {has:a.hasSnack, label:'小吃',   kw:a.snackKw},
      {has:a.hasGift,  label:'伴手禮', kw:a.giftKw},
      {has:a.hasSight, label:'景點',   kw:a.sightKw},
      {has:a.hasEvent, label:'活動',   kw:a.eventKw},
    ].map(b=>`<span style="font-size:10px;padding:2px 7px;border-radius:6px;${b.has?'background:#EAF3DE;color:#3B6D11':'background:#f1efe8;color:#b4b2a9'}">${b.has?'✓':''} ${b.label}</span>`).join('');
    const kwList = [a.storeKw,a.snackKw,a.giftKw,a.sightKw,a.eventKw].filter(Boolean).join('、');
    return `<div style="background:#fff;border:1px solid #e8e8e4;border-radius:12px;padding:1rem">
      <div style="font-size:13px;font-weight:500;color:#1a1a1a;margin-bottom:8px;line-height:1.4">${a.title}</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">${tags}</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px">${badges}</div>
      ${kwList?`<div style="font-size:10px;color:#b4b2a9;line-height:1.6">${kwList}</div>`:''}
    </div>`;
  }).join('');
}

function clearSearch() {
  activeThemes.clear(); activeRegions.clear(); activeSeasons.clear(); activeHas.clear();
  document.querySelectorAll('.fchip.on').forEach(b=>b.classList.remove('on'));
  const kw = document.getElementById('f-kw');
  if (kw) kw.value = '';
  const aiQ = document.getElementById('search-ai-q');
  if (aiQ) aiQ.value = '';
  const aiR = document.getElementById('search-ai-result');
  if (aiR) aiR.style.display = 'none';
  refreshSearchResults();
}

function askContentAI(btn) {
  const q = btn.dataset.q;
  const input = document.getElementById('search-ai-q');
  if (input) input.value = q;
  runContentAI();
}

async function runContentAI() {
  const input = document.getElementById('search-ai-q');
  const btn   = document.getElementById('search-ai-btn');
  const res   = document.getElementById('search-ai-result');
  if (!input || !btn || !res) return;
  const q = input.value.trim();
  if (!q) return;

  btn.disabled    = true;
  res.style.display = 'block';
  res.textContent   = 'AI 比對資料庫中…';

  const context = contentArticles.map(a =>
    `- 《${a.title}》｜${a.city}${a.area}｜主題:${a.theme.join('+')}｜地方:${a.region.join('+')}｜時令:${a.season.join('+')}｜`+
    (a.hasStore  ? `店家(${a.storeKw}) ` : '')+
    (a.hasSnack  ? `小吃(${a.snackKw}) ` : '')+
    (a.hasGift   ? `伴手禮(${a.giftKw}) ` : '')+
    (a.hasSight  ? `景點(${a.sightKw}) ` : '')+
    (a.hasEvent  ? `活動(${a.eventKw}) ` : '')
  ).join('\n');

  const GEMINI_KEY = window.__GEMINI_KEY__ || '';
  if (!GEMINI_KEY) {
    res.textContent = '請在 main.js 中設定 window.__GEMINI_KEY__';
    btn.disabled = false;
    return;
  }

  try {
    const url  = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
    const body = JSON.stringify({contents:[{parts:[{text:
      `你是內容資料庫助理。根據以下 ${contentArticles.length} 篇文章清單，用繁體中文精確回答問題。列出相關文章時請顯示標題與關鍵資訊，格式清晰，若無符合文章請直接說明。\n\n【文章資料庫】\n${context}\n\n【問題】${q}`
    }]}]});
    const resp   = await fetch(url, {method:'POST',headers:{'Content-Type':'application/json'},body});
    const data   = await resp.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || '無法取得回答';
    res.innerHTML = answer.replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>');
  } catch(e) {
    res.textContent = '查詢失敗，請確認 Gemini API Key 設定正確。';
  }
  btn.disabled = false;
}
