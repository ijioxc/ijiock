/* MarketWatch UI kit — App shell */
function App() {
  const D = window.MW_DATA;
  const [dark, setDark] = React.useState(false);
  const [selected, setSelected] = React.useState('2330.TW');
  const [rightTab, setRightTab] = React.useState('advisor');
  const [showCmd, setShowCmd] = React.useState(false);
  const [showKey, setShowKey] = React.useState(false);

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, [dark]);

  React.useEffect(() => {
    const h = e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setShowCmd(v => !v); }
      if (e.target.tagName === 'INPUT') return;
      if (e.key === 'd') setDark(v => !v);
      const n = parseInt(e.key);
      const tabs = ['advisor', 'portfolio', 'alert', 'news', 'sector', 'calendar', 'screener'];
      if (n >= 1 && n <= 7) setRightTab(tabs[n - 1]);
    };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, []);

  const sym = D.SYMBOLS.find(s => s.symbol === selected) || D.SYMBOLS[0];

  return (
    <div className="app">
      <NavBar dark={dark} onToggleDark={() => setDark(v => !v)} onCmd={() => setShowCmd(true)} onKey={() => setShowKey(true)} alerts={2} />
      <MarketTicker items={D.TICKER} />
      <div className="main-layout">
        <WatchList symbols={D.SYMBOLS} selected={selected} onSelect={setSelected} />
        <ChartPanel sym={sym} />
        <RightColumn tab={rightTab} setTab={setRightTab} sym={sym} data={D} />
      </div>
      {showCmd && <CommandPalette symbols={D.SYMBOLS} onPick={s => { setSelected(s); setShowCmd(false); }} onClose={() => setShowCmd(false)} />}
      {showKey && <KeyModal onClose={() => setShowKey(false)} />}
    </div>
  );
}
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
