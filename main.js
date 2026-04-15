// ===== 常數與狀態 =====
const QS = ['Q1','Q2','Q3','Q4'];
const FIXED_YEAR = '2026';
const THEMES   = ['文化美食','自然生態','常民生活','藝術文化','綜覽台灣'];
const REGIONS  = ['北部','中部','南部','東部','離島'];
const SEASONS  = ['春','夏','秋','冬'];
const HAS_OPTS = ['店家','小吃','伴手禮','景點','活動'];
const THEME_COLORS  = ['#185FA5','#1D9E75','#534AB7','#EF9F27','#E24B4A'];
const REGION_COLORS = ['#185FA5','#1D9E75','#534AB7','#EF9F27','#E24B4A'];
const SEASON_COLORS = ['#1D9E75','#EF9F27','#E24B4A','#534AB7'];

let articles=[], config={}, summary={}, weeklyData={}, contentArticles=[], contentSummary={};
let opsYear='all', currentTab='exec', editingId=null;
let aiFilteredIds=null;
let activeThemes=new Set(), activeRegions=new Set(), activeSeasons=new Set(), activeHas=new Set();
let execChart=null, mgrChart=null, trendChart=null, achieveChart=null;
let dbThemeChart=null, dbRegionChart=null, dbSeasonChart=null, dbSubdirChart=null;
const AI_CACHE=new Map(), AI_CACHE_LIMIT=30;

document.getElementById('date-label').textContent = '截至 '+new Date().toLocaleDateString('zh-TW',{year:'numeric',month:'long',day:'numeric'});

Promise.all([
  fetch('data.json').then(r=>r.json()),
  fetch('config.json').then(r=>r.json()),
  fetch('summary.json').then(r=>r.json()).catch(()=>null),
  fetch('weekly.json').then(r=>r.json()).catch(()=>null),
  fetch('content.json').then(r=>r.json()).catch(()=>[]),
  fetch('content_summary.json').then(r=>r.json()).catch(()=>null),
]).then(([data,cfg,sum,weekly,content,contentSum])=>{
  articles=data; config=cfg; summary=sum||{}; weeklyData=weekly||{};
  contentArticles=content||[]; contentSummary=contentSum||{};
  init();
}).catch(err=>{
  document.getElementById('app').innerHTML=`<div class="error-screen">資料載入失敗：${err.message}<br>請確認 data.json 與 config.json 存在。</div>`;
});

// ===== 初始化 =====
function init() {
  document.getElementById('app').innerHTML=`
    <div id="ops-year-bar" style="display:none;margin-bottom:1.25rem"></div>
    <div class="tab-bar">
      <button class="tab active" onclick="switchTab('exec',this)">長官報告版</button>
      <button class="tab" onclick="switchTab('mgr',this)">主管報告版</button>
      <button class="tab" onclick="switchTab('ops',this)">後台編輯版</button>
      <button class="tab" onclick="switchTab('qa',this)">AI 數據摘要</button>
      <button class="tab" onclick="switchTab('search',this)">文章查詢</button>
      <button class="tab" onclick="switchTab('dbstats',this)">資料庫統計視覺化</button>
    </div>
    <div id="view-exec"    class="view active"></div>
    <div id="view-mgr"     class="view"></div>
    <div id="view-ops"     class="view"></div>
    <div id="view-qa"      class="view"></div>
    <div id="view-search"  class="view"></div>
    <div id="view-dbstats" class="view"></div>
  `;
  renderExec();
}

function switchTab(t,el) {
  document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('view-'+t).classList.add('active');
  currentTab=t;
  const opsBar=document.getElementById('ops-year-bar');
  if(t==='ops'){opsBar.style.display='block';buildOpsYearTabs();}
  else opsBar.style.display='none';
  if     (t==='exec')    renderExec();
  else if(t==='mgr')     renderMgr();
  else if(t==='ops')     renderOps();
  else if(t==='qa')      renderQA();
  else if(t==='search')  renderSearch();
  else if(t==='dbstats') renderDbStats();
}

// ===== 工具函式 =====
function pct(a,t){return t>0?Math.round(a/t*100):0;}
function pill(p){const c=p>=100?'pct-ok':p>=60?'pct-warn':'pct-danger';return`<span class="pct-pill ${c}">${p}%</span>`;}
function pgBar(p,color,h){h=h||'6px';return`<div style="height:${h};background:#f1efe8;border-radius:3px;overflow:hidden;margin-top:5px"><div style="height:100%;width:${Math.min(100,p)}%;background:${color};border-radius:3px;transition:width .4s"></div></div>`;}
function pctColor(p){return p>=100?'#0F6E56':p>=80?'#854F0B':'#A32D2D';}

// ★ 更新：直接根據「日期欄位」判斷 KPI 數據
function getKpiStats(arts, targetYear) {
  // 只計算已上架（有日期即算），依上架日期分配到對應季度
  const lzQ={Q1:0,Q2:0,Q3:0,Q4:0}, leQ={Q1:0,Q2:0,Q3:0,Q4:0};
  const fzQ={Q1:0,Q2:0,Q3:0,Q4:0}, feQ={Q1:0,Q2:0,Q3:0,Q4:0};

  arts.forEach(a => {
    // 中文 KPI
    if (a.dateZh && a.dateZh.startsWith(targetYear)) {
      const q = 'Q' + Math.ceil((new Date(a.dateZh).getMonth() + 1) / 3);
      if (lzQ[q] !== undefined) lzQ[q]++;
      if (fzQ[q] !== undefined) fzQ[q]++; // 已上架必定計入預估達成
    } else if (a.year === targetYear && a.dateZh) {
      const q = 'Q' + Math.ceil((new Date(a.dateZh).getMonth() + 1) / 3);
      if (fzQ[q] !== undefined) fzQ[q]++;
    } else if (a.year === targetYear && !a.dateZh) {
      if (fzQ[a.q] !== undefined) fzQ[a.q]++;
    }

    // 英文 KPI
    if (a.dateEn && a.dateEn.startsWith(targetYear)) {
      const q = 'Q' + Math.ceil((new Date(a.dateEn).getMonth() + 1) / 3);
      if (leQ[q] !== undefined) leQ[q]++;
      if (feQ[q] !== undefined) feQ[q]++;
    } else if (a.year === targetYear && a.dateEn) {
      const q = 'Q' + Math.ceil((new Date(a.dateEn).getMonth() + 1) / 3);
      if (feQ[q] !== undefined) feQ[q]++;
    } else if (a.year === targetYear && !a.dateEn) {
      if (feQ[a.q] !== undefined) feQ[a.q]++;
    }
  });
  return {lzQ, leQ, fzQ, feQ};
}

function kpiBlock(lang,stats,elId) {
  const kpi=config.kpi[FIXED_YEAR][lang];
  const isZh=(lang==='zh');
  const liveByQ=isZh?stats.lzQ:stats.leQ;
  const totalT=Object.values(kpi).reduce((a,b)=>a+b,0);
  const totalL=Object.values(liveByQ).reduce((a,b)=>a+b,0);
  const color=isZh?'#185FA5':'#1D9E75';
  const rows=QS.map(q=>{
    const t=kpi[q],l=liveByQ[q]||0;
    const lp=Math.min(100,pct(l,t));
    return`<div class="progress-row">
      <span class="p-label">${q} 目標 ${t}</span>
      <div class="p-track">
        <div class="p-ac" style="width:${lp}%;background:${color}"></div>
      </div>
      <div class="p-nums">已上架 <strong>${l}</strong> / ${t}</div>
      ${pill(pct(l,t))}
    </div>`;
  }).join('');
  document.getElementById(elId).innerHTML=`
    <div class="kpi-header">
      <span class="kpi-title">${isZh?'中文稿':'英譯稿'} ${FIXED_YEAR} KPI</span>
      <span class="kpi-meta">全年目標 ${totalT} 篇｜已上架 ${totalL} 篇（${pct(totalL,totalT)}%）</span>
    </div>
    ${rows}
    <div class="legend-row">
      <span><span class="ld" style="background:${color}"></span>已上架</span>
    </div>`;
}

// ★ 更新：累積圖表依據日期有無
function buildCumDataByYear(lang, arts, targetYear) {
  const kpi=config.kpi[targetYear][lang];
  const lbm=Array(12).fill(0);
  arts.forEach(a=>{
    const ds=lang==='zh'?a.dateZh:a.dateEn;
    if(ds && ds.startsWith(targetYear)){
      const m=new Date(ds).getMonth();
      if(m>=0 && m<12) lbm[m]++;
    }
  });
  const cumA=[];let s=0;
  lbm.forEach(v=>{s+=v;cumA.push(s);});
  const cumT=[];let ts=0;
  QS.forEach(q=>{const pm=kpi[q]/3;[0,1,2].forEach(()=>{ts+=pm;cumT.push(Math.round(ts));});});
  return{cumA,cumT};
}

function buildOpsYearTabs() {
  const el=document.getElementById('ops-year-bar');
  if(!el) return;
  const allYears=['all',...(config.years||[])];
  el.innerHTML=`<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
    <span style="font-size:12px;color:#888780;margin-right:4px">年份篩選</span>
    ${allYears.map(y=>`<button onclick="setOpsYear('${y}')" id="opsyr-${y}"
      style="padding:5px 14px;font-size:12px;border-radius:20px;cursor:pointer;border:1px solid #d3d1c7;
      background:${y===opsYear?'#185FA5':'#fff'};color:${y===opsYear?'#fff':'#888780'};
      font-weight:${y===opsYear?'500':'400'}">${y==='all'?'全部':y}</button>`).join('')}
  </div>`;
}
function setOpsYear(y){opsYear=y;buildOpsYearTabs();renderOps();}

// ===== 分頁一：長官報告版 =====
function renderExec() {
  // 使用 data.json（進度管理）作為計算來源
  const arts = articles;
  const total   = arts.length;
  const cnPub   = arts.filter(a => !!a.dateZh).length;     // 中文稿：有上架日期即計入
  const enPub   = arts.filter(a => !!a.dateEn).length;     // 英譯稿：有上架日期即計入
  const unpub   = total - cnPub;                            // 未上架 = 總數 − 中文已上架
  // 未上架狀態細分
  const statusCounts = {
    '待上架': arts.filter(a=>!a.dateZh && a.status==='待上架').length,
    '待改稿': arts.filter(a=>!a.dateZh && a.status==='待改稿').length,
    '待初審': arts.filter(a=>!a.dateZh && a.status==='待初審').length,
  };

  document.getElementById('view-exec').innerHTML=`
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:1.25rem">
      <span style="font-size:12px;padding:3px 14px;border-radius:12px;background:#185FA5;color:#fff;font-weight:500">${FIXED_YEAR}</span>
      <span style="font-size:11px;color:#b4b2a9">長官報告版 · 固定顯示當年度</span>
    </div>

    <!-- 總文章數（上方獨立一列） -->
    <div style="background:#fff;border:1px solid #e8e8e4;border-radius:14px;padding:1.25rem 1.5rem;margin-bottom:1rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
      <div>
        <div style="font-size:11px;color:#888780;margin-bottom:4px;font-weight:500">全資料庫總文章數</div>
        <div style="font-size:52px;font-weight:500;color:#1a1a1a;line-height:1">${total}</div>
        <div style="font-size:11px;color:#b4b2a9;margin-top:4px">歷年累積 · 包含所有狀態</div>
      </div>
      <div style="display:flex;gap:10px">
        <div style="text-align:center;padding:10px 16px;background:#f5f5f3;border-radius:10px">
          <div style="font-size:10px;color:#888780;margin-bottom:4px">中文稿上架</div>
          <div style="font-size:20px;font-weight:500;color:#185FA5">${cnPub}</div>
          <div style="font-size:10px;color:#b4b2a9">${pct(cnPub,total)}%</div>
        </div>
        <div style="text-align:center;padding:10px 16px;background:#f5f5f3;border-radius:10px">
          <div style="font-size:10px;color:#888780;margin-bottom:4px">英譯稿上架</div>
          <div style="font-size:20px;font-weight:500;color:#1D9E75">${enPub}</div>
          <div style="font-size:10px;color:#b4b2a9">${pct(enPub,total)}%</div>
        </div>
      </div>
    </div>

    <!-- 已上架 / 未上架 兩欄並排 -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">

      <!-- 已上架 -->
      <div style="background:#E6F1FB;border:1px solid #B5D4F4;border-radius:14px;padding:1.25rem">
        <div style="font-size:11px;font-weight:500;color:#185FA5;margin-bottom:8px">已上架文章數</div>
        <div style="font-size:44px;font-weight:500;color:#185FA5;line-height:1;margin-bottom:12px">${cnPub}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div style="background:rgba(255,255,255,0.8);border-radius:10px;padding:.875rem">
            <div style="font-size:10px;color:#185FA5;margin-bottom:4px;font-weight:500">中文稿上架</div>
            <div style="font-size:26px;font-weight:500;color:#185FA5">${cnPub}</div>
            <div style="font-size:10px;color:#0C447C;margin-top:3px">有中文上架日期</div>
          </div>
          <div style="background:rgba(255,255,255,0.8);border-radius:10px;padding:.875rem">
            <div style="font-size:10px;color:#0F6E56;margin-bottom:4px;font-weight:500">英譯稿上架</div>
            <div style="font-size:26px;font-weight:500;color:#1D9E75">${enPub}</div>
            <div style="font-size:10px;color:#085041;margin-top:3px">有英文上架日期</div>
          </div>
        </div>
      </div>

      <!-- 未上架 -->
      <div style="background:#FAEEDA;border:1px solid #FAC775;border-radius:14px;padding:1.25rem">
        <div style="font-size:11px;font-weight:500;color:#854F0B;margin-bottom:8px">未上架文章數</div>
        <div style="font-size:44px;font-weight:500;color:#854F0B;line-height:1;margin-bottom:12px">${unpub}</div>
        <div style="font-size:10px;color:#854F0B;margin-bottom:10px">= 總文章數 ${total} − 中文稿上架 ${cnPub}</div>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${Object.entries(statusCounts).map(([s,n])=>n>0?`
            <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.7);border-radius:8px;padding:7px 10px">
              <span style="font-size:11px;color:#854F0B">${s}</span>
              <span style="font-size:14px;font-weight:500;color:#854F0B">${n} 篇</span>
            </div>`:'').join('')}
          ${statusCounts['待上架']+statusCounts['待改稿']+statusCounts['待初審']<unpub?`
            <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.5);border-radius:8px;padding:7px 10px">
              <span style="font-size:11px;color:#888780">其他</span>
              <span style="font-size:14px;font-weight:500;color:#888780">${unpub-statusCounts['待上架']-statusCounts['待改稿']-statusCounts['待初審']} 篇</span>
            </div>`:''}
        </div>
      </div>
    </div>

    <!-- 2026 KPI -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
      <div class="kpi-block" id="exec-kpi-zh"></div>
      <div class="kpi-block" id="exec-kpi-en"></div>
    </div>

    <!-- 全年累積折線圖 -->
    <div class="kpi-block">
      <div class="kpi-header"><span class="kpi-title">${FIXED_YEAR} 全年累積上架進度</span><span class="kpi-meta">實際累積 vs 目標進度線</span></div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:11px;color:#888780;margin-bottom:10px">
        <span><span class="ld" style="background:#185FA5"></span>中文稿實際</span>
        <span><span class="ld" style="background:#1D9E75"></span>英譯稿實際</span>
        <span><span class="ld" style="background:#D3D1C7"></span>中文稿目標</span>
        <span><span class="ld" style="background:#9FE1CB"></span>英譯稿目標</span>
      </div>
      <div class="chart-wrap" style="height:220px"><canvas id="exec-chart"></canvas></div>
    </div>
    <div class="watermark">資料更新日期：${new Date().toLocaleDateString('zh-TW')} · 資料來源：進度管理 Excel</div>`;

  const kpiStats = getKpiStats(articles, FIXED_YEAR);
  kpiBlock('zh', kpiStats, 'exec-kpi-zh');
  kpiBlock('en', kpiStats, 'exec-kpi-en');

  const dZh = buildCumDataByYear('zh', articles, FIXED_YEAR);
  const dEn = buildCumDataByYear('en', articles, FIXED_YEAR);

  if(execChart) execChart.destroy();
  execChart=new Chart(document.getElementById('exec-chart').getContext('2d'),{
    type:'line',
    data:{labels:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],datasets:[
      {data:dZh.cumT,borderColor:'#B4B2A9',borderDash:[5,4],borderWidth:1.5,pointRadius:0,fill:false,tension:0},
      {data:dEn.cumT,borderColor:'#9FE1CB',borderDash:[5,4],borderWidth:1.5,pointRadius:0,fill:false,tension:0},
      {data:dZh.cumA,borderColor:'#185FA5',backgroundColor:'rgba(24,95,165,0.07)',borderWidth:2,pointRadius:3,pointBackgroundColor:'#185FA5',fill:true,tension:0.3},
      {data:dEn.cumA,borderColor:'#1D9E75',backgroundColor:'rgba(29,158,117,0.07)',borderWidth:2,pointRadius:3,pointBackgroundColor:'#1D9E75',fill:true,tension:0.3},
    ]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{mode:'index',intersect:false}},
      scales:{x:{grid:{display:false},ticks:{color:'#888780',font:{size:11}}},
        y:{grid:{color:'rgba(136,135,128,0.12)'},ticks:{color:'#888780',font:{size:11},stepSize:20},min:0}}}
  });
}

// ===== 月別統計 =====
function getMonthlyStats(weeks) {
  const map={};
  weeks.forEach(w=>{
    const parts=w.week.split('-W');
    if(parts.length<2) return;
    const yr=parseInt(parts[0]),wk=parseInt(parts[1]);
    const d=new Date(yr,0,1+(wk-1)*7);
    const mo=d.getMonth()+1;
    const key=`${yr}-${String(mo).padStart(2,'0')}`;
    if(!map[key]) map[key]={cnAct:0,enAct:0,cnPlan:0,enPlan:0,label:`${mo}月`};
    map[key].cnAct+=w.cnAct; map[key].enAct+=w.enAct;
    map[key].cnPlan+=w.cnPlan; map[key].enPlan+=w.enPlan;
  });
  return Object.entries(map).sort(([a],[b])=>a.localeCompare(b))
    .map(([k,v])=>({key:k,...v,
      cnAchieve:pct(v.cnAct,v.cnPlan),
      enAchieve:pct(v.enAct,v.enPlan),
    }));
}

// ===== 分頁二：主管報告版 =====
function renderMgr() {
  const weeks=(weeklyData.weeks||[]).filter(w=>w.week.startsWith(FIXED_YEAR));
  const allArts = articles; // 使用全資料庫
  
  // ★ 更新：翻譯卡關定義 -> 已有中文上架日，且超過 7 天沒有英文上架日
  const today=new Date(); today.setHours(0,0,0,0);
  const stuck=allArts.filter(a=>a.dateZh&&!a.dateEn&&(today-new Date(a.dateZh))/86400000>7).length;

  // 取得 2026 KPI 數據
  const kpiStats = getKpiStats(allArts, FIXED_YEAR);
  const kpi = config.kpi[FIXED_YEAR];
  const totalTZh = Object.values(kpi.zh).reduce((a,b)=>a+b,0);
  const totalTEn = Object.values(kpi.en).reduce((a,b)=>a+b,0);
  const totalLZh = Object.values(kpiStats.lzQ).reduce((a,b)=>a+b,0);
  const totalLEn = Object.values(kpiStats.leQ).reduce((a,b)=>a+b,0);

  // 當前季度
  const nowQ='Q'+(Math.ceil((new Date().getMonth()+1)/3));
  const qLZh=kpiStats.lzQ[nowQ]||0, qLEn=kpiStats.leQ[nowQ]||0;
  const qTZh=kpi.zh[nowQ]||0, qTEn=kpi.en[nowQ]||0;

  // 最新週與月統計
  const lastWeek=weeks.length>0?weeks[weeks.length-1]:null;
  const wkCnA=lastWeek?lastWeek.cnAchieve:0;
  const wkEnA=lastWeek?lastWeek.enAchieve:0;
  const monthStats=getMonthlyStats(weeks);
  const nowMoKey=`${FIXED_YEAR}-${String(new Date().getMonth()+1).padStart(2,'0')}`;
  const nowMo=monthStats.find(m=>m.key===nowMoKey);
  const moCnA=nowMo?nowMo.cnAchieve:0;
  const moEnA=nowMo?nowMo.enAchieve:0;

  // 達標燈號
  const statusLight=(p)=>p>=100?'🟢':p>=80?'🟡':'🔴';
  const statusText=(p)=>p>=100?'達標':p>=80?'接近':'落後';
  const statusColor=(p)=>pctColor(p);
  const statusBg=(p)=>p>=100?'#EAF3DE':p>=80?'#FAEEDA':'#FCEBEB';

  // 達標率大表格列
  const rateRow=(label,period,cnP,enP)=>`
    <div style="display:grid;grid-template-columns:120px 1fr 1fr;border-bottom:1px solid #f5f5f3;min-height:56px">
      <div style="padding:10px 14px;display:flex;flex-direction:column;justify-content:center;border-right:1px solid #f5f5f3">
        <div style="font-size:12px;font-weight:500;color:#1a1a1a">${label}</div>
        ${period?`<div style="font-size:10px;color:#b4b2a9;margin-top:2px">${period}</div>`:''}
      </div>
      <div style="padding:10px 16px;border-right:1px solid #f5f5f3">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
          <span style="font-size:11px;color:#185FA5;font-weight:500">中文稿</span>
          <div style="display:flex;align-items:center;gap:5px">
            <span style="font-size:16px;font-weight:500;color:${statusColor(cnP)}">${cnP}%</span>
            <span style="font-size:9px;padding:1px 6px;border-radius:6px;background:${statusBg(cnP)};color:${statusColor(cnP)}">${statusText(cnP)}</span>
          </div>
        </div>
        ${pgBar(cnP,'#185FA5','4px')}
      </div>
      <div style="padding:10px 16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
          <span style="font-size:11px;color:#1D9E75;font-weight:500">英譯稿</span>
          <div style="display:flex;align-items:center;gap:5px">
            <span style="font-size:16px;font-weight:500;color:${statusColor(enP)}">${enP}%</span>
            <span style="font-size:9px;padding:1px 6px;border-radius:6px;background:${statusBg(enP)};color:${statusColor(enP)}">${statusText(enP)}</span>
          </div>
        </div>
        ${pgBar(enP,'#1D9E75','4px')}
      </div>
    </div>`;

  const yrCnP=pct(totalLZh,totalTZh), yrEnP=pct(totalLEn,totalTEn);
  const qCnP=pct(qLZh,qTZh), qEnP=pct(qLEn,qTEn);
  const overallOk=yrCnP>=100&&yrEnP>=100, overallWn=yrCnP>=80&&yrEnP>=80;

  // 英譯庫存
  const invColor=(lastWeek&&lastWeek.enDanger)?'#A32D2D':(lastWeek&&lastWeek.enWarn)?'#854F0B':'#1D9E75';
  const invBg=(lastWeek&&lastWeek.enDanger)?'#FCEBEB':(lastWeek&&lastWeek.enWarn)?'#FAEEDA':'#EAF3DE';
  const invBorder=(lastWeek&&lastWeek.enDanger)?'#F7C1C1':(lastWeek&&lastWeek.enWarn)?'#FAC775':'#C0DD97';
  const invText=lastWeek?(lastWeek.enDanger?'低於警戒，需立即補充':lastWeek.enWarn?'接近警戒，建議補充':'安全水位'):'尚無資料';

  document.getElementById('view-mgr').innerHTML=`
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:1.25rem">
      <span style="font-size:12px;padding:3px 14px;border-radius:12px;background:#185FA5;color:#fff;font-weight:500">${FIXED_YEAR}</span>
      <span style="font-size:11px;color:#b4b2a9">主管報告版 · 固定顯示當年度</span>
    </div>

    <!-- 達標率概覽 -->
    <div style="background:#fff;border:1px solid #e8e8e4;border-radius:14px;overflow:hidden;margin-bottom:1rem">

      <!-- 標題列 -->
      <div style="display:grid;grid-template-columns:120px 1fr 1fr;background:#fafaf8;border-bottom:1px solid #e8e8e4">
        <div style="padding:10px 14px;font-size:11px;color:#888780;font-weight:500;border-right:1px solid #e8e8e4">達標率概覽</div>
        <div style="padding:10px 16px;font-size:11px;color:#185FA5;font-weight:500;border-right:1px solid #e8e8e4;display:flex;align-items:center;gap:4px">
          <span style="width:8px;height:8px;border-radius:50%;background:#185FA5;display:inline-block"></span>中文稿
        </div>
        <div style="padding:10px 16px;font-size:11px;color:#1D9E75;font-weight:500;display:flex;align-items:center;gap:4px">
          <span style="width:8px;height:8px;border-radius:50%;background:#1D9E75;display:inline-block"></span>英譯稿
        </div>
      </div>

      ${rateRow('全年 KPI',`目標 ${totalTZh} / ${totalTEn} 篇`,yrCnP,yrEnP)}
      ${rateRow('本季 KPI',nowQ,qCnP,qEnP)}
      ${rateRow('本月進度',new Date().toLocaleDateString('zh-TW',{month:'long'}),moCnA,moEnA)}
      ${rateRow('本週進度',lastWeek?lastWeek.week:'—',wkCnA,wkEnA)}

      <!-- 庫存水位列 -->
      <div style="display:grid;grid-template-columns:120px 1fr;background:${invBg};border-top:2px solid ${invBorder}">
        <div style="padding:12px 14px;border-right:1px solid ${invBorder}">
          <div style="font-size:12px;font-weight:500;color:${invColor}">英譯稿庫存</div>
          <div style="font-size:10px;color:${invColor};margin-top:2px;opacity:0.8">${invText}</div>
        </div>
        <div style="padding:12px 16px;display:flex;align-items:center;gap:12px">
          <span style="font-size:36px;font-weight:500;color:${invColor};line-height:1">${lastWeek?lastWeek.enStock:'—'}</span>
          <div>
            <div style="font-size:11px;color:${invColor};font-weight:500">篇可上架</div>
            <div style="font-size:10px;color:${invColor};opacity:0.8;margin-top:2px">
              ${lastWeek?`待翻：${lastWeek.enPending} 篇排隊中`:''}
            </div>
          </div>
          ${lastWeek&&lastWeek.enDanger?`<span style="font-size:20px">🔴</span>`:lastWeek&&lastWeek.enWarn?`<span style="font-size:20px">🟡</span>`:`<span style="font-size:20px">🟢</span>`}
        </div>
      </div>
    </div>

    <div class="kpi-block" style="margin-bottom:1rem" id="mgr-monthly-section"></div>

    <div id="mgr-weekly-section"></div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
      <div class="kpi-block" id="mgr-kpi-zh"></div>
      <div class="kpi-block" id="mgr-kpi-en"></div>
    </div>

`;

  const mgrMonthEl=document.getElementById('mgr-monthly-section');
  if(monthStats.length>0){
    mgrMonthEl.innerHTML=`
      <div class="kpi-header"><span class="kpi-title">3.2 月別達標率</span><span class="kpi-meta">從週別記錄加總計算</span></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px">
        ${monthStats.map(m=>`
          <div style="padding:.75rem;background:#f9f9f7;border-radius:8px;border:1px solid #f1efe8">
            <div style="font-size:11px;font-weight:500;color:#1a1a1a;margin-bottom:7px">${m.label}</div>
            <div style="font-size:10px;color:#888780;margin-bottom:2px;display:flex;justify-content:space-between">
              <span>中文稿</span><span style="color:${pctColor(m.cnAchieve)};font-weight:500">${m.cnAchieve}%</span>
            </div>
            ${pgBar(m.cnAchieve,'#185FA5')}
            <div style="font-size:10px;color:#888780;margin-top:5px;margin-bottom:2px;display:flex;justify-content:space-between">
              <span>英譯稿</span><span style="color:${pctColor(m.enAchieve)};font-weight:500">${m.enAchieve}%</span>
            </div>
            ${pgBar(m.enAchieve,'#1D9E75')}
            <div style="font-size:9px;color:#b4b2a9;margin-top:5px">中文稿 ${m.cnAct}/${m.cnPlan} · 英譯稿 ${m.enAct}/${m.enPlan}</div>
          </div>`).join('')}
      </div>`;
  } else {
    mgrMonthEl.innerHTML=`<div class="kpi-header"><span class="kpi-title">3.2 月別達標率</span></div><div style="text-align:center;padding:1.5rem;font-size:12px;color:#b4b2a9">尚無週別記錄</div>`;
  }

  kpiBlock('zh', kpiStats, 'mgr-kpi-zh');
  kpiBlock('en', kpiStats, 'mgr-kpi-en');
  


  if(weeks.length>0) renderWeeklySection(weeks,0,stuck);
  else document.getElementById('mgr-weekly-section').innerHTML=`
    <div class="kpi-block" style="margin-bottom:1rem;text-align:center;padding:2rem">
      <div style="font-size:13px;color:#888780">尚無 ${FIXED_YEAR} 週別記錄</div>
    </div>`;
}

function renderWeeklySection(weeks,overdue,stuck) {
  let idx=weeks.length-1;
  function pCtColor(p){return p>=100?'#0F6E56':p>=80?'#854F0B':'#A32D2D';}
  function pCtBadge(p){return`font-size:10px;padding:2px 7px;border-radius:8px;font-weight:500;background:${p>=100?'#EAF3DE':p>=80?'#FAEEDA':'#FCEBEB'};color:${pCtColor(p)}`;}


  function weekDateRange(weekStr) {
    const parts = weekStr.split('-W');
    if (parts.length < 2) return weekStr;
    const yr = parseInt(parts[0]), wk = parseInt(parts[1]);
    const jan4 = new Date(yr, 0, 4);
    const startDay = jan4.getDate() - (jan4.getDay()||7) + 1 + (wk-1)*7;
    const start = new Date(yr, 0, startDay);
    const end   = new Date(yr, 0, startDay + 6);
    const fmt = d => `${d.getMonth()+1}/${d.getDate()}`;
    return `${fmt(start)}–${fmt(end)}`;
  }
  function weekCard(w) {
    const tc=w.transRate>=80?'#1D9E75':w.transRate>=50?'#EF9F27':'#E24B4A';
    const ed=w.enDanger, ew=w.enWarn&&!ed;
    const sc=ed?'#A32D2D':ew?'#854F0B':'#1D9E75';
    const dateRange=weekDateRange(w.week);

    const actions=[];
    if(ed) actions.push({t:'urgent',m:`英譯庫存僅剩 ${w.enStock} 篇，已低於警戒線 5 篇。需從待翻排程優先送譯至少 5 篇，避免斷稿。`});
    else if(ew) actions.push({t:'warn',m:`英譯庫存 ${w.enStock} 篇，接近警戒線。建議本週補充翻譯 3 篇以上。`});
    if(w.transRate<80) actions.push({t:'warn',m:`中英轉譯率 ${w.transRate}%，低於建議值 80%，中文產出速度超前翻譯，建議評估增加翻譯資源。`});
    if(w.enAchieve<80) actions.push({t:'urgent',m:`本週英譯稿達成率僅 ${w.enAchieve}%，請確認翻譯卡關原因並調整排程。`});
    if(w.cnAchieve>=100&&w.cnReady>10) actions.push({t:'normal',m:`中文稿達成率 ${w.cnAchieve}%，審閱庫存充裕（${w.cnReady} 篇），可安排推進翻譯流程。`});
    if(stuck>0) actions.push({t:'warn',m:`共 ${stuck} 篇中文已上架超過 7 天仍未有英文上架，需追蹤翻譯進度。`});
    if(actions.length===0) actions.push({t:'normal',m:'本週各項指標正常，請維持現有節奏。'});

    const metricRow=(icon,label,val,valColor,note,noteBg)=>`
      <div style="display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid #f5f5f3">
        <div style="font-size:18px;width:24px;text-align:center;flex-shrink:0">${icon}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:11px;color:#888780">${label}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:20px;font-weight:500;color:${valColor}">${val}</span>
          ${note?`<span style="font-size:10px;padding:2px 7px;border-radius:6px;background:${noteBg||'#f1efe8'};color:${valColor}">${note}</span>`:''}
        </div>
      </div>`;

    const achieveNote=(p)=>p>=100?'達標':p>=80?'接近':'落後';
    const achieveBg=(p)=>p>=100?'#EAF3DE':p>=80?'#FAEEDA':'#FCEBEB';

    return`
      <div style="background:#fff;border:1px solid #e8e8e4;border-radius:14px;overflow:hidden;margin-bottom:1rem">

        <!-- 週標題 -->
        <div style="padding:14px 18px;background:linear-gradient(90deg,#E6F1FB 0%,#E1F5EE 100%);border-bottom:1px solid #e8e8e4;display:flex;justify-content:space-between;align-items:center">
          <div>
            <span style="font-size:13px;font-weight:500;color:#0C447C">${w.week}</span>
            <span style="font-size:11px;color:#888780;margin-left:8px">${dateRange}</span>
          </div>
          <div style="display:flex;gap:8px">
            <span style="font-size:11px;padding:3px 10px;border-radius:10px;background:rgba(24,95,165,0.12);color:#185FA5">中文稿 ${w.cnAchieve}%</span>
            <span style="font-size:11px;padding:3px 10px;border-radius:10px;background:rgba(29,158,117,0.12);color:#1D9E75">英譯稿 ${w.enAchieve}%</span>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">

          <!-- 中文稿區塊 -->
          <div style="border-right:1px solid #f1efe8">
            <div style="padding:8px 14px;background:#f9fbff;border-bottom:1px solid #f1efe8">
              <span style="font-size:11px;font-weight:500;color:#185FA5">中文稿</span>
            </div>
            ${metricRow('📤','本週計畫上架',w.cnPlan+'篇','#185FA5',null,null)}
            ${metricRow('✅','本週實際上架',w.cnAct+'篇',pCtColor(pct(w.cnAct,w.cnPlan)),achieveNote(pct(w.cnAct,w.cnPlan)),achieveBg(pct(w.cnAct,w.cnPlan)))}
            ${metricRow('📋','預計審閱（Ready）',w.cnReady+'篇','#185FA5',null,null)}
            ${metricRow('✏️','待編修（Raw）',w.cnRaw+'篇','#888780',null,null)}
          </div>

          <!-- 英譯稿區塊 -->
          <div>
            <div style="padding:8px 14px;background:#f6fcf9;border-bottom:1px solid #f1efe8">
              <span style="font-size:11px;font-weight:500;color:#1D9E75">英譯稿</span>
            </div>
            ${metricRow('📤','本週計畫上架',w.enPlan+'篇','#1D9E75',null,null)}
            ${metricRow('✅','本週實際上架',w.enAct+'篇',pCtColor(pct(w.enAct,w.enPlan)),achieveNote(pct(w.enAct,w.enPlan)),achieveBg(pct(w.enAct,w.enPlan)))}
            ${metricRow('📚','已翻譯可上架',w.enStock+'篇',sc,ed?'危險':ew?'注意':'正常',ed?'#FCEBEB':ew?'#FAEEDA':'#EAF3DE')}
            ${metricRow('⏳','等待翻譯（待翻）',w.enPending+'篇','#534AB7',null,null)}
          </div>
        </div>

        <!-- 轉譯率 -->
        <div style="padding:10px 18px;background:#fafaf8;border-top:1px solid #f1efe8;display:flex;align-items:center;gap:12px">
          <span style="font-size:11px;color:#888780">中英轉譯率（累計）</span>
          <div style="flex:1;height:6px;background:#f1efe8;border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${Math.min(100,w.transRate)}%;background:${tc};border-radius:3px"></div>
          </div>
          <span style="font-size:16px;font-weight:500;color:${tc}">${w.transRate}%</span>
          <span style="font-size:10px;padding:2px 7px;border-radius:6px;background:${w.transRate>=80?'#EAF3DE':w.transRate>=50?'#FAEEDA':'#FCEBEB'};color:${tc}">${w.transRate>=80?'健康':w.transRate>=50?'偏低':'警告'}</span>
        </div>
      </div>

      <!-- 行動建議 -->
      <div style="background:#fff;border:1px solid #e8e8e4;border-radius:12px;padding:1.25rem;margin-bottom:12px">
        <div style="font-size:13px;font-weight:500;margin-bottom:10px">本週行動建議</div>
        <div style="display:flex;flex-direction:column;gap:7px">
          ${actions.map(a=>`<div style="display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:8px;border:1px solid;${a.t==='urgent'?'background:#FCEBEB;border-color:#F7C1C1':a.t==='warn'?'background:#FAEEDA;border-color:#FAC775':'background:#EAF3DE;border-color:#C0DD97'}">
            <div style="width:7px;height:7px;border-radius:50%;flex-shrink:0;margin-top:4px;background:${a.t==='urgent'?'#E24B4A':a.t==='warn'?'#EF9F27':'#639922'}"></div>
            <div style="font-size:12px;line-height:1.6;color:${a.t==='urgent'?'#A32D2D':a.t==='warn'?'#854F0B':'#3B6D11'}">${a.m}</div>
          </div>`).join('')}
        </div>
      </div>`;
  }

  const selectorHtml=`
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:1.25rem;flex-wrap:wrap">
      <span style="font-size:12px;color:#888780;margin-right:6px">切換週別</span>
      ${weeks.map((w,i)=>{
        const wNum=w.week.replace(FIXED_YEAR+'-','');
        const dr=weekDateRange(w.week);
        const isActive=i===idx;
        return`<button id="wbtn-${i}" onclick="selectWeekBtn(${i})"
          style="padding:6px 12px;font-size:11px;border-radius:10px;cursor:pointer;
          border:1px solid ${isActive?'#185FA5':'#e8e8e4'};
          background:${isActive?'#185FA5':'#fff'};
          color:${isActive?'#fff':'#888780'};
          text-align:left;line-height:1.4">
          <span style="font-weight:500;display:block">${wNum}</span>
          <span style="font-size:9px;opacity:${isActive?'0.85':'0.7'}">${dr}</span>
        </button>`;
      }).join('')}
    </div>`;

  const chartHtml=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
      <div class="kpi-block">
        <div class="kpi-header"><span class="kpi-title">累計上架趨勢</span></div>
        <div class="chart-wrap" style="height:160px"><canvas id="w-trend-chart"></canvas></div>
      </div>
      <div class="kpi-block">
        <div class="kpi-header"><span class="kpi-title">週別達成率</span></div>
        <div class="chart-wrap" style="height:160px"><canvas id="w-achieve-chart"></canvas></div>
      </div>
    </div>`;

  document.getElementById('mgr-weekly-section').innerHTML=
    selectorHtml+`<div id="week-detail">${weekCard(weeks[idx])}</div>`+chartHtml;

  window.selectWeekBtn=function(i){
    idx=i;
    weeks.forEach((_,j)=>{
      const b=document.getElementById(`wbtn-${j}`);
      if(b){b.style.background=j===i?'#185FA5':'#fff';b.style.color=j===i?'#fff':'#888780';b.style.fontWeight=j===i?'500':'400';}
    });
    document.getElementById('week-detail').innerHTML=weekCard(weeks[i]);
  };

  const labels=weeks.map(w=>w.week.replace(FIXED_YEAR+'-',''));
  if(trendChart) trendChart.destroy();
  trendChart=new Chart(document.getElementById('w-trend-chart').getContext('2d'),{
    type:'line',
    data:{labels,datasets:[
      {data:weeks.map(w=>w.cnPlanCum),borderColor:'#B5D4F4',borderDash:[5,3],borderWidth:1.5,pointRadius:0,fill:false,tension:0},
      {data:weeks.map(w=>w.enPlanCum),borderColor:'#9FE1CB',borderDash:[5,3],borderWidth:1.5,pointRadius:0,fill:false,tension:0},
      {data:weeks.map(w=>w.cnCum),borderColor:'#185FA5',backgroundColor:'rgba(24,95,165,0.06)',borderWidth:2,pointRadius:4,pointBackgroundColor:'#185FA5',fill:true,tension:0.3},
      {data:weeks.map(w=>w.enCum),borderColor:'#1D9E75',backgroundColor:'rgba(29,158,117,0.06)',borderWidth:2,pointRadius:4,pointBackgroundColor:'#1D9E75',fill:true,tension:0.3},
    ]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{mode:'index',intersect:false}},
      scales:{x:{grid:{display:false},ticks:{color:'#888780',font:{size:10}}},y:{grid:{color:'rgba(136,135,128,0.12)'},ticks:{color:'#888780',font:{size:10}},min:0}}}
  });
  if(achieveChart) achieveChart.destroy();
  achieveChart=new Chart(document.getElementById('w-achieve-chart').getContext('2d'),{
    type:'bar',
    data:{labels,datasets:[
      {label:'CN',data:weeks.map(w=>w.cnAchieve),backgroundColor:'#185FA5'},
      {label:'EN',data:weeks.map(w=>w.enAchieve),backgroundColor:'#1D9E75'},
    ]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${c.raw}%`}}},
      scales:{x:{grid:{display:false},ticks:{color:'#888780',font:{size:10}}},y:{grid:{color:'rgba(136,135,128,0.12)'},ticks:{color:'#888780',font:{size:10},callback:v=>v+'%'},min:0,max:130}}}
  });
}

// ===== 分頁三：後台編輯版 =====
function renderOps() {
  const opsEl=document.getElementById('view-ops');
  if(!opsEl.querySelector('table')){
    // ★ 更新：移除了 <th>中文</th> 和 <th>英文</th>，調整了其他欄位的寬度分配
    opsEl.innerHTML=`
      <div class="filter-bar">
        <input type="text" id="ops-search" placeholder="搜尋標題…" style="width:140px" oninput="renderOps()">
        <select id="ops-status" onchange="renderOps()"><option value="">全部狀態</option><option>已上架</option><option>待上架</option><option>待改稿</option><option>待初審</option></select>
        <button class="btn-sm" onclick="exportCSV()">匯出 CSV</button>
        <button class="btn-sm btn-blue" onclick="openModal(null)">+ 新增文章</button>
      </div>
      <div class="tbl-wrap">
        <table>
          <thead><tr>
            <th style="width:7%">年份</th><th style="width:38%">標題</th><th style="width:15%">狀態</th>
            <th style="width:17%">中文上架日</th><th style="width:17%">英文上架日</th>
            <th style="width:6%"></th>
          </tr></thead>
          <tbody id="ops-tbody"></tbody>
        </table>
      </div>`;
    const mY=document.getElementById('m-year');
    if(mY) mY.innerHTML=(config.years||[]).map(y=>`<option>${y}</option>`).join('');
  }
  const q=(document.getElementById('ops-search')||{}).value||'';
  const st=(document.getElementById('ops-status')||{}).value||'';
  const smap={'已上架':'s3','待上架':'s2','待改稿':'s1','待初審':'s0'};
  const f=articles.filter(a=>{
    if(opsYear!=='all'&&a.year!==opsYear) return false;
    if(q&&!a.title.toLowerCase().includes(q.toLowerCase())) return false;
    if(st&&a.status!==st) return false;
    return true;
  });
  document.getElementById('ops-tbody').innerHTML=f.map(a=>`
    <tr>
      <td style="color:#888780">${a.year}</td>
      <td title="${a.title}">${a.title}</td>
      <td><span class="sbadge ${smap[a.status]||''}">${a.status}</span></td>
      <td style="color:#888780">${a.dateZh||'—'}</td>
      <td style="color:#888780">${a.dateEn||'—'}</td>
      <td><button style="font-size:11px;padding:2px 8px;border-radius:6px;cursor:pointer;border:1px solid #d3d1c7;background:#fff;color:#888780" onclick="openModal(${a.id})">編輯</button></td>
    </tr>`).join('');
}

// ===== 分頁四：AI 數據摘要 =====
function renderQA() {
  const yearData=summary.data?.[FIXED_YEAR];
  const updated=summary.updated||'尚未同步';
  if(!yearData){
    document.getElementById('view-qa').innerHTML=`<div class="qa-wrap"><div class="qa-title">AI 數據摘要</div><div style="font-size:12px;color:#b4b2a9;padding:24px 0;text-align:center">尚未產生 ${FIXED_YEAR} 年度摘要。</div></div>`;
    return;
  }
  const highlights=yearData.highlights||[];
  const qaPairs=yearData.qa_pairs||[];
  const stats=yearData.stats||{};
  const hlHtml=highlights.length>0?highlights.map(h=>`<div style="display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:0.5px solid #f1efe8"><div style="width:6px;height:6px;border-radius:50%;background:#185FA5;flex-shrink:0;margin-top:5px"></div><div style="font-size:13px;color:#1a1a1a;line-height:1.6">${h}</div></div>`).join(''):'<div style="font-size:12px;color:#b4b2a9;padding:12px 0">摘要產生中</div>';
  const qaHtml=qaPairs.length>0?qaPairs.map((p,i)=>`<div style="border:1px solid #e8e8e4;border-radius:8px;overflow:hidden;margin-bottom:8px"><div style="background:#f5f5f3;padding:8px 12px;font-size:12px;font-weight:500;color:#1a1a1a;cursor:pointer" onclick="toggleQA(${i})"><span style="color:#185FA5;margin-right:6px">Q</span>${p.q}</div><div id="qa-ans-${i}" style="display:none;padding:10px 12px;font-size:12px;color:#1a1a1a;line-height:1.6;border-top:1px solid #f1efe8"><span style="color:#1D9E75;font-weight:500;margin-right:6px">A</span>${p.a}</div></div>`).join(''):'<div style="font-size:12px;color:#b4b2a9;padding:12px 0">問答產生中</div>';
  const sk=(stats.stuck||[]).slice(0,5);
  document.getElementById('view-qa').innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
      <div class="qa-wrap">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><div class="qa-title">${FIXED_YEAR} 年度重點摘要</div><div style="font-size:10px;color:#b4b2a9">更新於 ${updated}</div></div>
        ${hlHtml}
      </div>
      <div class="qa-wrap">
        <div class="qa-title" style="margin-bottom:14px">需注意項目</div>
        ${sk.length>0?`<div style="font-size:11px;font-weight:500;color:#854F0B;margin-top:12px;margin-bottom:6px">翻譯卡關（${stats.stuck?.length||0} 篇）</div>${sk.map(t=>`<div style="font-size:11px;padding:4px 0;border-bottom:0.5px solid #f1efe8">${t}</div>`).join('')}`:'<div style="font-size:12px;color:#b4b2a9;margin-top:12px">無翻譯卡關</div>'}
      </div>
    </div>
    <div class="qa-wrap"><div class="qa-title" style="margin-bottom:4px">常見問答</div><div style="font-size:11px;color:#888780;margin-bottom:14px">點選問題展開答案 · AI 根據最新數據自動產生</div>${qaHtml}</div>`;
}
function toggleQA(i){const el=document.getElementById(`qa-ans-${i}`);if(el) el.style.display=el.style.display==='none'?'block':'none';}

// ===== 分頁五：文章查詢 =====
function renderSearch() {
  const el=document.getElementById('view-search');
  if(el.querySelector('.search-hero')){refreshSearchResults();return;}
  const presetQA=(contentSummary.qa_pairs||[]);
  el.innerHTML=`
    <div class="search-hero" style="background:#fff;border:1px solid #e8e8e4;border-radius:12px;padding:1.25rem;margin-bottom:1rem">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <div style="font-size:14px;font-weight:500">AI 自然語言查詢</div>
        <span style="font-size:11px;padding:3px 10px;border-radius:12px;background:#f1efe8;color:#888780">全資料庫 · 不受年份篩選影響</span>
      </div>
      <div style="font-size:11px;color:#888780;margin-bottom:12px">直接用說話的方式問問題，AI 自動比對 ${contentArticles.length} 篇文章回答，<strong style="color:#185FA5">查詢後底下卡片會自動篩選 AI 提到的文章</strong></div>
      ${presetQA.length>0?`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">${presetQA.slice(0,6).map(p=>`<button onclick="askContentAI(this)" data-q="${p.q.replace(/"/g,'&quot;')}" style="font-size:11px;padding:4px 10px;border-radius:14px;border:1px solid #d3d1c7;background:#fff;color:#888780;cursor:pointer">${p.q}</button>`).join('')}</div>`:''}
      <div style="display:flex;gap:8px">
        <input id="search-ai-q" style="flex:1;font-size:13px;padding:10px 14px;border-radius:8px;border:1px solid #d3d1c7;background:#fff;color:#1a1a1a;outline:none" placeholder="例如：台北有伴手禮的文章有哪些？" onkeydown="if(event.key==='Enter')runContentAI()">
        <button id="search-ai-btn" onclick="runContentAI()" style="font-size:12px;padding:10px 18px;border-radius:8px;border:1px solid #B5D4F4;background:#E6F1FB;color:#185FA5;cursor:pointer;font-weight:500;white-space:nowrap">AI 查詢</button>
      </div>
      <div id="search-ai-result" style="display:none;margin-top:12px;padding:12px 14px;background:#f5f5f3;border-radius:8px;font-size:12px;color:#1a1a1a;line-height:1.7"></div>
    </div>

    <div id="search-ai-filter-banner" style="display:none;background:#E6F1FB;border:1px solid #B5D4F4;border-radius:10px;padding:10px 14px;margin-bottom:1rem;display:none;align-items:center;justify-content:space-between">
      <span style="font-size:12px;color:#185FA5">🔍 目前僅顯示 AI 提到的文章</span>
      <button onclick="clearAIFilter()" style="font-size:11px;padding:3px 10px;border-radius:8px;border:1px solid #B5D4F4;background:#fff;color:#185FA5;cursor:pointer">顯示全部</button>
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
    <div id="s-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px"></div>`;
  injectFChipStyle();
  refreshSearchResults();
}

function injectFChipStyle(){
  if(document.getElementById('fchip-style')) return;
  const s=document.createElement('style');s.id='fchip-style';
  s.textContent=`.fchip{font-size:11px;padding:4px 10px;border-radius:14px;border:1px solid #d3d1c7;cursor:pointer;color:#888780;background:#fff}.fchip:hover{background:#f1efe8;color:#1a1a1a}.fchip.on{background:#185FA5;border-color:#185FA5;color:#fff}.fchip[data-group="season"].on{background:#3B6D11;border-color:#3B6D11}.fchip[data-group="has"].on{background:#0F6E56;border-color:#0F6E56}.fchip[data-group="theme"].on{background:#534AB7;border-color:#534AB7}.badge-ok{background:#EAF3DE;color:#3B6D11}.badge-warn{background:#FAEEDA;color:#854F0B}.badge-danger{background:#FCEBEB;color:#A32D2D}`;
  document.head.appendChild(s);
}
function toggleFChip(btn){
  const map={theme:activeThemes,region:activeRegions,season:activeSeasons,has:activeHas};
  const set=map[btn.dataset.group];
  if(set.has(btn.dataset.val)){set.delete(btn.dataset.val);btn.classList.remove('on');}
  else{set.add(btn.dataset.val);btn.classList.add('on');}
  refreshSearchResults();
}
function extractAITitles(text) { return contentArticles.filter(a=>a.title&&text.includes(a.title)).map(a=>a.id); }
function clearAIFilter(){
  aiFilteredIds=null;
  const banner=document.getElementById('search-ai-filter-banner');
  if(banner) banner.style.display='none';
  refreshSearchResults();
}
function filterContent(){
  const kl=((document.getElementById('f-kw')||{}).value||'').toLowerCase().trim();
  let base=aiFilteredIds!==null ?contentArticles.filter(a=>aiFilteredIds.includes(a.id)) :contentArticles;
  return base.filter(a=>{
    if(activeThemes.size&&![...activeThemes].some(t=>a.theme.includes(t))) return false;
    if(activeRegions.size&&![...activeRegions].some(r=>a.region.includes(r))) return false;
    if(activeSeasons.size&&![...activeSeasons].some(s=>a.season.includes(s))) return false;
    for(const h of activeHas){
      if(h==='店家'&&!a.hasStore) return false;
      if(h==='小吃'&&!a.hasSnack) return false;
      if(h==='伴手禮'&&!a.hasGift) return false;
      if(h==='景點'&&!a.hasSight) return false;
      if(h==='活動'&&!a.hasEvent) return false;
    }
    if(kl){const blob=[a.title,a.city,a.area,a.storeKw,a.snackKw,a.giftKw,a.sightKw,a.eventKw].join(' ').toLowerCase();if(!blob.includes(kl)) return false;}
    return true;
  });
}
function makeCard(a){
  const loc=[a.city,a.area].filter(Boolean).join(' ');
  const haves=[a.hasStore,a.hasSnack,a.hasGift,a.hasSight,a.hasEvent];
  const labels=['店家','小吃','伴手禮','景點','活動'];
  const haveStr=labels.filter((_,i)=>haves[i]).join(' · ')||'—';
  const preview=a.content?a.content.replace(/\\n/g,' ').replace(/\\s+/g,' ').trim().slice(0,55)+'…':'';
  return`<div onclick="openArticleModal(${a.id})"
    style="background:#fff;border:1px solid #e8e8e4;border-radius:12px;padding:1rem 1.125rem;cursor:pointer;display:flex;flex-direction:column;height:190px;box-sizing:border-box;overflow:hidden"
    onmouseover="this.style.borderColor='#185FA5';this.style.boxShadow='0 0 0 2px #E6F1FB'"
    onmouseout="this.style.borderColor='#e8e8e4';this.style.boxShadow='none'">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px;flex-shrink:0">
      <div style="font-size:13px;font-weight:500;color:#1a1a1a;line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${a.title}</div>
      ${a.year?`<span style="font-size:10px;padding:1px 7px;border-radius:8px;font-weight:500;background:#FAEEDA;color:#854F0B;flex-shrink:0;white-space:nowrap">${a.year}</span>`:''}
    </div>
    <div style="font-size:11px;color:#b4b2a9;line-height:1.5;flex:1;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;margin-bottom:8px">${preview}</div>
    <div style="flex-shrink:0">
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px">
        ${loc?`<span style="font-size:10px;padding:1px 7px;border-radius:7px;background:#f1efe8;color:#5F5E5A;font-weight:500">${loc}</span>`:''}
        ${a.region.map(r=>`<span style="font-size:10px;padding:1px 7px;border-radius:7px;background:#E6F1FB;color:#185FA5;font-weight:500">${r}</span>`).join('')}
        ${a.theme.slice(0,1).map(t=>`<span style="font-size:10px;padding:1px 7px;border-radius:7px;background:#EEEDFE;color:#3C3489;font-weight:500">${t}</span>`).join('')}
        ${a.season.slice(0,2).map(s=>`<span style="font-size:10px;padding:1px 7px;border-radius:7px;background:#EAF3DE;color:#3B6D11;font-weight:500">${s}</span>`).join('')}
      </div>
      <div style="font-size:10px;color:${haves.some(Boolean)?'#3B6D11':'#d3d1c7'};background:${haves.some(Boolean)?'#EAF3DE':'#f5f5f3'};padding:3px 8px;border-radius:6px;display:inline-block">
        ${haves.some(Boolean)?'✓ '+haveStr:'無特定資訊'}
      </div>
    </div>
  </div>`;
}
function refreshSearchResults(){
  const INIT_COUNT=8;
  const results=filterContent();
  const cnt=document.getElementById('s-count');
  if(cnt) cnt.innerHTML=`共 <strong style="color:#1a1a1a">${results.length}</strong> 篇${aiFilteredIds!==null?' <span style="font-size:10px;color:#185FA5">（AI篩選中）</span>':''}`;
  const grid=document.getElementById('s-grid');
  if(!grid) return;
  if(results.length===0){grid.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:40px 0;color:#b4b2a9;font-size:13px">沒有符合條件的文章</div>';return;}
  const visible=results.slice(0,INIT_COUNT),hidden=results.slice(INIT_COUNT);
  const hiddenId='search-hidden-grid';
  let hiddenHtml='';
  if(hidden.length>0){
    hiddenHtml=`<div style="grid-column:1/-1;margin-top:0">
      <div id="${hiddenId}" style="display:none">
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;margin-bottom:12px">${hidden.map(a=>makeCard(a)).join('')}</div>
      </div>
      <button id="search-expand-btn" onclick="toggleSearchExpand()"
        style="width:100%;padding:10px;border-radius:8px;border:1px solid #d3d1c7;background:#fff;color:#888780;font-size:12px;cursor:pointer">
        顯示更多 ${hidden.length} 篇結果
      </button>
    </div>`;
  }
  grid.innerHTML=visible.map(a=>makeCard(a)).join('')+hiddenHtml;
  window._searchExpanded=false;
  window.toggleSearchExpand=function(){
    const hg=document.getElementById(hiddenId),btn=document.getElementById('search-expand-btn');
    if(!hg||!btn) return;
    window._searchExpanded=!window._searchExpanded;
    hg.style.display=window._searchExpanded?'block':'none';
    btn.textContent=window._searchExpanded?'收合結果':`顯示更多 ${hidden.length} 篇結果`;
    btn.style.color=window._searchExpanded?'#185FA5':'#888780';
    btn.style.borderColor=window._searchExpanded?'#B5D4F4':'#d3d1c7';
  };
}
function clearSearch(){
  activeThemes.clear();activeRegions.clear();activeSeasons.clear();activeHas.clear();
  document.querySelectorAll('.fchip.on').forEach(b=>b.classList.remove('on'));
  const kw=document.getElementById('f-kw');if(kw) kw.value='';
  const aiQ=document.getElementById('search-ai-q');if(aiQ) aiQ.value='';
  const aiR=document.getElementById('search-ai-result');if(aiR) aiR.style.display='none';
  clearAIFilter();
}
function askContentAI(btn){const input=document.getElementById('search-ai-q');if(input) input.value=btn.dataset.q;runContentAI();}
async function runContentAI(){
  const input=document.getElementById('search-ai-q'),btn=document.getElementById('search-ai-btn'),res=document.getElementById('search-ai-result');
  if(!input||!btn||!res) return;
  const q=input.value.trim();if(!q) return;
  if(AI_CACHE.has(q)){res.style.display='block';res.innerHTML=AI_CACHE.get(q);const ids=AI_CACHE.get(q+'_ids');if(ids){aiFilteredIds=ids;const banner=document.getElementById('search-ai-filter-banner');if(banner) banner.style.display='flex';refreshSearchResults();}return;}
  btn.disabled=true;res.style.display='block';res.textContent='AI 比對資料庫中…';
  const GEMINI_KEY=window.__GEMINI_KEY__||localStorage.getItem('gemini_key')||'';
  if(!GEMINI_KEY){res.textContent='尚未設定 Gemini API Key，請點右上角齒輪圖示設定';btn.disabled=false;return;}
  const context=contentArticles.map(a=>`- 《${a.title}》｜${a.city||''}${a.area||''}｜主題:${a.theme.join('+')}｜地方:${a.region.join('+')}｜時令:${a.season.join('+')}｜`+(a.hasStore?`店家(${a.storeKw}) `:'')+( a.hasSnack?`小吃(${a.snackKw}) `:'')+( a.hasGift?`伴手禮(${a.giftKw}) `:'')+( a.hasSight?`景點(${a.sightKw}) `:'')+( a.hasEvent?`活動(${a.eventKw}) `:'')).join('\n');
  const MODELS=['gemini-2.0-flash','gemini-2.5-flash','gemini-2.0-flash-lite','gemini-2.5-flash-lite'];
  const prompt=`你是內容資料庫助理。根據以下 ${contentArticles.length} 篇文章清單，用繁體中文精確回答問題。列出相關文章時請直接顯示《文章標題》格式，若無符合文章請直接說明。\n\n【文章資料庫】\n${context}\n\n【問題】${q}`;
  let answered=false;
  for(const model of MODELS){
    try{
      const url=`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
      const resp=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}]})});
      const data=await resp.json();
      if(data.error){console.warn(model,data.error.code);continue;}
      const answer=data.candidates?.[0]?.content?.parts?.[0]?.text||'無法取得回答';
      const formatted=answer.replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>');
      res.innerHTML=formatted;
      if(AI_CACHE.size>=AI_CACHE_LIMIT) AI_CACHE.delete(AI_CACHE.keys().next().value);
      AI_CACHE.set(q,formatted);
      const ids=extractAITitles(answer);
      if(ids.length>0){
        aiFilteredIds=ids;
        AI_CACHE.set(q+'_ids',ids);
        const banner=document.getElementById('search-ai-filter-banner');
        if(banner){banner.style.display='flex';}
        refreshSearchResults();
      }
      answered=true;break;
    }catch(e){console.warn(model,e.message);}
  }
  if(!answered) res.textContent='所有模型今日額度已滿，請明天再試。';
  btn.disabled=false;
}

// ===== 分頁六：資料庫統計視覺化 =====
function renderDbStats(){
  let dbFilter='all';
  const el=document.getElementById('view-dbstats');
  el.innerHTML=`
    <div style="background:#fff;border:1px solid #e8e8e4;border-radius:12px;padding:1rem 1.25rem;margin-bottom:1rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:12px;color:#888780;font-weight:500">資料範圍</span>
        <button id="db-btn-all" onclick="setDbFilter('all')"
          style="padding:6px 18px;font-size:12px;border-radius:20px;cursor:pointer;border:2px solid #185FA5;background:#185FA5;color:#fff;font-weight:500">
          全資料庫
        </button>
        <button id="db-btn-pub" onclick="setDbFilter('pub')"
          style="padding:6px 18px;font-size:12px;border-radius:20px;cursor:pointer;border:2px solid #d3d1c7;background:#fff;color:#888780;font-weight:400">
          已上架
        </button>
      </div>
      <div id="db-total-badge" style="font-size:12px;color:#1a1a1a;font-weight:500"></div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
      <div class="kpi-block">
        <div class="kpi-header"><span class="kpi-title">五大主題分布</span><span class="kpi-meta" id="db-theme-meta"></span></div>
        <div class="chart-wrap" style="height:220px"><canvas id="db-theme-chart"></canvas></div>
        <div id="db-theme-list" style="margin-top:10px"></div>
      </div>
      <div class="kpi-block">
        <div class="kpi-header"><span class="kpi-title">地方探索分布</span></div>
        <div class="chart-wrap" style="height:220px"><canvas id="db-region-chart"></canvas></div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
      <div class="kpi-block">
        <div class="kpi-header"><span class="kpi-title">時令探索分布</span></div>
        <div class="chart-wrap" style="height:180px"><canvas id="db-season-chart"></canvas></div>
      </div>
      <div class="kpi-block">
        <div class="kpi-header"><span class="kpi-title">子目錄分布</span><span class="kpi-meta">獨立維度</span></div>
        <div class="chart-wrap" style="height:180px"><canvas id="db-subdir-chart"></canvas></div>
      </div>
    </div>

    <div class="kpi-block">
      <div class="kpi-header"><span class="kpi-title">子目錄結構明細</span><span class="kpi-meta" id="db-subdir-meta"></span></div>
      <div id="db-subdir-table"></div>
    </div>`;

  window.setDbFilter=function(f){
    dbFilter=f;
    const btnAll=document.getElementById('db-btn-all'),btnPub=document.getElementById('db-btn-pub');
    if(btnAll){btnAll.style.background=f==='all'?'#185FA5':'#fff';btnAll.style.color=f==='all'?'#fff':'#888780';btnAll.style.borderColor=f==='all'?'#185FA5':'#d3d1c7';}
    if(btnPub){btnPub.style.background=f==='pub'?'#1D9E75':'#fff';btnPub.style.color=f==='pub'?'#fff':'#888780';btnPub.style.borderColor=f==='pub'?'#1D9E75':'#d3d1c7';}
    updateDbCharts();
  };

  function updateDbCharts(){
    const base=dbFilter==='pub'?contentArticles.filter(a=>a.dateZh):contentArticles;
    const total=base.length;
    const badge=document.getElementById('db-total-badge');
    if(badge) badge.textContent=dbFilter==='pub'?`已上架：${total} 篇`:`全資料庫：${total} 篇`;

    const themeMeta=document.getElementById('db-theme-meta');
    if(themeMeta) themeMeta.textContent=`${total} 篇中的佔比`;
    const getArr=(a,k)=>{
      if(!a[k]) return [];
      if(Array.isArray(a[k])) return a[k];
      return a[k].split(/[,，、|\/\\]/).map(s=>s.trim()).filter(Boolean);
    };
    const themeCounts=THEMES.map(t=>base.filter(a=>getArr(a,'theme').includes(t)).length);
    const themeList=document.getElementById('db-theme-list');
    if(themeList){
      themeList.innerHTML=THEMES.map((t,i)=>`
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
          <div style="width:10px;height:10px;border-radius:2px;background:${THEME_COLORS[i]};flex-shrink:0"></div>
          <div style="font-size:11px;color:#1a1a1a;flex:1">${t}</div>
          <div style="font-size:11px;font-weight:500;color:${THEME_COLORS[i]}">${themeCounts[i]}</div>
          <div style="font-size:10px;color:#888780">${pct(themeCounts[i],total)}%</div>
        </div>
        ${pgBar(pct(themeCounts[i],total),THEME_COLORS[i])}`).join('');
    }
    if(dbThemeChart) dbThemeChart.destroy();
    dbThemeChart=new Chart(document.getElementById('db-theme-chart').getContext('2d'),{
      type:'doughnut',
      data:{labels:THEMES,datasets:[{data:themeCounts,backgroundColor:THEME_COLORS,borderWidth:2,borderColor:'#fff'}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.label}: ${c.raw} 篇 (${pct(c.raw,total)}%)`}}}}
    });

    const regionCounts=REGIONS.map(r=>base.filter(a=>getArr(a,'region').includes(r)).length);
    if(dbRegionChart) dbRegionChart.destroy();
    dbRegionChart=new Chart(document.getElementById('db-region-chart').getContext('2d'),{
      type:'bar',
      data:{labels:REGIONS,datasets:[{data:regionCounts,backgroundColor:REGION_COLORS,borderWidth:0}]},
      options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.raw} 篇 (${pct(c.raw,total)}%)`}}},
        scales:{x:{grid:{color:'rgba(136,135,128,0.12)'},ticks:{color:'#888780',font:{size:10}}},y:{grid:{display:false},ticks:{color:'#888780',font:{size:11}}}}}
    });

    // season 可能存為陣列或以逗號分隔的字串，兩種都支援
    const getSeason=(a)=>{
      if(!a.season) return [];
      if(Array.isArray(a.season)) return a.season;
      return a.season.split(/[,，、|\/\\]/).map(s=>s.trim()).filter(Boolean);
    };
    const seasonCounts=SEASONS.map(s=>base.filter(a=>getSeason(a).includes(s)).length);
    if(dbSeasonChart) dbSeasonChart.destroy();
    dbSeasonChart=new Chart(document.getElementById('db-season-chart').getContext('2d'),{
      type:'bar',
      data:{labels:SEASONS,datasets:[{data:seasonCounts,backgroundColor:SEASON_COLORS,borderWidth:0}]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.raw} 篇 (${pct(c.raw,total)}%)`}}},
        scales:{x:{grid:{display:false},ticks:{color:'#888780',font:{size:11}}},y:{grid:{color:'rgba(136,135,128,0.12)'},ticks:{color:'#888780',font:{size:10}},min:0}}}
    });

    const subdirMap={};
    base.forEach(a=>{getArr(a,'subDir').forEach(s=>{if(s){subdirMap[s]=(subdirMap[s]||0)+1;}});});
    const subdirEntries=Object.entries(subdirMap).sort((a,b)=>b[1]-a[1]);
    const subdirLabels=subdirEntries.map(([k])=>k);
    const subdirVals=subdirEntries.map(([,v])=>v);
    const subdirMeta=document.getElementById('db-subdir-meta');
    if(subdirMeta) subdirMeta.textContent=`共 ${subdirLabels.length} 個子目錄`;
    const chartH=Math.max(180,subdirLabels.length*30+60);
    document.getElementById('db-subdir-chart').parentElement.style.height=chartH+'px';
    if(dbSubdirChart) dbSubdirChart.destroy();
    if(subdirLabels.length>0){
      dbSubdirChart=new Chart(document.getElementById('db-subdir-chart').getContext('2d'),{
        type:'bar',
        data:{labels:subdirLabels,datasets:[{data:subdirVals,backgroundColor:'#7F77DD',borderWidth:0}]},
        options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.raw} 篇 (${pct(c.raw,total)}%)`}}},
          scales:{x:{grid:{color:'rgba(136,135,128,0.12)'},ticks:{color:'#888780',font:{size:10}}},y:{grid:{display:false},ticks:{color:'#888780',font:{size:10}}}}}
      });
    } else {
      const ctx=document.getElementById('db-subdir-chart').getContext('2d');
      ctx.font='12px sans-serif';ctx.fillStyle='#b4b2a9';ctx.textAlign='center';
      ctx.fillText('尚無子目錄資料',ctx.canvas.width/2,50);
    }

    const subdirTable=document.getElementById('db-subdir-table');
    if(subdirTable&&subdirEntries.length>0){
      subdirTable.innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">
        ${subdirEntries.map(([name,count])=>`
          <div style="padding:.75rem;background:#f9f9f7;border-radius:8px;border:1px solid #f1efe8;display:flex;justify-content:space-between;align-items:center">
            <div style="font-size:12px;color:#1a1a1a">${name}</div>
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:13px;font-weight:500;color:#534AB7">${count}</span>
              <span style="font-size:10px;color:#888780">${pct(count,total)}%</span>
            </div>
          </div>`).join('')}
      </div>`;
    } else if(subdirTable){
      subdirTable.innerHTML='<div style="text-align:center;padding:1.5rem;font-size:12px;color:#b4b2a9">尚無子目錄資料，請在 Excel 內容管理中填入「子目錄」欄位後執行 sync_content.py</div>';
    }
  }
  updateDbCharts();
}

// ===== 文章詳情 & 後台 Modal =====
function formatContent(raw){
  if(!raw) return'<p style="color:#b4b2a9">（無內文）</p>';
  const cleaned=raw.replace(/\r\n/g,'\n').replace(/\r/g,'\n').trim();
  let paras=cleaned.split(/\n{2,}/);
  if(paras.length<=1){
    paras=cleaned.replace(/([。！？!?])/g,'$1\n').split('\n').map(s=>s.trim()).filter(s=>s.length>0);
    const merged=[];let buf='';
    for(const s of paras){buf+=s;if(buf.length>=60){merged.push(buf);buf='';}}
    if(buf) merged.push(buf);
    paras=merged.length>0?merged:[cleaned];
  }
  return paras.map(p=>p.trim()).filter(p=>p.length>0)
    .map(p=>`<p style="margin:0 0 1.1em 0;font-size:15px;color:#1a1a1a;line-height:1.9;text-align:justify">${p}</p>`).join('');
}

function openArticleModal(id){
  const a=contentArticles.find(x=>x.id===id);if(!a) return;
  const hasList=[{has:a.hasStore,label:'店家',kw:a.storeKw},{has:a.hasSnack,label:'小吃',kw:a.snackKw},{has:a.hasGift,label:'伴手禮',kw:a.giftKw},{has:a.hasSight,label:'景點',kw:a.sightKw},{has:a.hasEvent,label:'活動',kw:a.eventKw}].filter(h=>h.has);
  const overlay=document.createElement('div');
  overlay.id='article-modal-overlay';
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:flex-start;justify-content:center;padding:32px 16px;overflow-y:auto';
  overlay.onclick=e=>{if(e.target===overlay) closeArticleModal();};
  const rColors={'北部':'background:#E6F1FB;color:#185FA5','中部':'background:#EAF3DE;color:#3B6D11','南部':'background:#FAEEDA;color:#854F0B','東部':'background:#E1F5EE;color:#0F6E56','離島':'background:#EEEDFE;color:#3C3489'};
  overlay.innerHTML=`
    <div style="background:#fff;border-radius:16px;width:100%;max-width:700px;box-shadow:0 24px 64px rgba(0,0,0,0.18);overflow:hidden">
      <div style="padding:28px 32px 22px;border-bottom:1.5px solid #f1efe8;position:sticky;top:0;background:#fff;z-index:1">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:14px">
          <h2 style="font-size:20px;font-weight:500;color:#1a1a1a;line-height:1.5;flex:1;margin:0">${a.title}</h2>
          <button onclick="closeArticleModal()" style="width:32px;height:32px;border-radius:50%;border:1px solid #e8e8e4;background:#f5f5f3;cursor:pointer;font-size:18px;color:#888780;flex-shrink:0;line-height:1;padding:0">×</button>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:${hasList.length>0?'12px':'0'}">
          ${a.year?`<span style="font-size:11px;padding:3px 10px;border-radius:10px;font-weight:500;background:#FAEEDA;color:#854F0B">${a.year}</span>`:''}
          ${a.city||a.area?`<span style="font-size:11px;padding:3px 10px;border-radius:10px;font-weight:500;background:#f1efe8;color:#5F5E5A">${[a.city,a.area].filter(Boolean).join(' · ')}</span>`:''}
          ${a.region.map(r=>`<span style="font-size:11px;padding:3px 10px;border-radius:10px;font-weight:500;${rColors[r]||'background:#f1efe8;color:#888780'}">${r}</span>`).join('')}
          ${a.theme.map(t=>`<span style="font-size:11px;padding:3px 10px;border-radius:10px;font-weight:500;background:#EEEDFE;color:#3C3489">${t}</span>`).join('')}
          ${a.season.map(s=>`<span style="font-size:11px;padding:3px 10px;border-radius:10px;font-weight:500;background:#EAF3DE;color:#3B6D11">${s}</span>`).join('')}
          ${(a.subDir||[]).map(d=>`<span style="font-size:11px;padding:3px 10px;border-radius:10px;font-weight:500;background:#f1efe8;color:#5F5E5A">${d}</span>`).join('')}
        </div>
        ${hasList.length>0?`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:6px">
          ${hasList.map(h=>`<div style="background:#f9f9f7;border:1px solid #e8e8e4;border-radius:8px;padding:7px 10px">
            <div style="font-size:10px;font-weight:500;color:#888780;margin-bottom:3px">${h.label}</div>
            <div style="font-size:11px;color:#1a1a1a;line-height:1.4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h.kw||'—'}</div>
          </div>`).join('')}
        </div>`:''}
      </div>
      <div style="padding:28px 32px 36px;max-height:60vh;overflow-y:auto">
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto">
          ${formatContent(a.content)}
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.body.style.overflow='hidden';
}
function closeArticleModal(){const el=document.getElementById('article-modal-overlay');if(el) el.remove();document.body.style.overflow='';}

// ★ 更新：移除了 live-zh, live-en 相關的勾選邏輯
function openModal(id){
  editingId=id;const m=id?articles.find(a=>a.id===id):null;
  document.getElementById('modal-title').textContent=id?'編輯文章':'新增文章';
  const mY=document.getElementById('m-year');
  if(mY) mY.innerHTML=(config.years||[]).map(y=>`<option${(m?m.year:FIXED_YEAR)===y?' selected':''}>${y}</option>`).join('');
  document.getElementById('m-title').value=m?m.title:'';
  document.getElementById('m-status').value=m?m.status:'審稿/校稿';
  document.getElementById('m-q').value=m?m.q:'Q1';
  document.getElementById('m-date-zh').value=m?m.dateZh:'';
  document.getElementById('m-date-en').value=m?m.dateEn:'';
  document.getElementById('ops-modal').classList.add('open');
}
function closeModal(){document.getElementById('ops-modal').classList.remove('open');}
function saveArticle(){
  const title=document.getElementById('m-title').value.trim();if(!title) return;
  const data={year:document.getElementById('m-year').value,title,status:document.getElementById('m-status').value,q:document.getElementById('m-q').value,dateZh:document.getElementById('m-date-zh').value,dateEn:document.getElementById('m-date-en').value};
  if(editingId){const i=articles.findIndex(a=>a.id===editingId);articles[i]={...articles[i],...data};}
  else articles.push({id:Date.now(),...data});
  closeModal();renderOps();
}
// ★ 更新：CSV 匯出也不再包含勾選欄位
function exportCSV(){
  const base=opsYear==='all'?articles:articles.filter(a=>a.year===opsYear);
  const rows=[['年份','標題','狀態','季度','中文上架日','英文上架日']];
  base.forEach(a=>rows.push([a.year,a.title,a.status,a.q,a.dateZh,a.dateEn]));
  const csv=rows.map(r=>r.map(c=>`"${c}"`).join(',')).join('\n');
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`articles_${opsYear}.csv`;a.click();
}