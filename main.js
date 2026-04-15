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

function getStats(arts) {
  const lzQ={},leQ={},fzQ={},feQ={};
  QS.forEach(q=>{lzQ[q]=0;leQ[q]=0;fzQ[q]=0;feQ[q]=0;});
  arts.forEach(a=>{
    if(a.liveZh) lzQ[a.q]++;
    if(a.liveEn) leQ[a.q]++;
    if(a.dateZh||a.liveZh) fzQ[a.q]++;
    if(a.dateEn||a.liveEn) feQ[a.q]++;
  });
  return {lzQ,leQ,fzQ,feQ};
}

function kpiBlock(lang,stats,elId) {
  const kpi=config.kpi[FIXED_YEAR][lang];
  const isZh=lang==='zh';
  const liveByQ=isZh?stats.lzQ:stats.leQ;
  const fcByQ=isZh?stats.fzQ:stats.feQ;
  const totalT=Object.values(kpi).reduce((a,b)=>a+b,0);
  const totalL=Object.values(liveByQ).reduce((a,b)=>a+b,0);
  const totalF=Object.values(fcByQ).reduce((a,b)=>a+b,0);
  const color=isZh?'#185FA5':'#1D9E75';
  const colorLight=isZh?'#B5D4F4':'#9FE1CB';
  const rows=QS.map(q=>{
    const t=kpi[q],l=liveByQ[q]||0,f=fcByQ[q]||0;
    const lp=Math.min(100,pct(l,t)),fp=Math.min(100,pct(f,t));
    return`<div class="progress-row">
      <span class="p-label">${q} 目標 ${t}</span>
      <div class="p-track">
        <div class="p-fc" style="width:${fp}%;background:${colorLight}"></div>
        <div class="p-ac" style="width:${lp}%;background:${color}"></div>
      </div>
      <div class="p-nums">已上架 <strong>${l}</strong>，預計達 <strong>${f}</strong></div>
      ${pill(pct(l,t))}
    </div>`;
  }).join('');
  document.getElementById(elId).innerHTML=`
    <div class="kpi-header">
      <span class="kpi-title">${isZh?'中文稿':'英文稿'} ${FIXED_YEAR} KPI</span>
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

function buildCumData(lang,arts) {
  const kpi=config.kpi[FIXED_YEAR][lang];
  const lbm=Array(12).fill(0);
  arts.forEach(a=>{
    const ds=lang==='zh'?a.dateZh:a.dateEn;
    const lv=lang==='zh'?a.liveZh:a.liveEn;
    if(lv&&ds){const m=new Date(ds).getMonth();if(m>=0&&m<12)lbm[m]++;}
  });
  const cumA=[];let s=0;
  lbm.forEach(v=>{s+=v;cumA.push(s);});
  const cumT=[];let ts=0;
  QS.forEach(q=>{const pm=kpi[q]/3;[0,1,2].forEach(()=>{ts+=pm;cumT.push(Math.round(ts));});});
  return{cumA,cumT};
}

// ===== 後台編輯版年份切換 =====
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

// ===== 分頁一：長官報告版（固定2026） =====
function renderExec() {
  const arts=contentArticles.filter(a=>a.year===FIXED_YEAR);
  const artsData=articles.filter(a=>a.year===FIXED_YEAR);
  const total=arts.length;
  const cnPub=arts.filter(a=>a.dateZh).length;
  const enPub=arts.filter(a=>a.dateEn).length;
  const cnUnpub=total-cnPub;
  const enUnpub=total-enPub;
  const translating=arts.filter(a=>!a.dateEn&&a.status==='翻譯中').length;
  const pending=arts.filter(a=>!a.dateEn&&a.status!=='翻譯中'&&a.dateZh).length;

  document.getElementById('view-exec').innerHTML=`
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:1.25rem">
      <span style="font-size:12px;color:#888780">報告年度</span>
      <span style="font-size:12px;padding:3px 14px;border-radius:12px;background:#185FA5;color:#fff;font-weight:500">${FIXED_YEAR}</span>
      <span style="font-size:11px;color:#b4b2a9">長官報告版僅顯示當年度資料</span>
    </div>

    <div style="background:#fff;border:1px solid #e8e8e4;border-radius:14px;padding:1.5rem;margin-bottom:1rem">
      <div style="font-size:11px;font-weight:500;color:#888780;margin-bottom:8px;letter-spacing:.04em">2.1 總文章數</div>
      <div style="display:flex;align-items:flex-end;gap:16px;margin-bottom:16px;flex-wrap:wrap">
        <div style="font-size:52px;font-weight:500;color:#1a1a1a;line-height:1">${total}</div>
        <div style="padding-bottom:6px">
          <div style="font-size:12px;color:#888780;margin-bottom:6px">${FIXED_YEAR} 年度收稿總計</div>
          <div style="display:flex;gap:12px;font-size:11px;color:#888780">
            <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:50%;background:#185FA5;display:inline-block"></span>中文已上架 ${pct(cnPub,total)}%</span>
            <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:50%;background:#1D9E75;display:inline-block"></span>英文已上架 ${pct(enPub,total)}%</span>
            <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:50%;background:#f1efe8;border:1px solid #e8e8e4;display:inline-block"></span>未上架 ${pct(cnUnpub,total)}%</span>
          </div>
        </div>
      </div>
      <div style="display:flex;gap:2px;height:12px;border-radius:6px;overflow:hidden">
        ${cnPub>0?`<div style="flex:${cnPub};background:#185FA5" title="中文上架 ${cnPub}"></div>`:''}
        ${enPub>0?`<div style="flex:${enPub};background:#1D9E75" title="英文上架 ${enPub}"></div>`:''}
        ${cnUnpub>0?`<div style="flex:${cnUnpub};background:#f1efe8" title="未上架 ${cnUnpub}"></div>`:''}
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
      <div style="background:#E6F1FB;border:1px solid #B5D4F4;border-radius:14px;padding:1.25rem">
        <div style="font-size:11px;font-weight:500;color:#185FA5;margin-bottom:10px">2.2 已上架文章數</div>
        <div style="font-size:36px;font-weight:500;color:#185FA5;line-height:1;margin-bottom:4px">${cnPub}</div>
        ${pgBar(pct(cnPub,total),'#185FA5','8px')}
        <div style="font-size:11px;color:#0C447C;margin-top:5px;margin-bottom:16px">${pct(cnPub,total)}% 的文章已上架</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div style="background:rgba(255,255,255,0.75);border-radius:10px;padding:.875rem">
            <div style="font-size:10px;color:#185FA5;margin-bottom:4px">2.2.1 中文上架數</div>
            <div style="font-size:24px;font-weight:500;color:#185FA5">${cnPub}</div>
            ${pgBar(pct(cnPub,total),'#185FA5')}
            <div style="font-size:10px;color:#0C447C;margin-top:3px">覆蓋率 ${pct(cnPub,total)}%</div>
          </div>
          <div style="background:rgba(255,255,255,0.75);border-radius:10px;padding:.875rem">
            <div style="font-size:10px;color:#0F6E56;margin-bottom:4px">2.2.2 英文上架數</div>
            <div style="font-size:24px;font-weight:500;color:#1D9E75">${enPub}</div>
            ${pgBar(pct(enPub,total),'#1D9E75')}
            <div style="font-size:10px;color:#085041;margin-top:3px">覆蓋率 ${pct(enPub,total)}%</div>
          </div>
        </div>
      </div>

      <div style="background:#FAEEDA;border:1px solid #FAC775;border-radius:14px;padding:1.25rem">
        <div style="font-size:11px;font-weight:500;color:#854F0B;margin-bottom:10px">2.3 未上架文章數（含待改稿等）</div>
        <div style="font-size:36px;font-weight:500;color:#854F0B;line-height:1;margin-bottom:4px">${cnUnpub}</div>
        ${pgBar(pct(cnUnpub,total),'#EF9F27','8px')}
        <div style="font-size:11px;color:#854F0B;margin-top:5px;margin-bottom:16px">${pct(cnUnpub,total)}% 仍在製作流程中</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
          <div style="background:rgba(255,255,255,0.75);border-radius:10px;padding:.875rem">
            <div style="font-size:10px;color:#854F0B;margin-bottom:4px">2.3.1 中文未上架</div>
            <div style="font-size:24px;font-weight:500;color:#854F0B">${cnUnpub}</div>
            ${pgBar(pct(cnUnpub,total),'#EF9F27')}
          </div>
          <div style="background:rgba(255,255,255,0.75);border-radius:10px;padding:.875rem">
            <div style="font-size:10px;color:#854F0B;margin-bottom:4px">2.3.2 英文未上架</div>
            <div style="font-size:24px;font-weight:500;color:#854F0B">${enUnpub}</div>
            ${pgBar(pct(enUnpub,total),'#EF9F27')}
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div style="background:rgba(255,255,255,0.6);border-radius:10px;padding:.875rem;border-left:3px solid #534AB7">
            <div style="font-size:10px;color:#534AB7;margin-bottom:4px">2.3.2.1 翻譯中</div>
            <div style="font-size:22px;font-weight:500;color:#534AB7">${translating}</div>
            <div style="font-size:10px;color:#3C3489;margin-top:2px">進行中</div>
          </div>
          <div style="background:rgba(255,255,255,0.6);border-radius:10px;padding:.875rem;border-left:3px solid #888780">
            <div style="font-size:10px;color:#888780;margin-bottom:4px">2.3.2.2 待翻譯</div>
            <div style="font-size:22px;font-weight:500;color:#888780">${pending}</div>
            <div style="font-size:10px;color:#5F5E5A;margin-top:2px">排隊中</div>
          </div>
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
      <div class="kpi-block" id="exec-kpi-zh"></div>
      <div class="kpi-block" id="exec-kpi-en"></div>
    </div>

    <div class="kpi-block">
      <div class="kpi-header"><span class="kpi-title">${FIXED_YEAR} 全年累積上架進度</span><span class="kpi-meta">實際累積 vs 目標進度線</span></div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:11px;color:#888780;margin-bottom:10px">
        <span><span class="ld" style="background:#185FA5"></span>中文實際</span>
        <span><span class="ld" style="background:#1D9E75"></span>英文實際</span>
        <span><span class="ld" style="background:#D3D1C7"></span>中文目標</span>
        <span><span class="ld" style="background:#9FE1CB"></span>英文目標</span>
      </div>
      <div class="chart-wrap" style="height:220px"><canvas id="exec-chart"></canvas></div>
    </div>
    <div class="watermark">${FIXED_YEAR} 年度報告 · 資料來源：內容資料庫 + 進度管理</div>`;

  const stats=getStats(artsData);
  kpiBlock('zh',stats,'exec-kpi-zh');
  kpiBlock('en',stats,'exec-kpi-en');
  const dZh=buildCumData('zh',artsData),dEn=buildCumData('en',artsData);
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

// ===== 月別統計（從 weekly.json 計算） =====
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

// ===== 分頁二：主管報告版（固定2026） =====
function renderMgr() {
  const weeks=(weeklyData.weeks||[]).filter(w=>w.week.startsWith(FIXED_YEAR));
  const arts=articles.filter(a=>a.year===FIXED_YEAR);
  const stats=getStats(arts);
  const kpi=config.kpi[FIXED_YEAR];
  const totalTZh=Object.values(kpi.zh).reduce((a,b)=>a+b,0);
  const totalTEn=Object.values(kpi.en).reduce((a,b)=>a+b,0);
  const totalLZh=Object.values(stats.lzQ).reduce((a,b)=>a+b,0);
  const totalLEn=Object.values(stats.leQ).reduce((a,b)=>a+b,0);
  const today=new Date(); today.setHours(0,0,0,0);
  const overdue=arts.filter(a=>!a.liveZh&&a.dateZh&&new Date(a.dateZh)<today).length;
  const stuck=arts.filter(a=>a.status==='翻譯中'&&a.dateZh&&(today-new Date(a.dateZh))/86400000>7).length;

  // 算當前季度
  const nowQ='Q'+(Math.ceil((new Date().getMonth()+1)/3));
  const qLZh=stats.lzQ[nowQ]||0,qLEn=stats.leQ[nowQ]||0;
  const qTZh=kpi.zh[nowQ]||0,qTEn=kpi.en[nowQ]||0;

  // 最新週
  const lastWeek=weeks.length>0?weeks[weeks.length-1]:null;
  const wkCnA=lastWeek?lastWeek.cnAchieve:0;
  const wkEnA=lastWeek?lastWeek.enAchieve:0;

  // 月統計
  const monthStats=getMonthlyStats(weeks);
  const nowMoKey=`${FIXED_YEAR}-${String(new Date().getMonth()+1).padStart(2,'0')}`;
  const nowMo=monthStats.find(m=>m.key===nowMoKey);
  const moCnA=nowMo?nowMo.cnAchieve:0;
  const moEnA=nowMo?nowMo.enAchieve:0;

  const rateCard=(label,cnP,enP)=>`
    <div style="background:#fff;border:1px solid #e8e8e4;border-radius:12px;padding:1rem">
      <div style="font-size:11px;color:#888780;margin-bottom:8px">${label}</div>
      <div style="margin-bottom:6px">
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
          <span style="color:#185FA5">CN 中文</span>
          <span style="font-weight:500;color:${pctColor(cnP)}">${cnP}%</span>
        </div>
        ${pgBar(cnP,'#185FA5')}
      </div>
      <div>
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
          <span style="color:#1D9E75">EN 英文</span>
          <span style="font-weight:500;color:${pctColor(enP)}">${enP}%</span>
        </div>
        ${pgBar(enP,'#1D9E75')}
      </div>
    </div>`;

  document.getElementById('view-mgr').innerHTML=`
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:1.25rem">
      <span style="font-size:12px;padding:3px 14px;border-radius:12px;background:#185FA5;color:#fff;font-weight:500">${FIXED_YEAR}</span>
      <span style="font-size:11px;color:#b4b2a9">主管報告版 · 固定顯示當年度</span>
    </div>

    <div style="background:#fff;border:1px solid #e8e8e4;border-radius:12px;padding:1.25rem;margin-bottom:1rem">
      <div style="font-size:13px;font-weight:500;margin-bottom:14px">3.1 達標率概覽</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px">
        ${rateCard('年達標率（年度至今）',pct(totalLZh,totalTZh),pct(totalLEn,totalTEn))}
        ${rateCard(`季達標率（${nowQ}）`,pct(qLZh,qTZh),pct(qLEn,qTEn))}
        ${rateCard(`月達標率（本月）`,moCnA,moEnA)}
        ${rateCard(`週達標率（本週）`,wkCnA,wkEnA)}
        <div style="background:${(lastWeek&&lastWeek.enDanger)?'#FCEBEB':(lastWeek&&lastWeek.enWarn)?'#FAEEDA':'#EAF3DE'};border:1px solid ${(lastWeek&&lastWeek.enDanger)?'#F7C1C1':(lastWeek&&lastWeek.enWarn)?'#FAC775':'#C0DD97'};border-radius:12px;padding:1rem">
          <div style="font-size:11px;color:${(lastWeek&&lastWeek.enDanger)?'#A32D2D':(lastWeek&&lastWeek.enWarn)?'#854F0B':'#3B6D11'};margin-bottom:8px">英譯庫存水位</div>
          <div style="font-size:32px;font-weight:500;color:${(lastWeek&&lastWeek.enDanger)?'#A32D2D':(lastWeek&&lastWeek.enWarn)?'#854F0B':'#1D9E75'};line-height:1">${lastWeek?lastWeek.enStock:'—'}</div>
          <div style="font-size:11px;margin-top:5px;color:${(lastWeek&&lastWeek.enDanger)?'#A32D2D':(lastWeek&&lastWeek.enWarn)?'#854F0B':'#3B6D11'}">${lastWeek?(lastWeek.enDanger?'🔴 危險：需立即補充':(lastWeek.enWarn?'🟡 偏低：建議補充':'🟢 水位正常')):'尚無資料'}</div>
          ${lastWeek&&lastWeek.enDanger?`<div style="font-size:10px;color:#A32D2D;margin-top:4px">待翻排程：${lastWeek.enPending} 篇可調度</div>`:''}
        </div>
      </div>
    </div>

    <div class="kpi-block" style="margin-bottom:1rem" id="mgr-monthly-section"></div>

    <div id="mgr-weekly-section"></div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
      <div class="kpi-block" id="mgr-kpi-zh"></div>
      <div class="kpi-block" id="mgr-kpi-en"></div>
    </div>

    <div class="kpi-block">
      <div class="kpi-header"><span class="kpi-title">各季文章狀態分布</span><span class="kpi-meta">${FIXED_YEAR} 年度</span></div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:11px;color:#888780;margin-bottom:10px">
        <span><span class="ld" style="background:#185FA5"></span>中文上架</span>
        <span><span class="ld" style="background:#1D9E75"></span>英文上架</span>
        <span><span class="ld" style="background:#EF9F27"></span>翻譯/待上架</span>
        <span><span class="ld" style="background:#7F77DD"></span>審稿中</span>
      </div>
      <div class="chart-wrap" style="height:200px"><canvas id="mgr-chart"></canvas></div>
    </div>`;

  // 月別達標率區塊
  const mgrMonthEl=document.getElementById('mgr-monthly-section');
  if(monthStats.length>0){
    mgrMonthEl.innerHTML=`
      <div class="kpi-header"><span class="kpi-title">3.2 月別達標率</span><span class="kpi-meta">從週別記錄加總計算</span></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px">
        ${monthStats.map(m=>`
          <div style="padding:.75rem;background:#f9f9f7;border-radius:8px;border:1px solid #f1efe8">
            <div style="font-size:11px;font-weight:500;color:#1a1a1a;margin-bottom:7px">${m.label}</div>
            <div style="font-size:10px;color:#888780;margin-bottom:2px;display:flex;justify-content:space-between">
              <span>CN</span><span style="color:${pctColor(m.cnAchieve)};font-weight:500">${m.cnAchieve}%</span>
            </div>
            ${pgBar(m.cnAchieve,'#185FA5')}
            <div style="font-size:10px;color:#888780;margin-top:5px;margin-bottom:2px;display:flex;justify-content:space-between">
              <span>EN</span><span style="color:${pctColor(m.enAchieve)};font-weight:500">${m.enAchieve}%</span>
            </div>
            ${pgBar(m.enAchieve,'#1D9E75')}
            <div style="font-size:9px;color:#b4b2a9;margin-top:5px">CN ${m.cnAct}/${m.cnPlan} · EN ${m.enAct}/${m.enPlan}</div>
          </div>`).join('')}
      </div>`;
  } else {
    mgrMonthEl.innerHTML=`<div class="kpi-header"><span class="kpi-title">3.2 月別達標率</span></div><div style="text-align:center;padding:1.5rem;font-size:12px;color:#b4b2a9">尚無週別記錄，請在 Excel 填入後執行 sync.py</div>`;
  }

  kpiBlock('zh',stats,'mgr-kpi-zh');
  kpiBlock('en',stats,'mgr-kpi-en');
  if(mgrChart) mgrChart.destroy();
  mgrChart=new Chart(document.getElementById('mgr-chart').getContext('2d'),{
    type:'bar',
    data:{labels:QS,datasets:[
      {label:'中文上架',data:QS.map(q=>stats.lzQ[q]||0),backgroundColor:'#185FA5'},
      {label:'英文上架',data:QS.map(q=>stats.leQ[q]||0),backgroundColor:'#1D9E75'},
      {label:'翻譯/待上架',data:QS.map(q=>arts.filter(a=>a.q===q&&(a.status==='翻譯中'||a.status==='待上架')).length),backgroundColor:'#EF9F27'},
      {label:'審稿中',data:QS.map(q=>arts.filter(a=>a.q===q&&a.status==='審稿/校稿').length),backgroundColor:'#7F77DD'},
    ]},
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{mode:'index',intersect:false}},
      scales:{x:{stacked:true,grid:{display:false},ticks:{color:'#888780',font:{size:11}}},
        y:{stacked:true,grid:{color:'rgba(136,135,128,0.12)'},ticks:{color:'#888780',font:{size:11},stepSize:5}}}}
  });

  if(weeks.length>0) renderWeeklySection(weeks,overdue,stuck);
  else document.getElementById('mgr-weekly-section').innerHTML=`
    <div class="kpi-block" style="margin-bottom:1rem;text-align:center;padding:2rem">
      <div style="font-size:13px;color:#888780">尚無 ${FIXED_YEAR} 週別記錄</div>
      <div style="font-size:11px;color:#b4b2a9;margin-top:6px">請在 Excel「週別紀錄」工作表填入數據後執行 sync.py</div>
    </div>`;
}

function renderWeeklySection(weeks,overdue,stuck) {
  let idx=weeks.length-1;
  function pCtColor(p){return p>=100?'#0F6E56':p>=80?'#854F0B':'#A32D2D';}
  function pCtBadge(p){return`font-size:10px;padding:2px 7px;border-radius:8px;font-weight:500;background:${p>=100?'#EAF3DE':p>=80?'#FAEEDA':'#FCEBEB'};color:${pCtColor(p)}`;}

  function weekCard(w) {
    const tc=w.transRate>=80?'#1D9E75':w.transRate>=50?'#EF9F27':'#E24B4A';
    const ed=w.enDanger,ew=w.enWarn&&!ed;
    const sc=ed?'#A32D2D':ew?'#854F0B':'#1D9E75';
    const actions=[];
    if(ed) actions.push({t:'urgent',m:`EN 庫存僅剩 ${w.enStock} 篇，已低於警戒線。需從待翻排程（${w.enPending} 篇）優先送譯至少 5 篇。`});
    else if(ew) actions.push({t:'warn',m:`EN 庫存 ${w.enStock} 篇，接近警戒線。建議本週補充翻譯 3 篇以上。`});
    if(w.transRate<80) actions.push({t:'warn',m:`中英轉譯率 ${w.transRate}%，低於建議值 80%，建議評估增加翻譯資源。`});
    if(w.enAchieve<80) actions.push({t:'urgent',m:`本週 EN 達成率僅 ${w.enAchieve}%，請確認翻譯卡關原因。`});
    if(w.cnAchieve>=100&&w.cnReady>15) actions.push({t:'normal',m:`CN 達成率 ${w.cnAchieve}%，Ready 庫存 ${w.cnReady} 篇充裕，可推進翻譯流程。`});
    if(overdue>0) actions.push({t:'warn',m:`共 ${overdue} 篇逾期未上架，請確認處理進度。`});
    if(stuck>0) actions.push({t:'warn',m:`共 ${stuck} 篇翻譯超過 7 天未更新，需追蹤。`});
    if(actions.length===0) actions.push({t:'normal',m:'本週各項指標正常，請維持現有節奏。'});

    const row=(label,hint,cn,en)=>`
      <div style="display:grid;grid-template-columns:180px 1fr 1fr;border-bottom:1px solid #f1efe8">
        <div style="padding:12px 16px;display:flex;align-items:center"><div><strong style="display:block;font-size:12px;color:#1a1a1a">${label}</strong>${hint?`<span style="font-size:10px;color:#888780">${hint}</span>`:''}</div></div>
        <div style="padding:12px 16px;border-left:1px solid #f1efe8;display:flex;align-items:center;gap:8px">${cn}</div>
        <div style="padding:12px 16px;border-left:1px solid #f1efe8;display:flex;align-items:center;gap:8px">${en}</div>
      </div>`;
    const progCell=(act,plan)=>`<div style="flex:1">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:22px;font-weight:500;color:${pCtColor(pct(act,plan))}">${act}</span>
        <span style="${pCtBadge(pct(act,plan))}">${pct(act,plan)}%</span>
      </div>
      ${pgBar(Math.min(100,pct(act,plan)),pCtColor(pct(act,plan)))}
      <div style="font-size:10px;color:#b4b2a9;margin-top:3px">計畫 ${plan} 篇</div>
    </div>`;

    return`
      <div style="background:#fff;border:1px solid #e8e8e4;border-radius:12px;overflow:hidden;margin-bottom:1rem">
        <div style="display:grid;grid-template-columns:180px 1fr 1fr;border-bottom:1px solid #e8e8e4">
          <div style="padding:12px 16px;font-size:12px;font-weight:500;color:#888780"><span style="font-size:10px;color:#b4b2a9;display:block;margin-bottom:2px">${w.week}</span>指標項目</div>
          <div style="padding:12px 16px;font-size:12px;font-weight:500;background:#E6F1FB;color:#0C447C;border-left:1px solid #e8e8e4"><span style="font-size:10px;font-weight:400;display:block;margin-bottom:2px">中文內容</span>CN 中文稿</div>
          <div style="padding:12px 16px;font-size:12px;font-weight:500;background:#E1F5EE;color:#085041;border-left:1px solid #e8e8e4"><span style="font-size:10px;font-weight:400;display:block;margin-bottom:2px">英譯內容</span>EN 英譯稿</div>
        </div>
        <div style="font-size:10px;color:#888780;padding:5px 16px;background:#fafaf8;border-bottom:1px solid #f1efe8;font-weight:500">本週產出</div>
        ${row('本週預計上架','週計畫目標',`<span style="font-size:22px;font-weight:500;color:#185FA5">${w.cnPlan}</span><span style="font-size:11px;color:#888780;margin-left:4px">篇</span>`,`<span style="font-size:22px;font-weight:500;color:#1D9E75">${w.enPlan}</span><span style="font-size:11px;color:#888780;margin-left:4px">篇</span>`)}
        <div style="display:grid;grid-template-columns:180px 1fr 1fr;border-bottom:1px solid #f1efe8">
          <div style="padding:12px 16px;display:flex;align-items:center"><div><strong style="display:block;font-size:12px;color:#1a1a1a">本週實際上架</strong><span style="font-size:10px;color:#888780">已完成發出</span></div></div>
          <div style="padding:12px 16px;border-left:1px solid #f1efe8">${progCell(w.cnAct,w.cnPlan)}</div>
          <div style="padding:12px 16px;border-left:1px solid #f1efe8">${progCell(w.enAct,w.enPlan)}</div>
        </div>
        <div style="font-size:10px;color:#888780;padding:5px 16px;background:#fafaf8;border-bottom:1px solid #f1efe8;font-weight:500">累計總量</div>
        ${row('累計總上架','',`<span style="font-size:22px;font-weight:500;color:#185FA5">${w.cnCum}</span><span style="font-size:10px;color:#888780;margin-left:6px">篇（計畫 ${w.cnPlanCum}）</span>`,`<span style="font-size:22px;font-weight:500;color:#1D9E75">${w.enCum}</span><span style="font-size:10px;color:#888780;margin-left:6px">篇（計畫 ${w.enPlanCum}）</span>`)}
        <div style="display:grid;grid-template-columns:180px 1fr;border-bottom:1px solid #f1efe8">
          <div style="padding:12px 16px;display:flex;align-items:center"><div><strong style="display:block;font-size:12px;color:#1a1a1a">中英轉譯率</strong><span style="font-size:10px;color:#888780">EN累計 ÷ CN累計</span></div></div>
          <div style="padding:12px 16px;border-left:1px solid #f1efe8">
            <div style="display:flex;align-items:center;gap:10px">
              <span style="font-size:26px;font-weight:500;color:${tc}">${w.transRate}%</span>
              <span style="font-size:10px;padding:2px 7px;border-radius:8px;font-weight:500;background:${w.transRate>=80?'#EAF3DE':w.transRate>=50?'#FAEEDA':'#FCEBEB'};color:${tc}">${w.transRate>=80?'健康':w.transRate>=50?'偏低':'警告'}</span>
              <span style="font-size:11px;color:#b4b2a9">EN ${w.enCum} ÷ CN ${w.cnCum}</span>
            </div>
            ${pgBar(Math.min(100,w.transRate),tc,'8px')}
          </div>
        </div>
        <div style="font-size:10px;color:#888780;padding:5px 16px;background:#fafaf8;border-bottom:1px solid #f1efe8;font-weight:500">庫存水位</div>
        ${row('目前可用庫存','Ready，隨時可發',`<span style="font-size:22px;font-weight:500;color:#185FA5">${w.cnReady}</span><span style="font-size:11px;color:#888780;margin-left:4px">篇</span>`,`<span style="font-size:22px;font-weight:500;color:${sc}">${w.enStock}</span><span style="font-size:10px;padding:2px 7px;border-radius:8px;font-weight:500;margin-left:8px;background:${ed?'#FCEBEB':ew?'#FAEEDA':'#EAF3DE'};color:${sc}">庫存${ed?'危險':ew?'注意':'正常'}</span>`)}
        ${row('待翻譯排程','已有中文、待譯','<span style="font-size:14px;color:#d3d1c7">—</span>',`<span style="font-size:22px;font-weight:500;color:#534AB7">${w.enPending}</span><span style="font-size:11px;color:#888780;margin-left:4px">篇排隊中</span>`)}
      </div>
      <div style="background:#fff;border:1px solid #e8e8e4;border-radius:12px;padding:1.25rem;margin-bottom:1rem">
        <div style="font-size:13px;font-weight:500;margin-bottom:12px">本週行動建議</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${actions.map(a=>`<div style="display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:8px;border:1px solid;${a.t==='urgent'?'background:#FCEBEB;border-color:#F7C1C1':a.t==='warn'?'background:#FAEEDA;border-color:#FAC775':'background:#EAF3DE;border-color:#C0DD97'}">
            <div style="width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:3px;background:${a.t==='urgent'?'#E24B4A':a.t==='warn'?'#EF9F27':'#639922'}"></div>
            <div style="font-size:12px;line-height:1.6;color:${a.t==='urgent'?'#A32D2D':a.t==='warn'?'#854F0B':'#3B6D11'}">${a.m}</div>
          </div>`).join('')}
        </div>
      </div>`;
  }

  const selectorHtml=`
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:1.25rem;flex-wrap:wrap">
      <span style="font-size:12px;color:#888780;margin-right:4px">切換週別</span>
      ${weeks.map((w,i)=>`<button id="wbtn-${i}" onclick="selectWeekBtn(${i})"
        style="padding:5px 14px;font-size:12px;border-radius:20px;cursor:pointer;border:1px solid #d3d1c7;
        background:${i===idx?'#185FA5':'#fff'};color:${i===idx?'#fff':'#888780'};font-weight:${i===idx?'500':'400'}"
        >${w.week}</button>`).join('')}
    </div>`;

  const chartHtml=`
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

// ===== 分頁三：後台編輯版（有年份篩選） =====
function renderOps() {
  const opsEl=document.getElementById('view-ops');
  if(!opsEl.querySelector('table')){
    opsEl.innerHTML=`
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
    const mY=document.getElementById('m-year');
    if(mY) mY.innerHTML=(config.years||[]).map(y=>`<option>${y}</option>`).join('');
  }
  const q=(document.getElementById('ops-search')||{}).value||'';
  const st=(document.getElementById('ops-status')||{}).value||'';
  const qt=(document.getElementById('ops-q')||{}).value||'';
  const smap={'審稿/校稿':'s0','翻譯中':'s1','待上架':'s2','已上架':'s3'};
  const f=articles.filter(a=>{
    if(opsYear!=='all'&&a.year!==opsYear) return false;
    if(q&&!a.title.toLowerCase().includes(q.toLowerCase())) return false;
    if(st&&a.status!==st) return false;
    if(qt&&a.q!==qt) return false;
    return true;
  });
  document.getElementById('ops-tbody').innerHTML=f.map(a=>`
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

// ===== 分頁四：AI 數據摘要 =====
function renderQA() {
  const yearData=summary.data?.[FIXED_YEAR];
  const updated=summary.updated||'尚未同步';
  if(!yearData){
    document.getElementById('view-qa').innerHTML=`<div class="qa-wrap"><div class="qa-title">AI 數據摘要</div><div style="font-size:12px;color:#b4b2a9;padding:24px 0;text-align:center">尚未產生 ${FIXED_YEAR} 年度摘要，請執行 sync.py 後重新整理頁面。</div></div>`;
    return;
  }
  const highlights=yearData.highlights||[];
  const qaPairs=yearData.qa_pairs||[];
  const stats=yearData.stats||{};
  const hlHtml=highlights.length>0?highlights.map(h=>`<div style="display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:0.5px solid #f1efe8"><div style="width:6px;height:6px;border-radius:50%;background:#185FA5;flex-shrink:0;margin-top:5px"></div><div style="font-size:13px;color:#1a1a1a;line-height:1.6">${h}</div></div>`).join(''):'<div style="font-size:12px;color:#b4b2a9;padding:12px 0">摘要產生中</div>';
  const qaHtml=qaPairs.length>0?qaPairs.map((p,i)=>`<div style="border:1px solid #e8e8e4;border-radius:8px;overflow:hidden;margin-bottom:8px"><div style="background:#f5f5f3;padding:8px 12px;font-size:12px;font-weight:500;color:#1a1a1a;cursor:pointer" onclick="toggleQA(${i})"><span style="color:#185FA5;margin-right:6px">Q</span>${p.q}</div><div id="qa-ans-${i}" style="display:none;padding:10px 12px;font-size:12px;color:#1a1a1a;line-height:1.6;border-top:1px solid #f1efe8"><span style="color:#1D9E75;font-weight:500;margin-right:6px">A</span>${p.a}</div></div>`).join(''):'<div style="font-size:12px;color:#b4b2a9;padding:12px 0">問答產生中</div>';
  const od=(stats.overdue||[]).slice(0,5),sk=(stats.stuck||[]).slice(0,5);
  document.getElementById('view-qa').innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
      <div class="qa-wrap">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><div class="qa-title">${FIXED_YEAR} 年度重點摘要</div><div style="font-size:10px;color:#b4b2a9">更新於 ${updated}</div></div>
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
function toggleQA(i){const el=document.getElementById(`qa-ans-${i}`);if(el) el.style.display=el.style.display==='none'?'block':'none';}

// ===== 分頁五：文章查詢（AI結果連動卡片） =====
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

function extractAITitles(text) {
  return contentArticles.filter(a=>a.title&&text.includes(a.title)).map(a=>a.id);
}

function clearAIFilter(){
  aiFilteredIds=null;
  const banner=document.getElementById('search-ai-filter-banner');
  if(banner) banner.style.display='none';
  refreshSearchResults();
}

function filterContent(){
  const kl=((document.getElementById('f-kw')||{}).value||'').toLowerCase().trim();
  let base=aiFilteredIds!==null
    ?contentArticles.filter(a=>aiFilteredIds.includes(a.id))
    :contentArticles;
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
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:1.25rem">
      <span style="font-size:12px;color:#888780">篩選範圍</span>
      <button id="db-btn-all" onclick="setDbFilter('all')" style="padding:5px 16px;font-size:12px;border-radius:20px;cursor:pointer;border:1px solid #185FA5;background:#185FA5;color:#fff;font-weight:500">全資料庫</button>
      <button id="db-btn-pub" onclick="setDbFilter('pub')" style="padding:5px 16px;font-size:12px;border-radius:20px;cursor:pointer;border:1px solid #d3d1c7;background:#fff;color:#888780">已上架</button>
      <span id="db-total-badge" style="font-size:11px;color:#888780"></span>
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
    if(badge) badge.textContent=`共 ${total} 篇`;

    // 五大主題
    const themeMeta=document.getElementById('db-theme-meta');
    if(themeMeta) themeMeta.textContent=`${total} 篇中的佔比`;
    const themeCounts=THEMES.map(t=>base.filter(a=>a.theme&&a.theme.includes(t)).length);
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

    // 地方探索
    const regionCounts=REGIONS.map(r=>base.filter(a=>a.region&&a.region.includes(r)).length);
    if(dbRegionChart) dbRegionChart.destroy();
    dbRegionChart=new Chart(document.getElementById('db-region-chart').getContext('2d'),{
      type:'bar',
      data:{labels:REGIONS,datasets:[{data:regionCounts,backgroundColor:REGION_COLORS,borderWidth:0}]},
      options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.raw} 篇 (${pct(c.raw,total)}%)`}}},
        scales:{x:{grid:{color:'rgba(136,135,128,0.12)'},ticks:{color:'#888780',font:{size:10}}},y:{grid:{display:false},ticks:{color:'#888780',font:{size:11}}}}}
    });

    // 時令探索
    const seasonCounts=SEASONS.map(s=>base.filter(a=>a.season&&a.season.includes(s)).length);
    if(dbSeasonChart) dbSeasonChart.destroy();
    dbSeasonChart=new Chart(document.getElementById('db-season-chart').getContext('2d'),{
      type:'bar',
      data:{labels:SEASONS,datasets:[{data:seasonCounts,backgroundColor:SEASON_COLORS,borderWidth:0}]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.raw} 篇 (${pct(c.raw,total)}%)`}}},
        scales:{x:{grid:{display:false},ticks:{color:'#888780',font:{size:11}}},y:{grid:{color:'rgba(136,135,128,0.12)'},ticks:{color:'#888780',font:{size:10}},min:0}}}
    });

    // 子目錄
    const subdirMap={};
    base.forEach(a=>{(a.subDir||[]).forEach(s=>{if(s){subdirMap[s]=(subdirMap[s]||0)+1;}});});
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

    // 子目錄明細表
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

// ===== 文章詳情 Modal =====
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

// ===== 後台 Modal =====
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
  document.getElementById('m-live-zh').checked=m?m.liveZh:false;
  document.getElementById('m-live-en').checked=m?m.liveEn:false;
  document.getElementById('ops-modal').classList.add('open');
}
function closeModal(){document.getElementById('ops-modal').classList.remove('open');}
function saveArticle(){
  const title=document.getElementById('m-title').value.trim();if(!title) return;
  const data={year:document.getElementById('m-year').value,title,status:document.getElementById('m-status').value,q:document.getElementById('m-q').value,dateZh:document.getElementById('m-date-zh').value,dateEn:document.getElementById('m-date-en').value,liveZh:document.getElementById('m-live-zh').checked,liveEn:document.getElementById('m-live-en').checked};
  if(editingId){const i=articles.findIndex(a=>a.id===editingId);articles[i]={...articles[i],...data};}
  else articles.push({id:Date.now(),...data});
  closeModal();renderOps();
}
function exportCSV(){
  const base=opsYear==='all'?articles:articles.filter(a=>a.year===opsYear);
  const rows=[['年份','標題','狀態','季度','中文上架日','英文上架日','中文已上架','英文已上架']];
  base.forEach(a=>rows.push([a.year,a.title,a.status,a.q,a.dateZh,a.dateEn,a.liveZh?'是':'否',a.liveEn?'是':'否']));
  const csv=rows.map(r=>r.map(c=>`"${c}"`).join(',')).join('\n');
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`articles_${opsYear}.csv`;a.click();
}
