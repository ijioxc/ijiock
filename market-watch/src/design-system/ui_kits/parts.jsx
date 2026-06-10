/* MarketWatch UI kit — chrome & chart parts */
const { useState, useEffect, useRef } = React;

function Sparkline({ data, up, w = 64, h = 32 }) {
  const P = 3;
  if (!data || data.length < 2) return <svg width={w} height={h} className="spark" />;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const pts = data.map((v, i) => [P + (i / (data.length - 1)) * (w - P * 2), P + (1 - (v - min) / range) * (h - P * 2)]);
  const poly = pts.map(([x, y]) => `${x},${y}`).join(' ');
  const area = `M ${pts[0][0]},${h} ${pts.map(([x, y]) => `L ${x},${y}`).join(' ')} L ${pts[pts.length - 1][0]},${h} Z`;
  const color = up ? 'var(--up)' : 'var(--dn)';
  const fill = up ? 'rgba(255,59,48,.13)' : 'rgba(52,199,89,.13)';
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg width={w} height={h} className="spark">
      <path d={area} fill={fill} />
      <polyline points={poly} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="2.4" fill={color} />
    </svg>
  );
}

function CandleChart({ candles, showBB }) {
  const W = 920, H = 284, padR = 52, padB = 30, padT = 8;
  const data = candles.slice(-48);
  const highs = data.map(c => c.high), lows = data.map(c => c.low);
  const max = Math.max(...highs), min = Math.min(...lows), range = max - min || 1;
  const plotW = W - padR, plotH = H - padB - padT;
  const cw = plotW / data.length;
  const y = v => padT + (1 - (v - min) / range) * plotH;
  // Bollinger bands (period 20)
  const closes = data.map(c => c.close);
  const bb = data.map((c, i) => {
    if (i < 19) return null;
    const slice = closes.slice(i - 19, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / 20;
    const sd = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / 20);
    return { x: i * cw + cw / 2, u: mean + 2 * sd, m: mean, l: mean - 2 * sd };
  });
  const bbPts = bb.filter(Boolean);
  const line = (key) => bbPts.map(p => `${p.x},${y(p[key])}`).join(' ');
  // MA20 path always
  const gridY = [0, 0.25, 0.5, 0.75, 1].map(f => padT + f * plotH);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {gridY.map((gy, i) => (
        <line key={i} x1="0" y1={gy} x2={plotW} y2={gy} stroke="var(--border)" strokeWidth="1" />
      ))}
      {gridY.map((gy, i) => {
        const val = max - (i / 4) * range;
        return <text key={'t' + i} x={plotW + 6} y={gy + 3} fontSize="9" fill="var(--text-3)" fontFamily="var(--font-mono)">{val.toFixed(0)}</text>;
      })}
      {showBB && bbPts.length > 1 && (
        <g>
          <polygon points={`${bbPts.map(p => `${p.x},${y(p.u)}`).join(' ')} ${[...bbPts].reverse().map(p => `${p.x},${y(p.l)}`).join(' ')}`} fill="rgba(99,102,241,.06)" />
          <polyline points={line('u')} fill="none" stroke="var(--bb-upper)" strokeWidth="1.2" strokeDasharray="3 2" opacity=".8" />
          <polyline points={line('m')} fill="none" stroke="var(--bb-mid)" strokeWidth="1.3" />
          <polyline points={line('l')} fill="none" stroke="var(--bb-lower)" strokeWidth="1.2" strokeDasharray="3 2" opacity=".8" />
        </g>
      )}
      {data.map((c, i) => {
        const x = i * cw + cw / 2;
        const up = c.close >= c.open;
        const col = up ? 'var(--up)' : 'var(--dn)';
        const bw = Math.max(2, cw * 0.62);
        const oy = y(c.open), cy = y(c.close);
        return (
          <g key={i}>
            <line x1={x} y1={y(c.high)} x2={x} y2={y(c.low)} stroke={col} strokeWidth="1" />
            <rect x={x - bw / 2} y={Math.min(oy, cy)} width={bw} height={Math.max(1.5, Math.abs(cy - oy))} fill={col} rx="0.5" />
          </g>
        );
      })}
    </svg>
  );
}

function NavBar({ dark, onToggleDark, onCmd, onKey, alerts }) {
  return (
    <nav className="navbar">
      <div className="logo">
        <div className="logo-mark">
          <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
        </div>
        <div>
          <div className="logo-txt">MarketWatch</div>
          <div className="logo-sub">自動盯盤 · 投資顧問</div>
        </div>
      </div>
      <div className="live-badge"><span className="live-dot" />LIVE</div>
      <div className="session-clock">
        <div className="session-item"><span className="session-dot" style={{ background: 'var(--up)' }} /><span className="session-label">US</span><span className="session-status up">正盤</span></div>
        <div className="session-divider" />
        <div className="session-item"><span className="session-dot" style={{ background: 'var(--text-3)' }} /><span className="session-label">TW</span><span className="session-status" style={{ color: 'var(--text-3)' }}>閉市</span></div>
        <div className="session-divider" />
        <span className="session-time mono">09:42 ET</span>
      </div>
      {alerts > 0 && <button className="alert-badge">⚠ {alerts} 個警示</button>}
      <div className="nav-right">
        <button className="ibtn" title="快速切換 (⌘K)" onClick={onCmd}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        </button>
        <button className="ibtn" title="設定 API Key" onClick={onKey}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
        </button>
        <button className="ibtn" title="切換主題" onClick={onToggleDark}>{dark ? '☀' : '🌙'}</button>
        <button className="ibtn" title="快捷鍵" style={{ fontWeight: 800 }}>?</button>
      </div>
    </nav>
  );
}

function MarketTicker({ items }) {
  const row = [...items, ...items];
  return (
    <div className="market-ticker">
      <div className="ticker-track">
        {row.map((t, i) => {
          const up = t.pct >= 0;
          return (
            <span className="ticker-item" key={i}>
              <span className="ticker-label">{t.label}</span>
              <span className="ticker-price">{t.price}</span>
              <span className={`ticker-chg ${up ? 'up' : 'dn'}`}>{up ? '▲' : '▼'}{Math.abs(t.pct).toFixed(2)}%</span>
              <span className="ticker-sep">·</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

const CATS = ['ALL', 'TW', 'US', 'IDX', 'FX'];
const CAT_LABELS = { TW: '台股', US: '美股', IDX: '指數', FX: '外匯' };
const TAG_COLORS = { red: 'var(--tag-red)', yellow: 'var(--tag-yellow)', green: 'var(--tag-green)', blue: 'var(--tag-blue)' };

function WatchList({ symbols, selected, onSelect }) {
  const [cat, setCat] = useState('ALL');
  const [q, setQ] = useState('');
  const list = symbols.filter(s => (cat === 'ALL' || s.cat === cat) && (!q || s.name.includes(q) || s.symbol.toLowerCase().includes(q.toLowerCase())));
  const gainers = symbols.filter(s => s.pct >= 0).length;
  const pct = Math.round((gainers / symbols.length) * 100);
  const groups = cat === 'ALL' && !q;
  const grouped = groups ? list.reduce((a, s) => { (a[s.cat] = a[s.cat] || []).push(s); return a; }, {}) : null;

  const Item = (s) => {
    const up = s.pct >= 0;
    const hot = Math.abs(s.pct) >= 3;
    return (
      <div key={s.symbol} className={`wl-item ${selected === s.symbol ? 'active' : ''}`} onClick={() => onSelect(s.symbol)}>
        {s.tag && <span className="wl-tag-dot" style={{ background: TAG_COLORS[s.tag] }} />}
        <div className="wl-left">
          <div className="wl-name-row">
            <div className="wl-name">{s.name}</div>
            {s.pin && <span style={{ fontSize: 8 }}>📌</span>}
            {hot && <span className={`wl-mover ${up ? 'up-bg up' : 'dn-bg dn'}`}>HOT</span>}
          </div>
          <div className="wl-symbol">{s.symbol}</div>
        </div>
        <Sparkline data={s.spark} up={up} />
        <div className="wl-right">
          <div className={`wl-price ${up ? 'up' : 'dn'}`}>{s.price.toFixed(2)}</div>
          <div className={`wl-chg ${up ? 'up' : 'dn'}`}>{up ? '▲' : '▼'}{Math.abs(s.pct).toFixed(2)}%</div>
        </div>
      </div>
    );
  };

  return (
    <aside className="watchlist">
      <div className="wl-header">
        <span className="wl-title">自選清單</span>
        <div className="wl-head-btns">
          <button className="ibtn-sm" title="熱力圖">⬛</button>
          <button className="ibtn-sm" title="表格">≡</button>
          <button className="ibtn-sm" title="新增">＋</button>
        </div>
      </div>
      <div className="wl-search-wrap">
        <input className="wl-search" placeholder="搜尋標的 / 或按 /" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <div className="cat-tabs">
        {CATS.map(c => <button key={c} className={`cat-tab ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>{c}</button>)}
      </div>
      <div className="mkt-breadth">
        <div className="mkt-breadth-bar"><div className="mkt-breadth-fill" style={{ width: pct + '%' }} /></div>
        <div className="mkt-breadth-labels"><span className="up">▲ {gainers}</span><span style={{ color: 'var(--text-3)' }}>市場情緒</span><span className="dn">▼ {symbols.length - gainers}</span></div>
      </div>
      <div className="wl-list">
        {groups
          ? Object.entries(grouped).map(([g, items]) => (
            <div key={g}><div className="section-label">{CAT_LABELS[g] || g}</div>{items.map(Item)}</div>
          ))
          : list.map(Item)}
      </div>
    </aside>
  );
}

Object.assign(window, { Sparkline, CandleChart, NavBar, MarketTicker, WatchList });
