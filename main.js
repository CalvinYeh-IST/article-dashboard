// ============================================================
//  IST 內容進度控管系統 - main.js  v6.0
//  重構日期：2026-04-15
//  資料真理：dateZh 有值 = 中文已上架，dateEn 有值 = 英文已上架
// ============================================================

// ===== 【A】全域常數 =====
const QS          = ['Q1','Q2','Q3','Q4'];
const FIXED_YEAR  = '2026';
const THEMES      = ['文化美食','自然生態','常民生活','藝術文化','綜覽台灣'];
const REGIONS     = ['北部','中部','南部','東部','離島'];
const SEASONS     = ['春','夏','秋','冬'];
const HAS_OPTS    = ['店家','小吃','伴手禮','景點','活動'];

// IST 設計色票
const C_ORANGE    = '#C8621E';   // 中文稿主色 / 品牌橘
const C_DARK      = '#2D2D2D';   // 英文稿主色 / 深灰
const C_EN_CHART  = '#1D9E75';   // 英文稿圖表色（綠，可辨識性）
const C_GRAY_FILL = '#B4B2A9';   // 全資料庫 grouped bar
const C_EDGE      = '#E2E0DC';
const C_BG        = '#F8F7F5';
const C_SURF      = '#F2F1EE';

// ===== 【B】全域狀態 =====
let articles=[], config={}, summary={}, weeklyData={}, contentArticles=[], contentSummary={};
let opsYear='all', currentTab='exec', editingId=null;
let aiFilteredIds=null;
let activeThemes=new Set(), activeRegions=new Set(), activeSeasons=new Set(), activeHas=new Set();
let execChart=null, trendChart=null;
let dbThemeChart=null, dbRegionChart=null, dbSeasonChart=null, dbSubdirChart=null;
const AI_CACHE=new Map(), AI_CACHE_LIMIT=30;

// ===== 【C】資料載入 =====
document.getElementById('date-label').textContent =
  '截至 ' + new Date().toLocaleDateString('zh-TW',{year:'numeric',month:'long',day:'numeric'});

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
  document.getElementById('app').innerHTML =
    `<div class="error-screen">資料載入失敗：${err.message}<br>請確認 data.json 與 config.json 存在。</div>`;
});

// ===== 【D】初始化與分頁框架 =====
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

// ===== 【E】通用工具函式 =====

/** 百分比計算，分母為 0 時回傳 0 */
function pct(a,t){return t>0?Math.round(a/t*100):0;}

/** 達成率 badge（HTML span） */
function pill(p){
  const c=p>=100?'pct-ok':p>=60?'pct-warn':'pct-danger';
  return `<span class="pct-pill ${c}">${p}%</span>`;
}

/** 進度條 HTML */
function pgBar(p,color,h){
  h=h||'6px';
  return `<div style="height:${h};background:${C_SURF};border-radius:0;overflow:hidden;margin-top:4px">
    <div style="height:100%;width:${Math.min(100,p)}%;background:${color};transition:width .4s"></div>
  </div>`;
}

/** 百分比對應顏色（達標=深灰、接近=黃、落後=紅） */
function pctColor(p){return p>=100?'#1A6B45':p>=80?'#A35200':'#B91C1C';}

/** 達標狀態背景色 */
function pctBg(p){return p>=100?'#D1FAE5':p>=80?'#FEF3C7':'#FEE2E2';}

/** 達標文字 */
function pctText(p){return p>=100?'達標':p>=80?'接近':'落後';}

/** 取陣列欄位（相容 Array 或逗號字串） */
function getArr(a,k){
  if(!a[k]) return [];
  if(Array.isArray(a[k])) return a[k];
  return a[k].split(/[,，、|/\\]/).map(s=>s.trim()).filter(Boolean);
}

/**
 * 判斷日期欄位是否為有效上架日
 * content.json 未上架的 dateEn 常見填法："-"、"--"、"—"、"N/A"、空字串
 * 規則：有內容、長度 >= 6、不是純符號佔位
 */
function hasDate(d){
  if(!d) return false;
  const s = String(d).trim();
  if(s.length < 6) return false;
  if(/^[-—–/\ Na]+$/.test(s)) return false;  // 排除 "-"、"--"、"N/A" 等佔位
  return true;
}

/** ISO 週次計算 */
function getISOWeek(d){
  const date=new Date(d.getTime());
  date.setHours(0,0,0,0);
  date.setDate(date.getDate()+3-(date.getDay()+6)%7);
  const week1=new Date(date.getFullYear(),0,4);
  return 1+Math.round(((date.getTime()-week1.getTime())/86400000-3+(week1.getDay()+6)%7)/7);
}

/** 週次字串 → 日期範圍文字（例：4/1–4/7） */
function weekDateRange(weekStr){
  const parts=weekStr.split('-W');
  if(parts.length<2) return weekStr;
  const yr=parseInt(parts[0]),wk=parseInt(parts[1]);
  const jan4=new Date(yr,0,4);
  const startDay=jan4.getDate()-(jan4.getDay()||7)+1+(wk-1)*7;
  const start=new Date(yr,0,startDay),end=new Date(yr,0,startDay+6);
  const fmt=d=>`${d.getMonth()+1}/${d.getDate()}`;
  return `${fmt(start)}–${fmt(end)}`;
}

// ===== 【F】KPI 計算核心 =====

/**
 * 從 articles 陣列計算 KPI 達成數，依上架日期分配季度
 * lzQ = 中文落在 targetYear 的已上架數（by 季）
 * leQ = 英文落在 targetYear 的已上架數（by 季）
 */
function getKpiStats(arts, targetYear){
  const lzQ={Q1:0,Q2:0,Q3:0,Q4:0};
  const leQ={Q1:0,Q2:0,Q3:0,Q4:0};
  arts.forEach(a=>{
    if(hasDate(a.dateZh) && a.dateZh.startsWith(targetYear)){
      const q='Q'+Math.ceil((new Date(a.dateZh).getMonth()+1)/3);
      if(lzQ[q]!==undefined) lzQ[q]++;
    }
    if(hasDate(a.dateEn) && a.dateEn.startsWith(targetYear)){
      const q='Q'+Math.ceil((new Date(a.dateEn).getMonth()+1)/3);
      if(leQ[q]!==undefined) leQ[q]++;
    }
  });
  return{lzQ,leQ};
}

/**
 * 渲染 KPI 季度進度區塊（長官版使用）
 * lang: 'zh' | 'en'
 */
function kpiBlock(lang,stats,elId){
  const kpi=config.kpi[FIXED_YEAR][lang];
  const isZh=(lang==='zh');
  const liveByQ=isZh?stats.lzQ:stats.leQ;
  const totalT=Object.values(kpi).reduce((a,b)=>a+b,0);
  const totalL=Object.values(liveByQ).reduce((a,b)=>a+b,0);
  const color=isZh?C_ORANGE:'#3D3D3D';
  const rows=QS.map(q=>{
    const t=kpi[q],l=liveByQ[q]||0;
    const lp=Math.min(100,pct(l,t));
    return`<div class="progress-row">
      <span class="p-label">${q} / ${t}</span>
      <div class="p-track"><div class="p-ac" style="width:${lp}%;background:${color}"></div></div>
      <div class="p-nums">已上架 <strong style="color:${color}">${l}</strong></div>
      ${pill(pct(l,t))}
    </div>`;
  }).join('');
  document.getElementById(elId).innerHTML=`
    <div class="kpi-header">
      <span class="kpi-title">${isZh?'中文稿 ·':'英譯稿 ·'} ${FIXED_YEAR} KPI</span>
      <span class="kpi-meta">全年目標 ${totalT} 篇｜已上架 ${totalL} 篇（${pct(totalL,totalT)}%）</span>
    </div>
    ${rows}
    <div class="legend-row"><span><span class="ld" style="background:${color}"></span>已上架</span></div>`;
}

/**
 * 計算折線圖的月累計資料
 * 重構：未來月份填 null，折線只畫到當前月份
 */
function buildCumDataByYear(lang,arts,targetYear){
  const kpi=config.kpi[targetYear][lang];
  const nowMonth=new Date().getMonth(); // 0-indexed，當月為止
  const lbm=Array(12).fill(0);
  arts.forEach(a=>{
    const ds=lang==='zh'?a.dateZh:a.dateEn;
    if(hasDate(ds)&&ds.startsWith(targetYear)){
      const m=new Date(ds).getMonth();
      if(m>=0&&m<12) lbm[m]++;
    }
  });
  // 累積實際，未來月份 = null（讓折線停在當月）
  const cumA=[];let s=0;
  lbm.forEach((v,i)=>{
    s+=v;
    cumA.push(i<=nowMonth?s:null);
  });
  // 目標線（全年均攤，不填 null，讓目標線完整顯示）
  const cumT=[];let ts=0;
  QS.forEach(q=>{
    const pm=kpi[q]/3;
    [0,1,2].forEach(()=>{ts+=pm;cumT.push(Math.round(ts));});
  });
  return{cumA,cumT};
}

/** 後台年份切換器 */
function buildOpsYearTabs(){
  const el=document.getElementById('ops-year-bar');
  if(!el) return;
  const allYears=['all',...(config.years||[])];
  el.innerHTML=`<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
    <span style="font-size:12px;color:#6B6B6B;margin-right:4px">年份篩選</span>
    ${allYears.map(y=>`<button onclick="setOpsYear('${y}')" id="opsyr-${y}"
      style="padding:5px 14px;font-size:12px;border-radius:2px;cursor:pointer;border:1px solid ${C_EDGE};
      background:${y===opsYear?C_ORANGE:'#fff'};color:${y===opsYear?'#fff':'#6B6B6B'};
      font-weight:${y===opsYear?'500':'400'}">${y==='all'?'全部':y}</button>`).join('')}
  </div>`;
}
function setOpsYear(y){opsYear=y;buildOpsYearTabs();renderOps();}

// ===== 【1】分頁一：長官報告版 =====
function renderExec(){
  const arts=articles;
  const total=arts.length;
  const cnPub=arts.filter(a=>hasDate(a.dateZh)).length;
  const enPub=arts.filter(a=>hasDate(a.dateEn)).length;
  const unpub=total-cnPub;
  const statusCounts={
    '待上架':arts.filter(a=>!hasDate(a.dateZh)&&a.status==='待上架').length,
    '待改稿':arts.filter(a=>!hasDate(a.dateZh)&&a.status==='待改稿').length,
    '待初審':arts.filter(a=>!hasDate(a.dateZh)&&a.status==='待初審').length,
  };

  document.getElementById('view-exec').innerHTML=`
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:1.25rem">
      <span style="font-size:12px;padding:3px 14px;border-radius:2px;background:${C_ORANGE};color:#fff;font-weight:500">${FIXED_YEAR}</span>
      <span style="font-size:11px;color:#9A9A96">長官報告版 · 固定顯示當年度</span>
    </div>

    <!-- 總指標橫幅 -->
    <div style="background:#fff;border:1px solid ${C_EDGE};padding:1.25rem 1.5rem;margin-bottom:1rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
      <div>
        <div style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#6B6B6B;margin-bottom:6px">全資料庫總文章數</div>
        <div style="font-size:52px;font-weight:300;color:#1C1C1C;line-height:1;letter-spacing:-.02em">${total}</div>
        <div style="font-size:11px;color:#9A9A96;margin-top:4px">歷年累積 · 含所有狀態</div>
      </div>
      <div style="display:flex;gap:10px">
        <div style="text-align:center;padding:10px 18px;background:${C_BG};border:1px solid ${C_EDGE}">
          <div style="font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:#6B6B6B;margin-bottom:5px">中文稿上架</div>
          <div style="font-size:28px;font-weight:300;color:${C_ORANGE};letter-spacing:-.01em">${cnPub}</div>
          <div style="font-size:10px;color:#9A9A96;margin-top:3px">${pct(cnPub,total)}%</div>
        </div>
        <div style="text-align:center;padding:10px 18px;background:${C_BG};border:1px solid ${C_EDGE}">
          <div style="font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:#6B6B6B;margin-bottom:5px">英譯稿上架</div>
          <div style="font-size:28px;font-weight:300;color:${C_DARK};letter-spacing:-.01em">${enPub}</div>
          <div style="font-size:10px;color:#9A9A96;margin-top:3px">${pct(enPub,total)}%</div>
        </div>
      </div>
    </div>

    <!-- 已上架 / 未上架 -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
      <div style="background:#FBF0E8;border:1px solid #EDB896;padding:1.25rem">
        <div style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:${C_ORANGE};margin-bottom:8px">已上架文章</div>
        <div style="font-size:40px;font-weight:300;color:${C_ORANGE};line-height:1;margin-bottom:14px;letter-spacing:-.02em">${cnPub}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div style="background:rgba(255,255,255,0.8);padding:.875rem">
            <div style="font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:${C_ORANGE};margin-bottom:4px">中文稿</div>
            <div style="font-size:24px;font-weight:300;color:${C_ORANGE}">${cnPub}</div>
            <div style="font-size:10px;color:#9C4A12;margin-top:3px">有中文上架日期</div>
          </div>
          <div style="background:rgba(255,255,255,0.8);padding:.875rem">
            <div style="font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#1A6B45;margin-bottom:4px">英譯稿</div>
            <div style="font-size:24px;font-weight:300;color:#1A6B45">${enPub}</div>
            <div style="font-size:10px;color:#1A6B45;margin-top:3px">有英文上架日期</div>
          </div>
        </div>
      </div>
      <div style="background:#FEF3C7;border:1px solid #FDE68A;padding:1.25rem">
        <div style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#A35200;margin-bottom:8px">未上架文章</div>
        <div style="font-size:40px;font-weight:300;color:#A35200;line-height:1;margin-bottom:8px;letter-spacing:-.02em">${unpub}</div>
        <div style="font-size:10px;color:#A35200;margin-bottom:10px">= 總數 ${total} − 中文稿上架 ${cnPub}</div>
        <div style="display:flex;flex-direction:column;gap:5px">
          ${Object.entries(statusCounts).map(([s,n])=>n>0?`
            <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.7);padding:6px 10px">
              <span style="font-size:11px;color:#A35200">${s}</span>
              <span style="font-size:13px;font-weight:500;color:#A35200">${n} 篇</span>
            </div>`:'').join('')}
          ${statusCounts['待上架']+statusCounts['待改稿']+statusCounts['待初審']<unpub?`
            <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.5);padding:6px 10px">
              <span style="font-size:11px;color:#6B6B6B">其他</span>
              <span style="font-size:13px;font-weight:500;color:#6B6B6B">${unpub-statusCounts['待上架']-statusCounts['待改稿']-statusCounts['待初審']} 篇</span>
            </div>`:''}
        </div>
      </div>
    </div>

    <!-- KPI 進度 -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
      <div class="kpi-block" id="exec-kpi-zh"></div>
      <div class="kpi-block" id="exec-kpi-en"></div>
    </div>

    <!-- 折線圖（未來月份填 null，折線停在當月） -->
    <div class="kpi-block">
      <div class="kpi-header">
        <span class="kpi-title">${FIXED_YEAR} 全年累積上架進度</span>
        <span class="kpi-meta">實際累積 vs 目標進度線 · 未來月份不顯示</span>
      </div>
      <div class="chart-wrap" style="height:240px"><canvas id="exec-chart"></canvas></div>
    </div>
    <div class="watermark">資料更新：${new Date().toLocaleDateString('zh-TW')} · 來源：進度管理 Excel</div>`;

  const kpiStats=getKpiStats(articles,FIXED_YEAR);
  kpiBlock('zh',kpiStats,'exec-kpi-zh');
  kpiBlock('en',kpiStats,'exec-kpi-en');

  // ★ 重構：未來月份填 null，折線圖只畫到當月
  const dZh=buildCumDataByYear('zh',articles,FIXED_YEAR);
  const dEn=buildCumDataByYear('en',articles,FIXED_YEAR);

  if(execChart) execChart.destroy();
  execChart=new Chart(document.getElementById('exec-chart').getContext('2d'),{
    type:'line',
    data:{
      labels:['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
      datasets:[
        {label:'中文稿目標',data:dZh.cumT,borderColor:'#EDB896',borderDash:[4,4],
         borderWidth:1.5,pointRadius:0,fill:false,tension:0,spanGaps:false},
        {label:'英譯稿目標',data:dEn.cumT,borderColor:'#B4B2A9',borderDash:[4,4],
         borderWidth:1.5,pointRadius:0,fill:false,tension:0,spanGaps:false},
        {label:'中文稿實際',data:dZh.cumA,borderColor:C_ORANGE,
         backgroundColor:'rgba(200,98,30,0.07)',borderWidth:2.5,
         pointRadius:4,pointBackgroundColor:C_ORANGE,fill:true,tension:0.2,spanGaps:false},
        {label:'英譯稿實際',data:dEn.cumA,borderColor:'#3D3D3D',
         backgroundColor:'rgba(50,50,50,0.04)',borderWidth:2.5,
         pointRadius:4,pointBackgroundColor:'#3D3D3D',fill:true,tension:0.2,spanGaps:false},
      ]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{
        legend:{display:true,position:'top',
          labels:{font:{size:11},color:'#6B6B6B',boxWidth:18,padding:16}},
        tooltip:{mode:'index',intersect:false,
          backgroundColor:'#1C1C1C',titleColor:'#fff',bodyColor:'rgba(255,255,255,0.75)',
          cornerRadius:0,padding:10,
          callbacks:{label:c=>` ${c.dataset.label}：${c.raw!==null?c.raw+'篇':'—'}` }}
      },
      scales:{
        x:{grid:{display:false},ticks:{color:'#9A9A96',font:{size:11}},
           title:{display:true,text:'月份',color:'#9A9A96',font:{size:10}}},
        y:{grid:{color:'rgba(0,0,0,0.05)'},ticks:{color:'#9A9A96',font:{size:11},stepSize:20},
           min:0,title:{display:true,text:'累計篇數',color:'#9A9A96',font:{size:10}}}
      }
    }
  });
}

// ===== 【2】分頁二：主管報告版 =====

/**
 * 從 articles 直接計算月別達標率（強制從 1 月到當前月，即使為 0 也顯示）
 * 不依賴 weekly.json
 */
function getMonthlyStatsFromArticles(arts,year){
  const kpi=config.kpi[year];
  const nowMonth=new Date().getMonth()+1; // 1-indexed
  const result=[];
  for(let mo=1;mo<=nowMonth;mo++){
    const moStr=String(mo).padStart(2,'0');
    const prefix=`${year}-${moStr}`;
    const cnAct=arts.filter(a=>hasDate(a.dateZh)&&a.dateZh.startsWith(prefix)).length;
    const enAct=arts.filter(a=>hasDate(a.dateEn)&&a.dateEn.startsWith(prefix)).length;
    // 月目標 = 季度目標 / 3（均攤）
    const q='Q'+Math.ceil(mo/3);
    const cnPlan=Math.round((kpi.zh[q]||0)/3);
    const enPlan=Math.round((kpi.en[q]||0)/3);
    result.push({
      key:prefix,label:`${mo}月`,
      cnAct,enAct,cnPlan,enPlan,
      cnAchieve:pct(cnAct,cnPlan),
      enAchieve:pct(enAct,enPlan),
    });
  }
  return result;
}

function renderMgr(){
  const weeks=(weeklyData.weeks||[]).filter(w=>w.week.startsWith(FIXED_YEAR));
  const arts=articles;
  const today=new Date(); today.setHours(0,0,0,0);

  // ★ 重構：全部從 articles 動態計算，不依賴 weekly.json
  const kpi=config.kpi[FIXED_YEAR];
  const totalTZh=Object.values(kpi.zh).reduce((a,b)=>a+b,0);
  const totalTEn=Object.values(kpi.en).reduce((a,b)=>a+b,0);
  // 全年已上架數
  const totalLZh=arts.filter(a=>hasDate(a.dateZh)&&a.dateZh.startsWith(FIXED_YEAR)).length;
  const totalLEn=arts.filter(a=>hasDate(a.dateEn)&&a.dateEn.startsWith(FIXED_YEAR)).length;

  // 本季
  const nowMonth=new Date().getMonth()+1;
  const nowQ='Q'+Math.ceil(nowMonth/3);
  const qTZh=kpi.zh[nowQ]||0, qTEn=kpi.en[nowQ]||0;
  const qLZh=arts.filter(a=>{
    if(!hasDate(a.dateZh)||!a.dateZh.startsWith(FIXED_YEAR)) return false;
    return 'Q'+Math.ceil((new Date(a.dateZh).getMonth()+1)/3)===nowQ;
  }).length;
  const qLEn=arts.filter(a=>{
    if(!hasDate(a.dateEn)||!a.dateEn.startsWith(FIXED_YEAR)) return false;
    return 'Q'+Math.ceil((new Date(a.dateEn).getMonth()+1)/3)===nowQ;
  }).length;

  // 本月
  const moStr=String(nowMonth).padStart(2,'0');
  const moPrefix=`${FIXED_YEAR}-${moStr}`;
  const moTZh=Math.round((kpi.zh[nowQ]||0)/3);
  const moTEn=Math.round((kpi.en[nowQ]||0)/3);
  const moLZh=arts.filter(a=>hasDate(a.dateZh)&&a.dateZh.startsWith(moPrefix)).length;
  const moLEn=arts.filter(a=>hasDate(a.dateEn)&&a.dateEn.startsWith(moPrefix)).length;

  // 本週
  const nowWk=getISOWeek(today);
  const wkLZh=arts.filter(a=>hasDate(a.dateZh)&&a.dateZh.startsWith(FIXED_YEAR)&&getISOWeek(new Date(a.dateZh))===nowWk).length;
  const wkLEn=arts.filter(a=>hasDate(a.dateEn)&&a.dateEn.startsWith(FIXED_YEAR)&&getISOWeek(new Date(a.dateEn))===nowWk).length;
  // 本週目標：年目標/52
  const wkTZh=Math.round(totalTZh/52);
  const wkTEn=Math.round(totalTEn/52);

  // ★ 重構：中英轉譯率從全資料庫動態計算
  const globalCnPub=arts.filter(a=>hasDate(a.dateZh)).length;
  const globalEnPub=arts.filter(a=>hasDate(a.dateEn)).length;
  const globalTransRate=pct(globalEnPub,globalCnPub);

  // 翻譯卡關（中文已上架超過 7 天但英文未上架）
  const stuck=arts.filter(a=>a.dateZh&&!hasDate(a.dateEn)&&(today-new Date(a.dateZh))/86400000>7).length;

  // 最新週別庫存（仍從 weekly.json 取庫存盤點數）
  const lastWeek=weeks.length>0?weeks[weeks.length-1]:null;

  const invColor=(lastWeek&&lastWeek.enDanger)?'#B91C1C':(lastWeek&&lastWeek.enWarn)?'#A35200':'#1A6B45';
  const invBg=(lastWeek&&lastWeek.enDanger)?'#FEE2E2':(lastWeek&&lastWeek.enWarn)?'#FEF3C7':'#D1FAE5';
  const invBorder=(lastWeek&&lastWeek.enDanger)?'#FECACA':(lastWeek&&lastWeek.enWarn)?'#FDE68A':'#6EE7B7';

  // rateRow：達標率表格列（含 hover title 顯示詳細數字）
  const rateRow=(label,period,cnP,cnAct,cnTgt,enP,enAct,enTgt)=>`
    <div style="display:grid;grid-template-columns:120px 1fr 1fr;border-bottom:1px solid ${C_SURF};min-height:60px">
      <div style="padding:10px 14px;display:flex;flex-direction:column;justify-content:center;border-right:1px solid ${C_SURF}">
        <div style="font-size:12px;font-weight:500;color:#1C1C1C">${label}</div>
        ${period?`<div style="font-size:9px;color:#9A9A96;margin-top:2px;letter-spacing:.03em">${period}</div>`:''}
      </div>
      <div style="padding:10px 16px;border-right:1px solid ${C_SURF};cursor:default"
           title="中文稿：${cnAct} / ${cnTgt} 篇 (${cnP}%)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
          <span style="font-size:10px;color:${C_ORANGE};font-weight:500;letter-spacing:.04em">中文稿</span>
          <div style="display:flex;align-items:center;gap:5px">
            <span style="font-size:16px;font-weight:300;color:${pctColor(cnP)};letter-spacing:-.01em">${cnP}%</span>
            <span style="font-size:9px;padding:1px 5px;border-radius:2px;background:${pctBg(cnP)};color:${pctColor(cnP)};font-weight:600">${pctText(cnP)}</span>
          </div>
        </div>
        ${pgBar(cnP,C_ORANGE,'3px')}
        <div style="font-size:9px;color:#9A9A96;margin-top:3px">已上架 ${cnAct} / 目標 ${cnTgt} 篇</div>
      </div>
      <div style="padding:10px 16px;cursor:default"
           title="英譯稿：${enAct} / ${enTgt} 篇 (${enP}%)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
          <span style="font-size:10px;color:${C_DARK};font-weight:500;letter-spacing:.04em">英譯稿</span>
          <div style="display:flex;align-items:center;gap:5px">
            <span style="font-size:16px;font-weight:300;color:${pctColor(enP)};letter-spacing:-.01em">${enP}%</span>
            <span style="font-size:9px;padding:1px 5px;border-radius:2px;background:${pctBg(enP)};color:${pctColor(enP)};font-weight:600">${pctText(enP)}</span>
          </div>
        </div>
        ${pgBar(enP,'#3D3D3D','3px')}
        <div style="font-size:9px;color:#9A9A96;margin-top:3px">已上架 ${enAct} / 目標 ${enTgt} 篇</div>
      </div>
    </div>`;

  document.getElementById('view-mgr').innerHTML=`
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:1.25rem">
      <span style="font-size:12px;padding:3px 14px;border-radius:2px;background:${C_ORANGE};color:#fff;font-weight:500">${FIXED_YEAR}</span>
      <span style="font-size:11px;color:#9A9A96">主管報告版 · 固定顯示當年度</span>
    </div>

    <!-- 達標率概覽（全年/本季/本月/本週 全部從 articles 即時計算） -->
    <div style="background:#fff;border:1px solid ${C_EDGE};overflow:hidden;margin-bottom:1rem">
      <div style="display:grid;grid-template-columns:120px 1fr 1fr;background:${C_SURF};border-bottom:1px solid ${C_EDGE}">
        <div style="padding:10px 14px;font-size:9px;color:#6B6B6B;font-weight:500;border-right:1px solid ${C_EDGE};letter-spacing:.1em;text-transform:uppercase">達標率概覽</div>
        <div style="padding:10px 16px;font-size:10px;font-weight:600;color:${C_ORANGE};border-right:1px solid ${C_EDGE};display:flex;align-items:center;gap:5px;letter-spacing:.08em;text-transform:uppercase">
          <span style="width:8px;height:8px;background:${C_ORANGE};display:inline-block"></span>中文稿
        </div>
        <div style="padding:10px 16px;font-size:10px;font-weight:600;color:${C_DARK};display:flex;align-items:center;gap:5px;letter-spacing:.08em;text-transform:uppercase">
          <span style="width:8px;height:8px;background:${C_DARK};display:inline-block"></span>英譯稿
        </div>
      </div>
      ${rateRow('全年 KPI',`目標 ${totalTZh} / ${totalTEn} 篇`,pct(totalLZh,totalTZh),totalLZh,totalTZh,pct(totalLEn,totalTEn),totalLEn,totalTEn)}
      ${rateRow('本季 KPI',nowQ,pct(qLZh,qTZh),qLZh,qTZh,pct(qLEn,qTEn),qLEn,qTEn)}
      ${rateRow('本月進度',new Date().toLocaleDateString('zh-TW',{month:'long'}),pct(moLZh,moTZh),moLZh,moTZh,pct(moLEn,moTEn),moLEn,moTEn)}
      ${rateRow(`本週進度（W${String(nowWk).padStart(2,'0')}）`,weekDateRange(`${FIXED_YEAR}-W${String(nowWk).padStart(2,'0')}`),pct(wkLZh,wkTZh),wkLZh,wkTZh,pct(wkLEn,wkTEn),wkLEn,wkTEn)}

      <!-- 英譯庫存 + 中英轉譯率 -->
      <div style="display:grid;grid-template-columns:1fr 1fr;background:${invBg};border-top:2px solid ${invBorder}">
        <div style="padding:12px 16px;border-right:1px solid ${invBorder}">
          <div style="font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:${invColor};margin-bottom:4px">英譯稿庫存水位</div>
          <div style="display:flex;align-items:baseline;gap:8px">
            <span style="font-size:32px;font-weight:300;color:${invColor};letter-spacing:-.02em">${lastWeek?lastWeek.enStock:'—'}</span>
            <span style="font-size:12px;color:${invColor}">篇可上架</span>
          </div>
          <div style="font-size:10px;color:${invColor};margin-top:3px">
            ${lastWeek?(lastWeek.enDanger?'低於警戒，需立即補充':lastWeek.enWarn?'接近警戒，建議補充':'安全水位'):'尚無庫存快照資料'}
            ${lastWeek?` · 待翻 ${lastWeek.enPending} 篇`:''}
          </div>
        </div>
        <div style="padding:12px 16px">
          <div style="font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:#6B6B6B;margin-bottom:4px">中英轉譯率（累計）</div>
          <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:6px">
            <span style="font-size:32px;font-weight:300;color:${globalTransRate>=80?'#1A6B45':globalTransRate>=50?'#A35200':'#B91C1C'};letter-spacing:-.02em">${globalTransRate}%</span>
            <span style="font-size:9px;padding:2px 7px;border-radius:2px;font-weight:600;
              background:${globalTransRate>=80?'#D1FAE5':globalTransRate>=50?'#FEF3C7':'#FEE2E2'};
              color:${globalTransRate>=80?'#1A6B45':globalTransRate>=50?'#A35200':'#B91C1C'}">
              ${globalTransRate>=80?'健康':globalTransRate>=50?'偏低':'警告'}
            </span>
          </div>
          <div style="font-size:9px;color:#9A9A96">英譯稿 ${globalEnPub} ÷ 中文稿 ${globalCnPub}（全資料庫）</div>
        </div>
      </div>
    </div>

    <!-- 月別達標率（強制從 1 月顯示到當月，從 articles 計算） -->
    <div class="kpi-block" style="margin-bottom:1rem" id="mgr-monthly-section"></div>

    <!-- 週別切換 + 週別卡片 -->
    <div id="mgr-weekly-section"></div>

    <!-- 行動建議（移到最下方） -->
    <div id="mgr-action-section"></div>
  `;

  // 月別達標率渲染
  const monthStats=getMonthlyStatsFromArticles(arts,FIXED_YEAR);
  const mgrMonthEl=document.getElementById('mgr-monthly-section');
  mgrMonthEl.innerHTML=`
    <div class="kpi-header">
      <span class="kpi-title">月別達標率</span>
      <span class="kpi-meta">從 articles 日期即時計算 · 月目標 = 季目標 ÷ 3</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px">
      ${monthStats.map(m=>`
        <div style="padding:.875rem;background:${C_BG};border:1px solid ${C_EDGE}">
          <div style="font-size:11px;font-weight:500;color:#1C1C1C;margin-bottom:8px">${m.label}</div>
          <div style="font-size:10px;color:#6B6B6B;margin-bottom:2px;display:flex;justify-content:space-between">
            <span>中文稿</span><span style="color:${pctColor(m.cnAchieve)};font-weight:600">${m.cnAchieve}%</span>
          </div>
          ${pgBar(m.cnAchieve,C_ORANGE,'3px')}
          <div style="font-size:10px;color:#6B6B6B;margin-top:6px;margin-bottom:2px;display:flex;justify-content:space-between">
            <span>英譯稿</span><span style="color:${pctColor(m.enAchieve)};font-weight:600">${m.enAchieve}%</span>
          </div>
          ${pgBar(m.enAchieve,'#3D3D3D','3px')}
          <div style="font-size:9px;color:#9A9A96;margin-top:5px">中 ${m.cnAct}/${m.cnPlan} · 英 ${m.enAct}/${m.enPlan}</div>
        </div>`).join('')}
    </div>`;

  // 週別區段
  if(weeks.length>0) renderWeeklySection(weeks,stuck);
  else document.getElementById('mgr-weekly-section').innerHTML=`
    <div class="kpi-block" style="margin-bottom:1rem;text-align:center;padding:2rem">
      <div style="font-size:13px;color:#6B6B6B">尚無 ${FIXED_YEAR} 週別庫存記錄</div>
      <div style="font-size:11px;color:#9A9A96;margin-top:6px">請在 Excel「週別庫存快照」填入後執行 sync.py</div>
    </div>`;
}

function renderWeeklySection(weeks,stuck){
  let idx=weeks.length-1;

  function weekCard(w,showActions){
    // ★ 重構：移除 emoji，改用 CSS 色塊 + 文字
    const dot=(color)=>`<span style="display:inline-block;width:7px;height:7px;border-radius:0;background:${color};margin-right:6px;flex-shrink:0;margin-top:1px"></span>`;

    // 達成率計算
    const cnAch=pct(w.cnAct,w.cnPlan);
    const enAch=pct(w.enAct,w.enPlan);
    const cnColor=pctColor(cnAch), enColor=pctColor(enAch);
    const ed=w.enDanger,ew=w.enWarn&&!ed;
    const sc=ed?'#B91C1C':ew?'#A35200':'#1A6B45';

    // metricRow：移除 emoji，用左側色塊標示
    const metricRow=(dotColor,label,val,valColor,badge,badgeBg)=>`
      <div style="display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid ${C_SURF}">
        ${dot(dotColor)}
        <div style="flex:1;min-width:0;font-size:11px;color:#6B6B6B">${label}</div>
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:18px;font-weight:300;color:${valColor};letter-spacing:-.01em">${val}</span>
          ${badge?`<span style="font-size:9px;padding:1px 6px;border-radius:2px;background:${badgeBg||C_SURF};color:${valColor};font-weight:600">${badge}</span>`:''}
        </div>
      </div>`;

    // 行動建議（只在傳入 showActions 時產生）
    const actions=[];
    if(ed) actions.push({t:'urgent',m:`英譯庫存僅剩 ${w.enStock} 篇，已低於警戒線 5 篇，需優先送譯至少 5 篇。`});
    else if(ew) actions.push({t:'warn',m:`英譯庫存 ${w.enStock} 篇，接近警戒線，建議本週補充翻譯 3 篇以上。`});
    if(enAch<80) actions.push({t:'urgent',m:`本週英譯稿達成率 ${enAch}%，請確認翻譯卡關原因並調整排程。`});
    if(cnAch<80) actions.push({t:'warn',m:`本週中文稿達成率 ${cnAch}%，請確認上架流程是否順暢。`});
    if(stuck>0) actions.push({t:'warn',m:`共 ${stuck} 篇中文上架超過 7 天仍無英文上架日，需追蹤翻譯進度。`});
    if(actions.length===0) actions.push({t:'normal',m:'本週各項指標正常，請維持現有節奏。'});

    return`
      <div style="background:#fff;border:1px solid ${C_EDGE};overflow:hidden;margin-bottom:1rem">
        <!-- 週標題 -->
        <div style="padding:12px 18px;background:${C_SURF};border-bottom:1px solid ${C_EDGE};display:flex;justify-content:space-between;align-items:center">
          <div>
            <span style="font-size:12px;font-weight:500;color:#9C4A12;letter-spacing:.06em">${w.week}</span>
            <span style="font-size:11px;color:#6B6B6B;margin-left:8px">${weekDateRange(w.week)}</span>
          </div>
          <div style="display:flex;gap:8px">
            <span style="font-size:11px;padding:3px 10px;border-radius:2px;background:rgba(200,98,30,0.12);color:${C_ORANGE}">中文 ${cnAch}%</span>
            <span style="font-size:11px;padding:3px 10px;border-radius:2px;background:rgba(50,50,50,0.10);color:${C_DARK}">英譯 ${enAch}%</span>
          </div>
        </div>

        <!-- 中文稿 / 英譯稿 雙欄 -->
        <div style="display:grid;grid-template-columns:1fr 1fr">
          <div style="border-right:1px solid ${C_SURF}">
            <div style="padding:7px 14px;background:#FBF0E8;border-bottom:1px solid #EDB896">
              <span style="font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:${C_ORANGE}">中文稿</span>
            </div>
            ${metricRow('#CCC','本週計畫上架',w.cnPlan+'篇',C_ORANGE,null,null)}
            ${metricRow(cnColor,'本週實際上架',w.cnAct+'篇',cnColor,pctText(cnAch),pctBg(cnAch))}
            ${metricRow('#CCC','預計審閱 (Ready)',w.cnReady+'篇',C_ORANGE,null,null)}
            ${metricRow('#CCC','待編修 (Raw)',w.cnRaw+'篇','#9A9A96',null,null)}
          </div>
          <div>
            <div style="padding:7px 14px;background:${C_SURF};border-bottom:1px solid ${C_EDGE}">
              <span style="font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:${C_DARK}">英譯稿</span>
            </div>
            ${metricRow('#CCC','本週計畫上架',w.enPlan+'篇',C_DARK,null,null)}
            ${metricRow(enColor,'本週實際上架',w.enAct+'篇',enColor,pctText(enAch),pctBg(enAch))}
            ${metricRow(sc,'已翻譯可上架',w.enStock+'篇',sc,ed?'危險':ew?'注意':'正常',ed?'#FEE2E2':ew?'#FEF3C7':'#D1FAE5')}
            ${metricRow('#CCC','等待翻譯 (待翻)',w.enPending+'篇','#534AB7',null,null)}
          </div>
        </div>
      </div>

      ${showActions?`
      <!-- ★ 行動建議移到最下方 -->
      <div style="background:#fff;border:1px solid ${C_EDGE};padding:1.25rem;margin-bottom:1rem">
        <div style="font-size:12px;font-weight:500;letter-spacing:.04em;text-transform:uppercase;color:#6B6B6B;margin-bottom:10px">本週行動建議</div>
        <div style="display:flex;flex-direction:column;gap:7px">
          ${actions.map(a=>`<div style="display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:0;border:1px solid;
            ${a.t==='urgent'?'background:#FEE2E2;border-color:#FECACA':a.t==='warn'?'background:#FEF3C7;border-color:#FDE68A':'background:#D1FAE5;border-color:#6EE7B7'}">
            <div style="width:6px;height:6px;border-radius:0;flex-shrink:0;margin-top:4px;background:${a.t==='urgent'?'#B91C1C':a.t==='warn'?'#A35200':'#1A6B45'}"></div>
            <div style="font-size:12px;line-height:1.6;color:${a.t==='urgent'?'#B91C1C':a.t==='warn'?'#A35200':'#1A6B45'}">${a.m}</div>
          </div>`).join('')}
        </div>
      </div>`:''}`;
  }

  const selectorHtml=`
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:1.25rem;flex-wrap:wrap">
      <span style="font-size:11px;color:#6B6B6B;letter-spacing:.04em;margin-right:4px">切換週別</span>
      ${weeks.map((w,i)=>{
        const wNum=w.week.replace(FIXED_YEAR+'-','');
        const dr=weekDateRange(w.week);
        const isActive=i===idx;
        return`<button id="wbtn-${i}" onclick="selectWeekBtn(${i})"
          style="padding:5px 10px;font-size:11px;border-radius:2px;cursor:pointer;text-align:left;line-height:1.5;
          border:1px solid ${isActive?C_ORANGE:C_EDGE};
          background:${isActive?C_ORANGE:'#fff'};
          color:${isActive?'#fff':'#6B6B6B'}">
          <span style="font-weight:500;display:block">${wNum}</span>
          <span style="font-size:9px;opacity:.75">${dr}</span>
        </button>`;
      }).join('')}
    </div>`;

  // ★ 趨勢圖優化：開啟 Legend，加軸標籤
  const chartHtml=`
    <div class="kpi-block" style="margin-bottom:1rem">
      <div class="kpi-header">
        <span class="kpi-title">累計上架趨勢（${FIXED_YEAR} 年初至今）</span>
        <span class="kpi-meta">從文章日期動態計算</span>
      </div>
      <div class="chart-wrap" style="height:260px"><canvas id="w-trend-chart"></canvas></div>
    </div>`;

  document.getElementById('mgr-weekly-section').innerHTML=
    selectorHtml +
    `<div id="week-detail">${weekCard(weeks[idx],false)}</div>` +
    chartHtml;

  // 行動建議放在最下方（只顯示最新週的建議）
  document.getElementById('mgr-action-section').innerHTML=
    weekCard(weeks[idx],true).split('</div>\n\n      <!--')[1]
      ?`<div class="kpi-block" style="margin-bottom:1rem">${weekCard(weeks[idx],true).split('<div style="background:#fff;border:1px solid #E2E0DC;padding:1.25rem;margin-bottom:1rem">')[1]}</div>`
      :weekCard(weeks[idx],true).includes('行動建議')
        ?`<div>${weekCard(weeks[idx],true).split('<!-- ★ 行動建議移到最下方 -->')[1]||''}</div>`
        :'';

  // 直接用獨立函式渲染行動建議（更可靠）
  renderActionSection(weeks[idx],stuck);

  window.selectWeekBtn=function(i){
    idx=i;
    weeks.forEach((_,j)=>{
      const b=document.getElementById(`wbtn-${j}`);
      if(b){b.style.background=j===i?C_ORANGE:'#fff';b.style.color=j===i?'#fff':'#6B6B6B';b.style.borderColor=j===i?C_ORANGE:C_EDGE;}
    });
    document.getElementById('week-detail').innerHTML=weekCard(weeks[i],false);
    renderActionSection(weeks[i],stuck);
  };

  // 趨勢圖資料（從 articles 日期計算）
  const nowWk2=getISOWeek(new Date());
  const trLabels=[];
  const cnCumA=[],enCumA=[];
  let curCn=0,curEn=0;
  const wkCounts={};
  articles.forEach(a=>{
    if(hasDate(a.dateZh)&&a.dateZh.startsWith(FIXED_YEAR)){const w=getISOWeek(new Date(a.dateZh));if(!wkCounts[w])wkCounts[w]={cn:0,en:0};wkCounts[w].cn++;}
    if(hasDate(a.dateEn)&&a.dateEn.startsWith(FIXED_YEAR)){const w=getISOWeek(new Date(a.dateEn));if(!wkCounts[w])wkCounts[w]={cn:0,en:0};wkCounts[w].en++;}
  });
  const cnPlanCumA=Array(nowWk2).fill(null);
  const enPlanCumA=Array(nowWk2).fill(null);
  weeks.forEach(w=>{
    const parts=w.week.split('-W');
    if(parts.length===2){const wi=parseInt(parts[1])-1;if(wi>=0&&wi<nowWk2){cnPlanCumA[wi]=w.cnPlanCum;enPlanCumA[wi]=w.enPlanCum;}}
  });
  for(let i=1;i<=nowWk2;i++){
    trLabels.push('W'+String(i).padStart(2,'0'));
    curCn+=(wkCounts[i]?wkCounts[i].cn:0);
    curEn+=(wkCounts[i]?wkCounts[i].en:0);
    cnCumA.push(curCn);enCumA.push(curEn);
  }

  if(trendChart) trendChart.destroy();
  trendChart=new Chart(document.getElementById('w-trend-chart').getContext('2d'),{
    type:'line',
    data:{labels:trLabels,datasets:[
      {label:'中文稿計畫',data:cnPlanCumA,borderColor:'#EDB896',borderDash:[4,3],
       borderWidth:1.5,pointRadius:0,fill:false,tension:0,spanGaps:true},
      {label:'英譯稿計畫',data:enPlanCumA,borderColor:'#B4B2A9',borderDash:[4,3],
       borderWidth:1.5,pointRadius:0,fill:false,tension:0,spanGaps:true},
      {label:'中文稿實際',data:cnCumA,borderColor:C_ORANGE,
       backgroundColor:'rgba(200,98,30,0.07)',borderWidth:2.5,pointRadius:0,fill:true,tension:0.1},
      {label:'英譯稿實際',data:enCumA,borderColor:'#3D3D3D',
       backgroundColor:'rgba(50,50,50,0.04)',borderWidth:2.5,pointRadius:0,fill:true,tension:0.1},
    ]},
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{
        // ★ 開啟圖例
        legend:{display:true,position:'top',
          labels:{font:{size:10},color:'#6B6B6B',boxWidth:16,padding:12}},
        tooltip:{mode:'index',intersect:false,
          backgroundColor:'#1C1C1C',titleColor:'#fff',bodyColor:'rgba(255,255,255,0.75)',
          cornerRadius:0,padding:10,
          callbacks:{
            title:items=>'第 '+items[0].label+' 週',
            label:c=>` ${c.dataset.label}：${c.raw!==null?c.raw+'篇':'—'}`
          }
        }
      },
      scales:{
        x:{grid:{display:false},
           ticks:{color:'#9A9A96',font:{size:9},maxRotation:0},
           title:{display:true,text:'週次',color:'#9A9A96',font:{size:10}}},
        y:{grid:{color:'rgba(0,0,0,0.05)'},
           ticks:{color:'#9A9A96',font:{size:10}},min:0,
           title:{display:true,text:'累計篇數',color:'#9A9A96',font:{size:10}}}
      }
    }
  });
}

/** 獨立渲染行動建議，供週別切換時更新 */
function renderActionSection(w,stuck){
  const el=document.getElementById('mgr-action-section');
  if(!el) return;
  const cnAch=pct(w.cnAct,w.cnPlan);
  const enAch=pct(w.enAct,w.enPlan);
  const ed=w.enDanger,ew=w.enWarn&&!ed;
  const actions=[];
  if(ed) actions.push({t:'urgent',m:`英譯庫存僅剩 ${w.enStock} 篇，已低於警戒線 5 篇，需優先送譯至少 5 篇。`});
  else if(ew) actions.push({t:'warn',m:`英譯庫存 ${w.enStock} 篇，接近警戒線，建議本週補充翻譯 3 篇以上。`});
  if(enAch<80) actions.push({t:'urgent',m:`英譯稿達成率 ${enAch}%，請確認翻譯卡關原因並調整排程。`});
  if(cnAch<80) actions.push({t:'warn',m:`中文稿達成率 ${cnAch}%，請確認上架流程是否順暢。`});
  if(stuck>0) actions.push({t:'warn',m:`共 ${stuck} 篇中文上架超過 7 天仍無英文上架日，需追蹤翻譯進度。`});
  if(actions.length===0) actions.push({t:'normal',m:'本週各項指標正常，請維持現有節奏。'});
  el.innerHTML=`
    <div style="background:#fff;border:1px solid ${C_EDGE};padding:1.25rem;margin-bottom:1rem">
      <div style="font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:#6B6B6B;margin-bottom:12px">本週行動建議</div>
      <div style="display:flex;flex-direction:column;gap:7px">
        ${actions.map(a=>`<div style="display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border:1px solid;
          ${a.t==='urgent'?'background:#FEE2E2;border-color:#FECACA':a.t==='warn'?'background:#FEF3C7;border-color:#FDE68A':'background:#D1FAE5;border-color:#6EE7B7'}">
          <div style="width:6px;height:6px;flex-shrink:0;margin-top:4px;background:${a.t==='urgent'?'#B91C1C':a.t==='warn'?'#A35200':'#1A6B45'}"></div>
          <div style="font-size:12px;line-height:1.6;color:${a.t==='urgent'?'#B91C1C':a.t==='warn'?'#A35200':'#1A6B45'}">${a.m}</div>
        </div>`).join('')}
      </div>
    </div>`;
}

// ===== 【3】分頁三：後台編輯版 =====
function renderOps(){
  const opsEl=document.getElementById('view-ops');
  if(!opsEl.querySelector('table')){
    opsEl.innerHTML=`
      <div class="filter-bar">
        <input type="text" id="ops-search" placeholder="搜尋標題…" style="width:140px" oninput="renderOps()">
        <select id="ops-status" onchange="renderOps()"><option value="">全部狀態</option>
          <option>已上架</option><option>待上架</option><option>待改稿</option><option>待初審</option>
        </select>
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
      <td style="color:#6B6B6B">${a.year}</td>
      <td title="${a.title}">${a.title}</td>
      <td><span class="sbadge ${smap[a.status]||''}">${a.status}</span></td>
      <td style="color:#6B6B6B">${a.dateZh||'—'}</td>
      <td style="color:#6B6B6B">${a.dateEn||'—'}</td>
      <td><button style="font-size:11px;padding:2px 8px;border-radius:2px;cursor:pointer;border:1px solid ${C_EDGE};background:#fff;color:#6B6B6B" onclick="openModal(${a.id})">編輯</button></td>
    </tr>`).join('');
}

// ===== 【4】分頁四：AI 數據摘要 =====
function renderQA(){
  const yearData=summary.data?.[FIXED_YEAR];
  const updated=summary.updated||'尚未同步';
  if(!yearData){
    document.getElementById('view-qa').innerHTML=`<div class="qa-wrap"><div class="qa-title">AI 數據摘要</div><div style="font-size:12px;color:#9A9A96;padding:24px 0;text-align:center">尚未產生 ${FIXED_YEAR} 年度摘要。</div></div>`;
    return;
  }
  const highlights=yearData.highlights||[];
  const qaPairs=yearData.qa_pairs||[];
  const stats=yearData.stats||{};
  const hlHtml=highlights.length>0?highlights.map(h=>`
    <div style="display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid ${C_SURF}">
      <div style="width:6px;height:6px;background:${C_ORANGE};flex-shrink:0;margin-top:5px"></div>
      <div style="font-size:13px;color:#1C1C1C;line-height:1.6">${h}</div>
    </div>`).join(''):'<div style="font-size:12px;color:#9A9A96;padding:12px 0">摘要產生中</div>';
  const qaHtml=qaPairs.length>0?qaPairs.map((p,i)=>`
    <div style="border:1px solid ${C_EDGE};overflow:hidden;margin-bottom:8px">
      <div style="background:${C_BG};padding:8px 12px;font-size:12px;font-weight:500;color:#1C1C1C;cursor:pointer" onclick="toggleQA(${i})">
        <span style="color:${C_ORANGE};margin-right:6px">Q</span>${p.q}
      </div>
      <div id="qa-ans-${i}" style="display:none;padding:10px 12px;font-size:12px;color:#1C1C1C;line-height:1.6;border-top:1px solid ${C_SURF}">
        <span style="color:${C_DARK};font-weight:500;margin-right:6px">A</span>${p.a}
      </div>
    </div>`).join(''):'<div style="font-size:12px;color:#9A9A96;padding:12px 0">問答產生中</div>';
  const sk=(stats.stuck||[]).slice(0,5);
  document.getElementById('view-qa').innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
      <div class="qa-wrap">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <div class="qa-title">${FIXED_YEAR} 年度重點摘要</div>
          <div style="font-size:10px;color:#9A9A96">更新於 ${updated}</div>
        </div>
        ${hlHtml}
      </div>
      <div class="qa-wrap">
        <div class="qa-title" style="margin-bottom:14px">需注意項目</div>
        ${sk.length>0?`<div style="font-size:11px;font-weight:500;color:#A35200;margin-bottom:6px">翻譯卡關（${stats.stuck?.length||0} 篇）</div>${sk.map(t=>`<div style="font-size:11px;padding:4px 0;border-bottom:1px solid ${C_SURF}">${t}</div>`).join('')}`:'<div style="font-size:12px;color:#9A9A96">無翻譯卡關</div>'}
      </div>
    </div>
    <div class="qa-wrap">
      <div class="qa-title" style="margin-bottom:4px">常見問答</div>
      <div style="font-size:11px;color:#6B6B6B;margin-bottom:14px">點選問題展開答案 · AI 根據最新數據自動產生</div>
      ${qaHtml}
    </div>`;
}
function toggleQA(i){const el=document.getElementById(`qa-ans-${i}`);if(el) el.style.display=el.style.display==='none'?'block':'none';}

// ===== 【5】分頁五：文章查詢 =====
function renderSearch(){
  const el=document.getElementById('view-search');
  if(el.querySelector('.search-hero')){refreshSearchResults();return;}
  const presetQA=(contentSummary.qa_pairs||[]);

  // ★ 收集所有子目錄選項（動態）
  const allSubdirs=[...new Set(
    contentArticles.flatMap(a=>getArr(a,'subDir'))
  )].sort();

  el.innerHTML=`
    <div class="search-hero">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <div style="font-size:13px;font-weight:500">AI 自然語言查詢</div>
        <span style="font-size:10px;padding:3px 10px;border-radius:2px;background:${C_SURF};color:#6B6B6B;letter-spacing:.04em">全資料庫 · 不受年份影響</span>
      </div>
      <div style="font-size:11px;color:#6B6B6B;margin-bottom:12px">
        直接用說話方式問問題，AI 自動比對 ${contentArticles.length} 篇文章，
        <strong style="color:${C_ORANGE}">查詢後卡片自動篩選 AI 提到的文章</strong>
      </div>
      ${presetQA.length>0?`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
        ${presetQA.slice(0,6).map(p=>`<button onclick="askContentAI(this)" data-q="${p.q.replace(/"/g,'&quot;')}"
          style="font-size:11px;padding:3px 10px;border-radius:2px;border:1px solid ${C_EDGE};background:#fff;color:#6B6B6B;cursor:pointer">${p.q}</button>`).join('')}
      </div>`:''}
      <div style="display:flex;gap:8px">
        <input id="search-ai-q" style="flex:1;font-size:13px;padding:9px 14px;border-radius:2px;border:1px solid ${C_EDGE};background:#fff;color:#1C1C1C;outline:none"
          placeholder="例如：台北有伴手禮的文章有哪些？" onkeydown="if(event.key==='Enter')runContentAI()">
        <button id="search-ai-btn" onclick="runContentAI()"
          style="font-size:12px;padding:9px 18px;border-radius:2px;border:1px solid #EDB896;background:#FBF0E8;color:${C_ORANGE};cursor:pointer;font-weight:500;white-space:nowrap">
          AI 查詢
        </button>
      </div>
      <div id="search-ai-result" style="display:none;margin-top:12px;padding:12px 14px;background:${C_BG};font-size:12px;color:#1C1C1C;line-height:1.7"></div>
    </div>

    <div id="search-ai-filter-banner" style="display:none;background:#FBF0E8;border:1px solid ${C_ORANGE};padding:10px 14px;margin-bottom:1rem;align-items:center;justify-content:space-between">
      <span style="font-size:12px;color:${C_ORANGE}">目前僅顯示 AI 提到的文章</span>
      <button onclick="clearAIFilter()" style="font-size:11px;padding:3px 10px;border-radius:2px;border:1px solid #EDB896;background:#fff;color:${C_ORANGE};cursor:pointer">顯示全部</button>
    </div>

    <div style="background:#fff;border:1px solid ${C_EDGE};padding:1.25rem;margin-bottom:1rem">
      <div style="font-size:12px;font-weight:500;margin-bottom:12px">條件篩選</div>
      <div style="margin-bottom:10px">
        <div style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;font-weight:500;color:#6B6B6B;margin-bottom:7px">主題探索</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${THEMES.map(t=>`<button class="fchip" data-group="theme" data-val="${t}" onclick="toggleFChip(this)">${t}</button>`).join('')}</div>
      </div>
      <div style="margin-bottom:10px">
        <div style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;font-weight:500;color:#6B6B6B;margin-bottom:7px">地方探索</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${REGIONS.map(r=>`<button class="fchip" data-group="region" data-val="${r}" onclick="toggleFChip(this)">${r}</button>`).join('')}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-bottom:10px">
        <div>
          <div style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;font-weight:500;color:#6B6B6B;margin-bottom:7px">時令探索</div>
          <div style="display:flex;flex-wrap:wrap;gap:5px">${SEASONS.map(s=>`<button class="fchip" data-group="season" data-val="${s}" onclick="toggleFChip(this)">${s}</button>`).join('')}</div>
        </div>
        <div>
          <div style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;font-weight:500;color:#6B6B6B;margin-bottom:7px">包含內容</div>
          <div style="display:flex;flex-wrap:wrap;gap:5px">${HAS_OPTS.map(h=>`<button class="fchip" data-group="has" data-val="${h}" onclick="toggleFChip(this)">${h}</button>`).join('')}</div>
        </div>
        <div>
          <!-- ★ 新增子目錄下拉篩選 -->
          <div style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;font-weight:500;color:#6B6B6B;margin-bottom:7px">子目錄</div>
          <select id="f-subdir" onchange="refreshSearchResults()"
            style="width:100%;font-size:12px;padding:5px 8px;border-radius:2px;border:1px solid ${C_EDGE};background:#fff;color:#1C1C1C;outline:none">
            <option value="">全部子目錄</option>
            ${allSubdirs.map(s=>`<option value="${s}">${s}</option>`).join('')}
          </select>
        </div>
      </div>
      <div>
        <div style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;font-weight:500;color:#6B6B6B;margin-bottom:7px">關鍵字搜尋</div>
        <input id="f-kw" style="width:100%;font-size:12px;padding:6px 10px;border-radius:2px;border:1px solid ${C_EDGE};background:#fff;color:#1C1C1C;outline:none"
          placeholder="例如：台北、九份" oninput="refreshSearchResults()">
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div style="font-size:12px;color:#6B6B6B" id="s-count">共 <strong style="color:#1C1C1C">0</strong> 篇</div>
      <button onclick="clearSearch()" style="font-size:11px;padding:3px 10px;border-radius:2px;border:1px solid ${C_EDGE};background:#fff;color:#6B6B6B;cursor:pointer">清除篩選</button>
    </div>
    <div id="s-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px"></div>`;

  injectFChipStyle();
  refreshSearchResults();
}

function injectFChipStyle(){
  if(document.getElementById('fchip-style')) return;
  const s=document.createElement('style');s.id='fchip-style';
  s.textContent=`.fchip{font-size:10px;padding:3px 10px;border-radius:2px;border:1px solid #E2E0DC;cursor:pointer;color:#6B6B6B;background:#fff;letter-spacing:.03em;transition:all .12s}
.fchip:hover{background:#FBF0E8;border-color:#EDB896;color:#9C4A12}
.fchip.on{background:#C8621E;border-color:#C8621E;color:#fff}
.fchip[data-group="season"].on{background:#1A6B45;border-color:#1A6B45}
.fchip[data-group="has"].on{background:#2D2D2D;border-color:#2D2D2D}
.fchip[data-group="theme"].on{background:#A35200;border-color:#A35200}`;
  document.head.appendChild(s);
}

function toggleFChip(btn){
  const map={theme:activeThemes,region:activeRegions,season:activeSeasons,has:activeHas};
  const set=map[btn.dataset.group];
  if(set.has(btn.dataset.val)){set.delete(btn.dataset.val);btn.classList.remove('on');}
  else{set.add(btn.dataset.val);btn.classList.add('on');}
  refreshSearchResults();
}

function extractAITitles(text){return contentArticles.filter(a=>a.title&&text.includes(a.title)).map(a=>a.id);}

function clearAIFilter(){
  aiFilteredIds=null;
  const banner=document.getElementById('search-ai-filter-banner');
  if(banner) banner.style.display='none';
  refreshSearchResults();
}

/** ★ 重構：加入子目錄篩選，season/theme/region 使用模糊比對 */
function filterContent(){
  const kl=((document.getElementById('f-kw')||{}).value||'').toLowerCase().trim();
  const subdirVal=(document.getElementById('f-subdir')||{}).value||'';
  // 模糊比對：「夏季」.includes("夏") = true，也處理反向 "夏".includes("夏季") = false 但前者成立
  const fuzzyMatch=(arr,val)=>arr.some(v=>v.includes(val)||val.includes(v));
  let base=aiFilteredIds!==null
    ?contentArticles.filter(a=>aiFilteredIds.includes(a.id))
    :contentArticles;
  return base.filter(a=>{
    if(activeThemes.size&&![...activeThemes].some(t=>fuzzyMatch(getArr(a,'theme'),t))) return false;
    if(activeRegions.size&&![...activeRegions].some(r=>fuzzyMatch(getArr(a,'region'),r))) return false;
    if(activeSeasons.size&&![...activeSeasons].some(s=>fuzzyMatch(getArr(a,'season'),s))) return false;
    // ★ 子目錄篩選（精確比對，子目錄不需要模糊）
    if(subdirVal&&!getArr(a,'subDir').includes(subdirVal)) return false;
    for(const h of activeHas){
      if(h==='店家'&&!a.hasStore) return false;
      if(h==='小吃'&&!a.hasSnack) return false;
      if(h==='伴手禮'&&!a.hasGift) return false;
      if(h==='景點'&&!a.hasSight) return false;
      if(h==='活動'&&!a.hasEvent) return false;
    }
    if(kl){
      const blob=[a.title,a.city,a.area,a.storeKw,a.snackKw,a.giftKw,a.sightKw,a.eventKw].join(' ').toLowerCase();
      if(!blob.includes(kl)) return false;
    }
    return true;
  });
}

function makeCard(a){
  const loc=[a.city,a.area].filter(Boolean).join(' ');
  const haves=[a.hasStore,a.hasSnack,a.hasGift,a.hasSight,a.hasEvent];
  const labels=['店家','小吃','伴手禮','景點','活動'];
  const haveStr=labels.filter((_,i)=>haves[i]).join(' · ')||'—';
  const preview=a.content?a.content.replace(/[\r\n]+/g,' ').trim().slice(0,55)+'…':'';
  return`<div onclick="openArticleModal(${a.id})"
    style="background:#fff;border:1px solid ${C_EDGE};padding:1rem 1.125rem;cursor:pointer;display:flex;flex-direction:column;height:190px;box-sizing:border-box;overflow:hidden"
    onmouseover="this.style.borderColor='${C_ORANGE}'" onmouseout="this.style.borderColor='${C_EDGE}'">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px;flex-shrink:0">
      <div style="font-size:13px;font-weight:500;color:#1C1C1C;line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${a.title}</div>
      ${a.year?`<span style="font-size:9px;padding:1px 7px;border-radius:2px;font-weight:600;background:#FEF3C7;color:#A35200;flex-shrink:0">${a.year}</span>`:''}
    </div>
    <div style="font-size:11px;color:#9A9A96;line-height:1.5;flex:1;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;margin-bottom:8px">${preview}</div>
    <div style="flex-shrink:0">
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:5px">
        ${loc?`<span style="font-size:9px;padding:1px 7px;border-radius:2px;background:${C_SURF};color:#5F5E5A;font-weight:500">${loc}</span>`:''}
        ${getArr(a,'region').map(r=>`<span style="font-size:9px;padding:1px 7px;border-radius:2px;background:#FBF0E8;color:${C_ORANGE};font-weight:500">${r}</span>`).join('')}
        ${getArr(a,'theme').slice(0,1).map(t=>`<span style="font-size:9px;padding:1px 7px;border-radius:2px;background:#EEEDFE;color:#3C3489;font-weight:500">${t}</span>`).join('')}
        ${getArr(a,'season').slice(0,2).map(s=>`<span style="font-size:9px;padding:1px 7px;border-radius:2px;background:#D1FAE5;color:#1A6B45;font-weight:500">${s}</span>`).join('')}
      </div>
      <div style="font-size:10px;color:${haves.some(Boolean)?'#1A6B45':'#CCC'};background:${haves.some(Boolean)?'#D1FAE5':'#f5f5f3'};padding:2px 8px;display:inline-block">
        ${haves.some(Boolean)?'✓ '+haveStr:'無特定資訊'}
      </div>
    </div>
  </div>`;
}

function refreshSearchResults(){
  const INIT_COUNT=8;
  const results=filterContent();
  const cnt=document.getElementById('s-count');
  if(cnt) cnt.innerHTML=`共 <strong style="color:#1C1C1C">${results.length}</strong> 篇${aiFilteredIds!==null?` <span style="font-size:10px;color:${C_ORANGE}">（AI篩選中）</span>`:''}`;
  const grid=document.getElementById('s-grid');
  if(!grid) return;
  if(results.length===0){grid.innerHTML=`<div style="grid-column:1/-1;text-align:center;padding:40px 0;color:#9A9A96;font-size:13px">沒有符合條件的文章</div>`;return;}
  const visible=results.slice(0,INIT_COUNT),hidden=results.slice(INIT_COUNT);
  let hiddenHtml='';
  if(hidden.length>0){
    hiddenHtml=`<div style="grid-column:1/-1">
      <div id="search-hidden-grid" style="display:none">
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;margin-bottom:12px">${hidden.map(a=>makeCard(a)).join('')}</div>
      </div>
      <button id="search-expand-btn" onclick="toggleSearchExpand()"
        style="width:100%;padding:10px;border-radius:2px;border:1px solid ${C_EDGE};background:#fff;color:#6B6B6B;font-size:12px;cursor:pointer">
        顯示更多 ${hidden.length} 篇
      </button>
    </div>`;
  }
  grid.innerHTML=visible.map(a=>makeCard(a)).join('')+hiddenHtml;
  window._searchExpanded=false;
  window.toggleSearchExpand=function(){
    const hg=document.getElementById('search-hidden-grid'),btn=document.getElementById('search-expand-btn');
    if(!hg||!btn) return;
    window._searchExpanded=!window._searchExpanded;
    hg.style.display=window._searchExpanded?'block':'none';
    btn.textContent=window._searchExpanded?'收合':`顯示更多 ${hidden.length} 篇`;
    btn.style.color=window._searchExpanded?C_ORANGE:'#6B6B6B';
    btn.style.borderColor=window._searchExpanded?'#EDB896':C_EDGE;
  };
}

function clearSearch(){
  activeThemes.clear();activeRegions.clear();activeSeasons.clear();activeHas.clear();
  document.querySelectorAll('.fchip.on').forEach(b=>b.classList.remove('on'));
  const kw=document.getElementById('f-kw');if(kw) kw.value='';
  const sd=document.getElementById('f-subdir');if(sd) sd.value='';
  const aiQ=document.getElementById('search-ai-q');if(aiQ) aiQ.value='';
  const aiR=document.getElementById('search-ai-result');if(aiR) aiR.style.display='none';
  clearAIFilter();
}

function askContentAI(btn){const input=document.getElementById('search-ai-q');if(input) input.value=btn.dataset.q;runContentAI();}

async function runContentAI(){
  const input=document.getElementById('search-ai-q'),btn=document.getElementById('search-ai-btn'),res=document.getElementById('search-ai-result');
  if(!input||!btn||!res) return;
  const q=input.value.trim();if(!q) return;
  if(AI_CACHE.has(q)){
    res.style.display='block';res.innerHTML=AI_CACHE.get(q);
    const ids=AI_CACHE.get(q+'_ids');
    if(ids){aiFilteredIds=ids;const banner=document.getElementById('search-ai-filter-banner');if(banner)banner.style.display='flex';refreshSearchResults();}
    return;
  }
  btn.disabled=true;res.style.display='block';res.textContent='AI 比對資料庫中…';
  const GEMINI_KEY=window.__GEMINI_KEY__||localStorage.getItem('gemini_key')||'';
  if(!GEMINI_KEY){res.textContent='尚未設定 Gemini API Key，請點右上角齒輪圖示設定';btn.disabled=false;return;}
  const context=contentArticles.map(a=>
    `- 《${a.title}》｜${a.city||''}${a.area||''}｜主題:${getArr(a,'theme').join('+')}｜地方:${getArr(a,'region').join('+')}｜時令:${getArr(a,'season').join('+')}｜`+
    (a.hasStore?`店家(${a.storeKw}) `:'')+(a.hasSnack?`小吃(${a.snackKw}) `:'')+(a.hasGift?`伴手禮(${a.giftKw}) `:'')+(a.hasSight?`景點(${a.sightKw}) `:'')+(a.hasEvent?`活動(${a.eventKw}) `:'')
  ).join('\n');
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
        aiFilteredIds=ids;AI_CACHE.set(q+'_ids',ids);
        const banner=document.getElementById('search-ai-filter-banner');
        if(banner) banner.style.display='flex';
        refreshSearchResults();
      }
      answered=true;break;
    }catch(e){console.warn(model,e.message);}
  }
  if(!answered) res.textContent='所有模型今日額度已滿，請明天再試。';
  btn.disabled=false;
}

// ===== 【6】分頁六：資料庫統計視覺化 =====
function renderDbStats(){
  const el=document.getElementById('view-dbstats');
  
  // IST 設計色票（三分類）
  const COLOR_ALL = '#4A5568'; // 沉穩深藍灰（全資料庫）
  const COLOR_CN  = '#C8621E'; // IST 橘（中文已上架）
  const COLOR_EN  = '#2D3748'; // 洗鍊黑灰（英文已上架）

  el.innerHTML=`
    <div style="background:#fff;border:1px solid ${C_EDGE};padding:1rem 1.25rem;margin-bottom:1rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
      <div style="font-size:13px;color:#1C1C1C;font-weight:500;letter-spacing:.04em">資料庫統計視覺化</div>
      <div id="db-total-badge" style="font-size:12px;color:#6B6B6B;font-weight:500"></div>
    </div>

    <div style="background:${C_BG};border:1px solid ${C_EDGE};padding:10px 14px;margin-bottom:1rem;font-size:11px;color:#6B6B6B;display:flex;gap:16px;flex-wrap:wrap">
      <span><span style="display:inline-block;width:12px;height:12px;background:${COLOR_ALL};margin-right:5px;vertical-align:middle"></span>全資料庫（所有有資料的文章）</span>
      <span><span style="display:inline-block;width:12px;height:12px;background:${COLOR_CN};margin-right:5px;vertical-align:middle"></span>中文已上架（dateZh 有效日期）</span>
      <span><span style="display:inline-block;width:12px;height:12px;background:${COLOR_EN};margin-right:5px;vertical-align:middle"></span>英文已上架（dateEn 有效日期，排除"-"）</span>
    </div>

    <div class="kpi-block" style="margin-bottom:1rem">
      <div class="kpi-header"><span class="kpi-title">五大主題分布</span></div>
      <div class="chart-wrap" style="height:260px"><canvas id="db-theme-chart"></canvas></div>
    </div>

    <div class="kpi-block" style="margin-bottom:1rem">
      <div class="kpi-header"><span class="kpi-title">地方探索分布</span></div>
      <div class="chart-wrap" style="height:240px"><canvas id="db-region-chart"></canvas></div>
    </div>

    <div class="kpi-block" style="margin-bottom:1rem">
      <div class="kpi-header"><span class="kpi-title">時令探索分布</span></div>
      <div class="chart-wrap" style="height:200px"><canvas id="db-season-chart"></canvas></div>
    </div>

    <div class="kpi-block" style="margin-bottom:1rem">
      <div class="kpi-header">
        <span class="kpi-title">子目錄分布</span>
        <span class="kpi-meta" id="db-subdir-meta">點擊長條可查看文章列表</span>
      </div>
      <div class="chart-wrap" id="db-subdir-wrap" style="height:180px"><canvas id="db-subdir-chart"></canvas></div>
    </div>

    <div class="kpi-block">
      <div class="kpi-header"><span class="kpi-title">子目錄結構明細</span><span class="kpi-meta">點擊可查看文章列表</span></div>
      <div id="db-subdir-table"></div>
    </div>`;

  /** 通用群組直條圖產生器（全庫 / 中文上架 / 英文上架） */
  function makeGroupedChart(canvasId,labels,allData){
    return{
      type:'bar',
      data:{
        labels,
        datasets:[
          {label:'全資料庫',data:allData.map(d=>d.total),backgroundColor:COLOR_ALL,borderWidth:0},
          {label:'中文已上架',data:allData.map(d=>d.cn),backgroundColor:COLOR_CN,borderWidth:0},
          {label:'英文已上架',data:allData.map(d=>d.en),backgroundColor:COLOR_EN,borderWidth:0},
        ]
      },
      options:{
        responsive:true,maintainAspectRatio:false,
        plugins:{
          legend:{display:false}, // 已在頂部自訂說明列
          tooltip:{mode:'index',intersect:false,
            callbacks:{label:c=>` ${c.dataset.label}：${c.raw} 篇`}}
        },
        scales:{
          x:{grid:{display:false},ticks:{color:'#9A9A96',font:{size:11}}},
          y:{grid:{color:'rgba(0,0,0,0.05)'},ticks:{color:'#9A9A96',font:{size:10}},min:0,
             title:{display:true,text:'篇數',color:'#9A9A96',font:{size:10}}}
        }
      }
    };
  }

  function updateDbCharts(){
    const allArts=contentArticles;
    const total=allArts.length;
    const badge=document.getElementById('db-total-badge');
    if(badge) badge.textContent=`總計 ${total} 篇`;

    // ★ 模糊比對：值只要「包含」分類關鍵字即算（處理「夏季」→「夏」的情況）
    const matchFuzzy=(a,k,val)=>getArr(a,k).some(v=>v.includes(val)||val.includes(v));

    // ★ 日期判斷統一走 hasDate()，排除 "-" 等無效值
    const hasCn=(a)=>hasDate(a.dateZh);
    const hasEn=(a)=>hasDate(a.dateEn);

    // 主題探索
    const themeData=THEMES.map(t=>({
      total:allArts.filter(a=>matchFuzzy(a,'theme',t)).length,
      cn:allArts.filter(a=>matchFuzzy(a,'theme',t)&&hasCn(a)).length,
      en:allArts.filter(a=>matchFuzzy(a,'theme',t)&&hasEn(a)).length,
    }));
    if(dbThemeChart) dbThemeChart.destroy();
    dbThemeChart=new Chart(document.getElementById('db-theme-chart').getContext('2d'),
      makeGroupedChart('db-theme-chart',THEMES,themeData));

    // 地方探索
    const regionData=REGIONS.map(r=>({
      total:allArts.filter(a=>matchFuzzy(a,'region',r)).length,
      cn:allArts.filter(a=>matchFuzzy(a,'region',r)&&hasCn(a)).length,
      en:allArts.filter(a=>matchFuzzy(a,'region',r)&&hasEn(a)).length,
    }));
    if(dbRegionChart) dbRegionChart.destroy();
    dbRegionChart=new Chart(document.getElementById('db-region-chart').getContext('2d'),
      makeGroupedChart('db-region-chart',REGIONS,regionData));

    // 時令探索（「夏季」.includes("夏") = true，反向也成立）
    const seasonData=SEASONS.map(s=>({
      total:allArts.filter(a=>matchFuzzy(a,'season',s)).length,
      cn:allArts.filter(a=>matchFuzzy(a,'season',s)&&hasCn(a)).length,
      en:allArts.filter(a=>matchFuzzy(a,'season',s)&&hasEn(a)).length,
    }));
    if(dbSeasonChart) dbSeasonChart.destroy();
    dbSeasonChart=new Chart(document.getElementById('db-season-chart').getContext('2d'),
      makeGroupedChart('db-season-chart',SEASONS,seasonData));

    // 子目錄（橫向群組直條圖 + 點擊 Modal）
    const subdirMap={};
    allArts.forEach(a=>{
      getArr(a,'subDir').forEach(s=>{
        if(s){
          if(!subdirMap[s]) subdirMap[s]={total:0,cn:0,en:0};
          subdirMap[s].total++;
          if(hasCn(a)) subdirMap[s].cn++;
          if(hasEn(a)) subdirMap[s].en++;
        }
      });
    });
    const subdirEntries=Object.entries(subdirMap).sort((a,b)=>b[1].total-a[1].total);
    const subdirLabels=subdirEntries.map(([k])=>k);
    const subdirData=subdirEntries.map(([,v])=>v);
    const subdirMeta=document.getElementById('db-subdir-meta');
    if(subdirMeta) subdirMeta.textContent=`共 ${subdirLabels.length} 個子目錄 · 點擊長條查看文章`;
    const chartH=Math.max(180,subdirLabels.length*35+60);
    const wrapEl=document.getElementById('db-subdir-wrap');
    if(wrapEl) wrapEl.style.height=chartH+'px';
    if(dbSubdirChart) dbSubdirChart.destroy();
    if(subdirLabels.length>0){
      dbSubdirChart=new Chart(document.getElementById('db-subdir-chart').getContext('2d'),{
        type:'bar',
        data:{
          labels:subdirLabels,
          datasets:[
            {label:'全資料庫',data:subdirData.map(d=>d.total),backgroundColor:COLOR_ALL,borderWidth:0},
            {label:'中文已上架',data:subdirData.map(d=>d.cn),backgroundColor:COLOR_CN,borderWidth:0},
            {label:'英文已上架',data:subdirData.map(d=>d.en),backgroundColor:COLOR_EN,borderWidth:0},
          ]
        },
        options:{
          indexAxis:'y',responsive:true,maintainAspectRatio:false,
          plugins:{
            legend:{display:false},
            tooltip:{mode:'index',intersect:false,callbacks:{label:c=>` ${c.dataset.label}：${c.raw} 篇`}}
          },
          scales:{
            x:{grid:{color:'rgba(0,0,0,0.05)'},ticks:{color:'#9A9A96',font:{size:10}}},
            y:{grid:{display:false},ticks:{color:'#6B6B6B',font:{size:11}}}
          },
          onClick:(_,elements)=>{
            if(elements.length>0){
              const label=subdirLabels[elements[0].index];
              openSubdirModal(label,allArts);
            }
          }
        }
      });
    }

    // 子目錄明細表（顯示三欄數據 + 點擊 Modal）
    const subdirTable=document.getElementById('db-subdir-table');
    if(subdirTable&&subdirEntries.length>0){
      subdirTable.innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">
        ${subdirEntries.map(([name,counts])=>`
          <div onclick="openSubdirModal(\'${name.replace(/'/g,"\\'")}\', null)"
            style="padding:.875rem;background:${C_BG};border:1px solid ${C_EDGE};cursor:pointer;transition:all .15s"
            onmouseover="this.style.background='#FBF0E8';this.style.borderColor='#EDB896'"
            onmouseout="this.style.background='${C_BG}';this.style.borderColor='${C_EDGE}'">
            <div style="font-size:12px;color:#1C1C1C;margin-bottom:8px;font-weight:500">${name}</div>
            <div style="display:flex;justify-content:space-between;font-size:10px;color:#888780;margin-bottom:3px">
              <span>全資料庫</span><span style="color:${COLOR_ALL};font-weight:600">${counts.total}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:10px;color:#888780;margin-bottom:3px">
              <span>中文已上架</span><span style="color:${COLOR_CN};font-weight:600">${counts.cn}</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:10px;color:#888780">
              <span>英文已上架</span><span style="color:${COLOR_EN};font-weight:600">${counts.en}</span>
            </div>
          </div>`).join('')}
      </div>`;
    } else if(subdirTable){
      subdirTable.innerHTML=`<div style="text-align:center;padding:1.5rem;font-size:12px;color:#9A9A96">尚無子目錄資料，請填入 Excel 子目錄欄位後執行 sync_content.py</div>`;
    }
  }

  updateDbCharts();
}

/** 子目錄 Popup Modal（用 makeCard 渲染文章卡片） */
function openSubdirModal(subdirName,base){
  const pool=base||contentArticles;
  // 使用模糊比對，與圖表篩選邏輯一致
  const arts=pool.filter(a=>getArr(a,'subDir').some(v=>v.includes(subdirName)||subdirName.includes(v)));
  const overlay=document.createElement('div');
  overlay.id='subdir-modal-overlay';
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:flex-start;justify-content:center;padding:32px 16px;overflow-y:auto';
  overlay.onclick=e=>{if(e.target===overlay){overlay.remove();document.body.style.overflow='';}};
  overlay.innerHTML=`
    <div style="background:#fff;width:100%;max-width:900px;box-shadow:0 24px 64px rgba(0,0,0,0.18)">
      <div style="padding:20px 24px 16px;border-bottom:2px solid ${C_ORANGE};display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:#fff;z-index:1">
        <div>
          <div style="font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:${C_ORANGE};margin-bottom:3px">子目錄文章清單</div>
          <h2 style="font-size:18px;font-weight:500;color:#1C1C1C;margin:0">${subdirName}</h2>
          <div style="font-size:11px;color:#9A9A96;margin-top:3px">共 ${arts.length} 篇文章</div>
        </div>
        <button onclick="document.getElementById('subdir-modal-overlay').remove();document.body.style.overflow=''"
          style="width:32px;height:32px;border-radius:2px;border:1px solid ${C_EDGE};background:${C_BG};cursor:pointer;font-size:18px;color:#6B6B6B;flex-shrink:0;line-height:1;padding:0">×</button>
      </div>
      <div style="padding:20px 24px 28px">
        ${arts.length>0
          ?`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px">${arts.map(a=>makeCard(a)).join('')}</div>`
          :`<div style="text-align:center;padding:2rem;font-size:13px;color:#9A9A96">此子目錄目前無文章</div>`}
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.body.style.overflow='hidden';
}

// ===== 【7】文章詳情 Modal =====

/** 智慧斷段，相容空行與標點 */
function formatContent(raw){
  if(!raw) return '<p style="color:#9A9A96">（無內文）</p>';
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
    .map(p=>`<p style="margin:0 0 1.1em 0;font-size:15px;color:#1C1C1C;line-height:1.9;text-align:justify">${p}</p>`).join('');
}

/**
 * ★ 關鍵字高亮函式
 * 將關鍵字字串（逗號/頓號分隔）以橘紅色粗體標記在 HTML 中
 */
function highlightKeywords(html,kwStr){
  if(!kwStr) return html;
  // 支援逗號、頓號、空格分隔的多個關鍵字
  const kws=kwStr.split(/[,，、\s]+/).map(s=>s.trim()).filter(s=>s.length>=2);
  let result=html;
  kws.forEach(kw=>{
    // 避免對已高亮的 span 內容再次替換
    const escaped=kw.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    const re=new RegExp(`(?<!<[^>]*)${escaped}(?![^<]*>)`,'g');
    result=result.replace(re,`<span style="font-weight:bold;color:#E24B4A">${kw}</span>`);
  });
  return result;
}

function openArticleModal(id){
  const a=contentArticles.find(x=>x.id===id);if(!a) return;
  const hasList=[
    {has:a.hasStore,label:'店家',kw:a.storeKw},
    {has:a.hasSnack,label:'小吃',kw:a.snackKw},
    {has:a.hasGift,label:'伴手禮',kw:a.giftKw},
    {has:a.hasSight,label:'景點',kw:a.sightKw},
    {has:a.hasEvent,label:'活動',kw:a.eventKw},
  ].filter(h=>h.has);

  // ★ 收集所有關鍵字字串（用於高亮）
  const allKwStr=[a.storeKw,a.snackKw,a.giftKw,a.sightKw,a.eventKw].filter(Boolean).join(',');

  // 先格式化內文，再做關鍵字高亮
  let contentHtml=formatContent(a.content);
  if(allKwStr) contentHtml=highlightKeywords(contentHtml,allKwStr);

  const overlay=document.createElement('div');
  overlay.id='article-modal-overlay';
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:flex-start;justify-content:center;padding:32px 16px;overflow-y:auto';
  overlay.onclick=e=>{if(e.target===overlay) closeArticleModal();};
  const rColors={
    '北部':`background:#FBF0E8;color:#9C4A12`,
    '中部':`background:#D1FAE5;color:#1A6B45`,
    '南部':`background:#FEF3C7;color:#A35200`,
    '東部':`background:${C_SURF};color:${C_DARK}`,
    '離島':`background:#EEEDFE;color:#3C3489`,
  };
  overlay.innerHTML=`
    <div style="background:#fff;width:100%;max-width:700px;box-shadow:0 24px 64px rgba(0,0,0,0.18);overflow:hidden">
      <div style="padding:26px 30px 20px;border-bottom:1.5px solid ${C_SURF};position:sticky;top:0;background:#fff;z-index:1">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:12px">
          <h2 style="font-size:19px;font-weight:500;color:#1C1C1C;line-height:1.5;flex:1;margin:0">${a.title}</h2>
          <button onclick="closeArticleModal()" style="width:32px;height:32px;border-radius:2px;border:1px solid ${C_EDGE};background:${C_BG};cursor:pointer;font-size:18px;color:#6B6B6B;flex-shrink:0;line-height:1;padding:0">×</button>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:${hasList.length>0?'12px':'0'}">
          ${a.year?`<span style="font-size:10px;padding:2px 9px;border-radius:2px;font-weight:600;background:#FEF3C7;color:#A35200">${a.year}</span>`:''}
          ${a.city||a.area?`<span style="font-size:10px;padding:2px 9px;border-radius:2px;font-weight:500;background:${C_SURF};color:#5F5E5A">${[a.city,a.area].filter(Boolean).join(' · ')}</span>`:''}
          ${getArr(a,'region').map(r=>`<span style="font-size:10px;padding:2px 9px;border-radius:2px;font-weight:500;${rColors[r]||`background:${C_SURF};color:#6B6B6B`}">${r}</span>`).join('')}
          ${getArr(a,'theme').map(t=>`<span style="font-size:10px;padding:2px 9px;border-radius:2px;font-weight:500;background:#EEEDFE;color:#3C3489">${t}</span>`).join('')}
          ${getArr(a,'season').map(s=>`<span style="font-size:10px;padding:2px 9px;border-radius:2px;font-weight:500;background:#D1FAE5;color:#1A6B45">${s}</span>`).join('')}
          ${getArr(a,'subDir').map(d=>`<span style="font-size:10px;padding:2px 9px;border-radius:2px;font-weight:500;background:${C_SURF};color:#5F5E5A">${d}</span>`).join('')}
        </div>
        ${hasList.length>0?`
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:6px">
            ${hasList.map(h=>`
              <div style="background:${C_BG};border:1px solid ${C_EDGE};padding:7px 10px">
                <div style="font-size:9px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#6B6B6B;margin-bottom:3px">${h.label}</div>
                <div style="font-size:11px;color:#1C1C1C;line-height:1.4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${h.kw||'—'}">${h.kw||'—'}</div>
              </div>`).join('')}
          </div>`:''}
      </div>
      <!-- ★ 內文已套用關鍵字高亮 -->
      <div style="padding:26px 30px 36px;max-height:60vh;overflow-y:auto">
        <div style="max-width:560px;margin:0 auto">${contentHtml}</div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.body.style.overflow='hidden';
}
function closeArticleModal(){const el=document.getElementById('article-modal-overlay');if(el) el.remove();document.body.style.overflow='';}

// ===== 【8】後台 Modal =====
function openModal(id){
  editingId=id;
  const m=id?articles.find(a=>a.id===id):null;
  document.getElementById('modal-title').textContent=id?'編輯文章':'新增文章';
  const mY=document.getElementById('m-year');
  if(mY) mY.innerHTML=(config.years||[]).map(y=>`<option${(m?m.year:FIXED_YEAR)===y?' selected':''}>${y}</option>`).join('');
  document.getElementById('m-title').value=m?m.title:'';
  document.getElementById('m-status').value=m?m.status:'待初審';
  document.getElementById('m-date-zh').value=m?m.dateZh||'':'';
  document.getElementById('m-date-en').value=m?m.dateEn||'':'';
  document.getElementById('ops-modal').classList.add('open');
}
function closeModal(){document.getElementById('ops-modal').classList.remove('open');}

function saveArticle(){
  const title=document.getElementById('m-title').value.trim();
  if(!title) return;
  const data={
    year:document.getElementById('m-year').value,
    title,
    status:document.getElementById('m-status').value,
    dateZh:document.getElementById('m-date-zh').value,
    dateEn:document.getElementById('m-date-en').value,
  };
  if(editingId){
    const i=articles.findIndex(a=>a.id===editingId);
    if(i>-1) articles[i]={...articles[i],...data};
  } else {
    articles.push({id:Date.now(),...data});
  }
  closeModal();renderOps();
}

function exportCSV(){
  const base=opsYear==='all'?articles:articles.filter(a=>a.year===opsYear);
  const rows=[['年份','標題','狀態','中文上架日','英文上架日']];
  base.forEach(a=>rows.push([a.year,a.title,a.status,a.dateZh||'',a.dateEn||'']));
  const csv=rows.map(r=>r.map(c=>`"${c}"`).join(',')).join('\n');
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
  const link=document.createElement('a');
  link.href=URL.createObjectURL(blob);
  link.download=`articles_${opsYear}.csv`;
  link.click();
}
