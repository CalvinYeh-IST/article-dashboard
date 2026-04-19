// ============================================================
// Top-level shell
// - 報告版 / 文章管理 / AI 數據摘要 / 資料庫統計視覺化 → 嵌入 dashboard iframe
// - AI 行程規劃 → React Planner
// ============================================================
function App() {
  const [view, setView] = useState(() => localStorage.getItem('ist.view') || 'reports');
  const [subView, setSubView] = useState(() => localStorage.getItem('ist.subView') || 'exec');
  const [article, setArticle] = useState(null);
  const iframeRef = useRef(null);

  useEffect(() => { localStorage.setItem('ist.view', view); }, [view]);
  useEffect(() => { localStorage.setItem('ist.subView', subView); }, [subView]);

  // Compute which dashboard sub-view to show
  const dashHash = useMemo(() => {
    if (view === 'reports') return subView; // exec or mgr
    if (view === 'manage')  return subView; // search or ops
    if (view === 'qa')      return 'qa';
    if (view === 'dbstats') return 'dbstats';
    return null;
  }, [view, subView]);

  // Send hash to iframe when view/subView changes
  useEffect(() => {
    if (!dashHash) return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    const apply = () => {
      try {
        const win = iframe.contentWindow;
        if (!win) return;
        const newHash = `#view=${dashHash}`;
        if (win.location.hash !== newHash) {
          win.location.hash = `view=${dashHash}`;
        }
        // Also call directly in case listener timing is off
        if (typeof win.__applyHashView === 'function') win.__applyHashView();
      } catch (e) { /* ignore cross-origin, shouldn't happen */ }
    };
    // If iframe still loading, defer
    const doc = (() => { try { return iframe.contentDocument; } catch(e){ return null; } })();
    if (doc && doc.readyState === 'complete') {
      apply();
    } else {
      const on = () => { apply(); iframe.removeEventListener('load', on); };
      iframe.addEventListener('load', on);
    }
  }, [dashHash]);

  const showIframe = view !== 'planner';
  const showPlanner = view === 'planner';

  return (
    <div style={{
      display: 'flex', height: '100vh', width: '100vw',
      background: '#F8F7F5', overflow: 'hidden',
      fontFamily: '"Söhne","Inter","PingFang TC","Noto Sans TC",-apple-system,sans-serif',
      color: '#1C1C1C',
    }}>
      <Sidebar view={view} subView={subView} setView={setView} setSubView={setSubView} />
      <main style={{ flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden' }}>

        {/* Dashboard iframe — always mounted, only visible when a dashboard view is active */}
        <iframe
          ref={iframeRef}
          src={dashHash ? `dashboard/index.html#view=${dashHash}` : 'dashboard/index.html'}
          style={{
            display: showIframe ? 'block' : 'none',
            width: '100%', height: '100%',
            border: 'none',
            background: '#F8F7F5',
          }}
          title="Article Dashboard"
        />

        {/* Planner — React */}
        {showPlanner && <PlannerView onOpenArticle={setArticle} />}

      </main>
      <ArticleModal article={article} onClose={() => setArticle(null)} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
