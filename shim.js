// ============================================================
// Dashboard Shim — 重構分頁結構 + 支援外部 hash 切換
// ============================================================
(function(){
  let done = false;

  // hoisted so applyHashView can call it
  function switchToView(key){
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    const target = document.getElementById('view-' + key);
    if (target) target.classList.add('active');
    const opsBar = document.getElementById('ops-year-bar');
    if (opsBar) opsBar.style.display = (key==='ops') ? 'block' : 'none';
    window.currentTab = key;
    try {
      if      (key==='exec' && typeof renderExec==='function')       renderExec();
      else if (key==='mgr' && typeof renderMgr==='function')         renderMgr();
      else if (key==='ops' && typeof renderOps==='function')         { if (typeof buildOpsYearTabs==='function') buildOpsYearTabs(); renderOps(); }
      else if (key==='qa' && typeof renderQA==='function')           renderQA();
      else if (key==='search' && typeof renderSearch==='function')   renderSearch();
      else if (key==='dbstats' && typeof renderDbStats==='function') renderDbStats();
    } catch(e) { console.warn('renderer error for', key, e); }
  }

  function setCatActive(cat){
    document.querySelectorAll('.cat').forEach(b=>b.classList.toggle('active', b.dataset.cat === cat));
    document.querySelectorAll('.subtab-bar').forEach(s=>s.classList.remove('show'));
    const subBar = document.getElementById('sub-' + cat);
    if (subBar) subBar.classList.add('show');
  }

  function setSubActive(barId, sub){
    const bar = document.getElementById(barId);
    if (!bar) return;
    bar.querySelectorAll('.subtab').forEach(b=>b.classList.toggle('active', b.dataset.sub === sub));
  }

  function restructure(){
    if (done) return;
    const oldTabBar = document.querySelector('.tab-bar');
    if (!oldTabBar) return;
    done = true;

    const nav = document.createElement('div');
    nav.innerHTML = `
      <div class="cat-bar">
        <button class="cat active" data-cat="reports">報告版</button>
        <button class="cat" data-cat="manage">文章管理</button>
        <button class="cat" data-cat="qa">AI 數據摘要</button>
        <button class="cat" data-cat="dbstats">資料庫統計視覺化</button>
      </div>
      <div class="subtab-bar show" id="sub-reports">
        <span class="subtab-label">檢視角度</span>
        <button class="subtab active" data-sub="exec">長官報告版</button>
        <button class="subtab" data-sub="mgr">主管報告版</button>
      </div>
      <div class="subtab-bar" id="sub-manage">
        <span class="subtab-label">管理檢視</span>
        <button class="subtab active" data-sub="search">文章查詢</button>
        <button class="subtab" data-sub="ops">後台編輯版</button>
      </div>
    `;
    oldTabBar.replaceWith(nav);

    // 確保初始只有 view-exec 可見
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    const execView = document.getElementById('view-exec');
    if (execView) execView.classList.add('active');
    const opsBar = document.getElementById('ops-year-bar');
    if (opsBar) opsBar.style.display = 'none';

    nav.querySelectorAll('.cat').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const cat = btn.dataset.cat;
        setCatActive(cat);
        if (cat === 'reports') {
          const activeSub = document.querySelector('#sub-reports .subtab.active')?.dataset.sub || 'exec';
          switchToView(activeSub);
        } else if (cat === 'manage') {
          const activeSub = document.querySelector('#sub-manage .subtab.active')?.dataset.sub || 'search';
          switchToView(activeSub);
        } else if (cat === 'qa') switchToView('qa');
        else if (cat === 'dbstats') switchToView('dbstats');
      });
    });

    nav.querySelectorAll('.subtab').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const bar = btn.closest('.subtab-bar');
        setSubActive(bar.id, btn.dataset.sub);
        switchToView(btn.dataset.sub);
      });
    });
  }

  // ─── 支援 URL hash 切換（給外部 iframe 使用） ───
  // 格式：#view=exec | mgr | search | ops | qa | dbstats
  function applyHashView(){
    if (!done) return; // wait until restructure finished
    const hash = (location.hash || '').replace('#','');
    const params = Object.fromEntries(hash.split('&').filter(Boolean).map(kv=>kv.split('=')));
    const v = params.view;
    if (!v) return;
    const catMap = { exec: 'reports', mgr: 'reports', search: 'manage', ops: 'manage', qa: 'qa', dbstats: 'dbstats' };
    const cat = catMap[v];
    if (!cat) return;
    // Directly set states (no .click() calls — those are async/event-based)
    setCatActive(cat);
    if (cat === 'reports')       { setSubActive('sub-reports', v); switchToView(v); }
    else if (cat === 'manage')   { setSubActive('sub-manage', v);  switchToView(v); }
    else                          { switchToView(v); }
  }

  // 觀察 #app，等 main.js 的 init() 把 tab-bar 塞進來就立刻重構
  const app = document.getElementById('app');
  if (app) {
    const obs = new MutationObserver(()=>{
      restructure();
      if (done) applyHashView();
    });
    obs.observe(app, { childList: true, subtree: true });
    restructure();
  }

  // hashchange listener — on every hash change
  window.addEventListener('hashchange', applyHashView);

  // Expose for parent to call directly as a fallback
  window.__applyHashView = applyHashView;
})();
