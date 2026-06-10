/* MarketWatch UI kit — chart panel, tech signals, right-column panels, overlays */
const { useState: uS, useEffect: uE } = React;

const INTERVALS = ['15分', '日', '週', '月'];
const RANGES = ['1mo', '3mo', '6mo', '1y'];

function deriveTech(sym) {
  // Deterministic pseudo-signals from the symbol's pct + seed
  const p = sym.pct;
  const k = 50 + p * 8, d = 48 + p * 6;
  const rsi = Math.max(8, Math.min(92, 52 + p * 7));
  const macd = p * 0.6;
  const bull = p >= 0;
  return {
    trend: bull ? '上升趨勢' : '下降趨勢',
    kd: { sig: k > d ? 'KD 金叉 · 偏多' : 'KD 死叉 · 偏空', dir: k > d ? 'bull' : 'bear', k: Math.round(k), d: Math.round(d) },
    macd: { sig: macd >= 0 ? 'MACD 金叉 · 多頭' : 'MACD 死叉 · 空頭', dir: macd >= 0 ? 'bull' : 'bear', v: macd.toFixed(2) },
    rsi: { sig: rsi >= 70 ? '超買 · 偏空' : rsi <= 30 ? '超賣 · 偏多' : rsi > 50 ? '偏多' : '偏弱', dir: rsi >= 70 ? 'bear' : rsi <= 30 ? 'bull' : rsi > 50 ? 'bull' : 'neutral', v: rsi.toFixed(1) },
    ma: { sig: bull ? '多頭排列' : '空頭排列', dir: bull ? 'bull' : 'bear' },
    score: Math.round(Math.max(-90, Math.min(90, p * 26))),
  };
}

function SigCard({ label, sig, dir, children }) {
  const glyph = dir === 'bull' ? '▲' : dir === 'bear' ? '▼' : '─';
  return (
    <div className={`sig-card ${dir}`}>
      <div className="sig-top">
        <div className={`sig-geo ${dir}`}>{glyph}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="tech-label">{label}</div>
          <div className={`tech-sig ${dir === 'bull' ? 'up' : dir === 'bear' ? 'dn' : ''}`}>{sig}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function Meter({ lbl, value, color, display }) {
  return (
    <div className="bar-row">
      <span className="bar-lbl">{lbl}</span>
      <div className="prog-track"><div className="prog-fill" style={{ width: Math.min(100, Math.max(0, value)) + '%', background: color }} /></div>
      {display != null && <span className="bar-val">{display}</span>}
    </div>
  );
}

function ChartPanel({ sym }) {
  const [interval, setIv] = uS('日');
  const [range, setRange] = uS('3mo');
  const [bb, setBB] = uS(true);
  const t = deriveTech(sym);
  const up = sym.pct >= 0;
  const last = sym.candles[sym.candles.length - 1];
  const scorePct = (t.score + 100) / 2;
  const scoreLabel = t.score > 55 ? '強烈看多' : t.score > 20 ? '偏多' : t.score < -55 ? '強烈看空' : t.score < -20 ? '偏空' : '中性觀望';
  const scoreColor = t.score > 20 ? 'var(--up)' : t.score < -20 ? 'var(--dn)' : 'var(--warn)';
  return (
    <div className="center-col">
      <div className="chart-header">
        <div>
          <span className="chart-title">{sym.name}</span> <span className="chart-symbol">{sym.symbol}</span>
        </div>
        <span className={`chart-price-pill ${up ? 'up-bg up' : 'dn-bg dn'}`}>
          {sym.price.toFixed(2)} <span className="chart-pct">{up ? '▲' : '▼'}{Math.abs(sym.pct).toFixed(2)}%</span>
        </span>
        <div className="interval-tabs">
          {INTERVALS.map(iv => <button key={iv} className={`rtab ${interval === iv ? 'active' : ''}`} onClick={() => setIv(iv)}>{iv}</button>)}
        </div>
        <div className="range-tabs">
          {RANGES.map(r => <button key={r} className={`rtab ${range === r ? 'active' : ''}`} onClick={() => setRange(r)}>{r}</button>)}
        </div>
        <button className={`bb-toggle ${bb ? 'on' : ''}`} onClick={() => setBB(v => !v)}>BB</button>
      </div>
      <div className="ohlc-bar">
        {[['開', last.open], ['高', last.high], ['低', last.low], ['收', last.close]].map(([k, v]) => (
          <div className="ohlc-item" key={k}><span className="ohlc-k">{k}</span><span className={`ohlc-v ${up ? 'up' : 'dn'}`}>{v.toFixed(2)}</span></div>
        ))}
        <div className="ohlc-item"><span className="ohlc-k">量</span><span className="ohlc-v">{(last.vol * 18.4).toFixed(1)}M</span></div>
        <div className="ohlc-item"><span className="ohlc-k">MA20</span><span className="ohlc-v" style={{ color: 'var(--bb-mid)' }}>{(sym.price * 0.98).toFixed(2)}</span></div>
      </div>
      <div className="chart-area"><CandleChart candles={sym.candles} showBB={bb} /></div>
      <div className="tech-panel">
        <div className="tech-top">
          <span className={`trend-badge ${up ? 'up-bg up' : 'dn-bg dn'}`}>{up ? '▲' : '▼'} {t.trend}</span>
          <div className="composite">
            <div><div className="cs-label">綜合訊號</div><div className="cs-value" style={{ color: scoreColor }}>{scoreLabel}</div></div>
            <div className="cs-bar-wrap">
              <div className="cs-track"><div className="cs-needle" style={{ left: scorePct + '%' }} /></div>
              <div className="cs-ticks"><span>空</span><span>中</span><span>多</span></div>
            </div>
            <div className="cs-score" style={{ color: scoreColor }}>{t.score > 0 ? '+' : ''}{t.score}</div>
          </div>
        </div>
        <div className="tech-grid">
          <SigCard label="KD 隨機" sig={t.kd.sig} dir={t.kd.dir}>
            <Meter lbl="%K" value={t.kd.k} color={t.kd.dir === 'bull' ? 'var(--up)' : 'var(--dn)'} display={t.kd.k} />
            <Meter lbl="%D" value={t.kd.d} color="var(--accent)" display={t.kd.d} />
          </SigCard>
          <SigCard label="MACD" sig={t.macd.sig} dir={t.macd.dir}>
            <Meter lbl="DIF" value={50 + parseFloat(t.macd.v) * 8} color={t.macd.dir === 'bull' ? 'var(--up)' : 'var(--dn)'} display={t.macd.v} />
          </SigCard>
          <SigCard label="RSI(14)" sig={t.rsi.sig} dir={t.rsi.dir}>
            <Meter lbl="RSI" value={parseFloat(t.rsi.v)} color={parseFloat(t.rsi.v) >= 70 ? 'var(--dn)' : parseFloat(t.rsi.v) <= 30 ? 'var(--up)' : 'var(--accent)'} display={t.rsi.v} />
          </SigCard>
          <SigCard label="均線" sig={t.ma.sig} dir={t.ma.dir}>
            <Meter lbl="MA5" value={up ? 72 : 32} color={up ? 'var(--up)' : 'var(--dn)'} display={(sym.price * 0.995).toFixed(1)} />
            <Meter lbl="MA20" value={up ? 60 : 40} color="var(--accent)" display={(sym.price * 0.98).toFixed(1)} />
          </SigCard>
        </div>
      </div>
    </div>
  );
}

/* ── RIGHT COLUMN ── */
const QUICK = [
  { label: '📈 進場時機', text: '分析目前最佳進場時機與需等待的技術訊號。' },
  { label: '🛡 支撐壓力', text: '分析目前重要支撐位與壓力位的具體價格。' },
  { label: '⚖️ 風險評估', text: '評估目前持有此標的的主要下行風險因素。' },
  { label: '🎯 目標價位', text: '根據技術分析給出短中期合理目標價位。' },
];

function AdvisorPanel({ sym }) {
  const [msgs, setMsgs] = uS([]);
  const [input, setInput] = uS('');
  const send = (text) => {
    const q = (text || input).trim(); if (!q) return;
    setInput('');
    setMsgs(m => [...m, { role: 'user', text: q }]);
    setTimeout(() => setMsgs(m => [...m, { role: 'ai', text: `${sym.name}（${sym.symbol}）目前${sym.pct >= 0 ? '偏多' : '偏弱'}，現價 ${sym.price.toFixed(2)}。技術面 KD 與 MACD ${sym.pct >= 0 ? '同步轉強，可分批布局' : '走弱，建議觀望或減碼'}。建議：${sym.pct >= 0 ? '持有 / 逢回加碼' : '觀望'}。\n\n※ 本內容僅供參考，非投資建議。` }]), 500);
  };
  return (
    <div className="panel-scroll" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="adv-head"><span className="adv-title">AI 投資顧問</span><span className="adv-model">Gemini 2.0 Flash</span></div>
      <button className="analyze-btn" onClick={() => send(`全面分析 ${sym.name}`)}>✨ 全面分析 {sym.name}</button>
      <div className="adv-quick">
        {QUICK.map(q => <button key={q.label} className="quick-chip" onClick={() => send(q.text)}>{q.label}</button>)}
      </div>
      <div className="adv-msgs">
        {msgs.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', marginTop: 16, lineHeight: 1.8 }}>選擇上方提示或輸入問題<br />讓 AI 顧問為你分析 {sym.name}</div>}
        {msgs.map((m, i) => (
          <div key={i} className={`adv-msg ${m.role}`}>
            <span className="msg-role">{m.role === 'user' ? '你' : 'AI 顧問'}</span>
            <div className="msg-text">{m.text}</div>
          </div>
        ))}
      </div>
      <div className="adv-input">
        <input placeholder="輸入問題…" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} />
        <button className="ibtn-sm" style={{ width: 32, borderRadius: 'var(--r-sm)' }} onClick={() => send()}>↑</button>
      </div>
    </div>
  );
}

function PortfolioPanel({ data }) {
  const rows = data.map(p => { const value = p.shares * p.price; const cost = p.shares * p.cost; return { ...p, value, pnl: value - cost, pnlPct: ((p.price - p.cost) / p.cost) * 100 }; });
  const total = rows.reduce((s, r) => s + r.value, 0);
  const totalPnl = rows.reduce((s, r) => s + r.pnl, 0);
  const totalPct = (totalPnl / (total - totalPnl)) * 100;
  const up = totalPnl >= 0;
  return (
    <div className="panel-scroll">
      <div className="pf-head">
        <div className="pf-total">${total.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
        <div className={`pf-pnl ${up ? 'up' : 'dn'}`}>{up ? '▲' : '▼'} ${Math.abs(totalPnl).toLocaleString('en-US', { maximumFractionDigits: 0 })} <span style={{ opacity: .8 }}>({up ? '+' : ''}{totalPct.toFixed(2)}%)</span></div>
      </div>
      <div className="pf-list">
        {rows.map(r => {
          const u = r.pnl >= 0;
          return (
            <div className="pf-row" key={r.symbol}>
              <div className="pf-row-left">
                <div className="pf-row-name">{r.name}</div>
                <div className="pf-row-sym">{r.symbol} · {r.shares} 股</div>
              </div>
              <div className="pf-row-right">
                <div className="pf-row-value mono">${r.value.toLocaleString('en-US', { maximumFractionDigits: 0 })}</div>
                <div className={`pf-row-pnl ${u ? 'up' : 'dn'}`}>{u ? '▲' : '▼'}{Math.abs(r.pnlPct).toFixed(1)}%</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NewsPanel({ data }) {
  return (
    <div className="panel-scroll"><div className="news-list">
      {data.map((n, i) => (
        <div className={`news-item ${n.senti}`} key={i}>
          <div className="news-head">
            <span className={`news-dot ${n.senti}`} />
            <span className="news-headline">{n.t}</span>
          </div>
          <div className="news-meta"><span>{n.src}</span><span>{n.time}</span></div>
        </div>
      ))}
    </div></div>
  );
}

const SCR_PRESETS = ['金叉反彈', '超強勢多頭', '超賣機會', '突破蓄勢', '空頭警示'];
function ScreenerPanel({ symbols }) {
  const rows = symbols.slice(0, 6).map(s => {
    const t = deriveTech(s);
    const hits = [];
    if (t.macd.dir === 'bull') hits.push(['MACD 金叉', 'var(--up)']);
    if (t.kd.dir === 'bull') hits.push(['KD 金叉', 'var(--up)']);
    if (parseFloat(t.rsi.v) <= 35) hits.push(['RSI 超賣', 'var(--up)']);
    if (parseFloat(t.rsi.v) >= 68) hits.push(['RSI 超買', 'var(--dn)']);
    if (t.ma.dir === 'bear') hits.push(['跌破 MA20', 'var(--dn)']);
    if (hits.length === 0) hits.push(['站上 MA20', 'var(--up)']);
    const bull = hits.filter(h => h[1] === 'var(--up)').length >= hits.length / 2;
    return { s, hits, bull, score: hits.length };
  });
  return (
    <div className="panel-scroll">
      <div className="scr-section">
        <div className="scr-presets">{SCR_PRESETS.map(p => <button key={p} className="scr-preset">{p}</button>)}</div>
      </div>
      <div className="panel-title">符合條件 · {rows.length} 檔</div>
      {rows.map(({ s, hits, bull, score }) => (
        <div className={`scr-row ${bull ? 'bull' : 'bear'}`} key={s.symbol}>
          <div style={{ minWidth: 64 }}><div className="scr-sym">{s.symbol}</div><div className="scr-name">{s.name}</div></div>
          <div className="scr-hits">{hits.map((h, i) => <span key={i} className="scr-hit" style={{ borderColor: h[1], color: h[1] }}>{h[0]}</span>)}</div>
          <div className={`scr-score ${bull ? 'bull' : 'bear'}`}>{score}</div>
        </div>
      ))}
    </div>
  );
}

function CalendarPanel({ data }) {
  return (
    <div className="panel-scroll">
      <div className="panel-title">財經行事曆</div>
      {data.map((e, i) => (
        <div className="ec-item" key={i}>
          <div className="ec-left">
            <span className="ec-flag">{e.flag}</span>
            <div><div className="ec-name">{e.name}</div><div className="ec-time">{e.time}</div></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="mono" style={{ fontSize: 10, color: 'var(--text-2)' }}>{e.fc}</span>
            <span className={`ec-impact ${e.impact}`}>{e.impact === 'high' ? '高' : '中'}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

const R_TABS = [['advisor', 'AI'], ['portfolio', '持倉'], ['alert', '警示'], ['news', '新聞'], ['sector', '板塊'], ['calendar', '日曆'], ['screener', '選股']];
function RightColumn({ tab, setTab, sym, data }) {
  return (
    <div className="right-col">
      <div className="right-tabs">
        {R_TABS.map(([id, label]) => <button key={id} className={`r-tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>{label}</button>)}
      </div>
      {tab === 'advisor' && <AdvisorPanel sym={sym} />}
      {tab === 'portfolio' && <PortfolioPanel data={data.PORTFOLIO} />}
      {tab === 'news' && <NewsPanel data={data.NEWS} />}
      {tab === 'screener' && <ScreenerPanel symbols={data.SYMBOLS} />}
      {tab === 'calendar' && <CalendarPanel data={data.EVENTS} />}
      {(tab === 'alert' || tab === 'sector') && (
        <div className="panel-scroll"><div style={{ padding: 28, textAlign: 'center', color: 'var(--text-3)', fontSize: 12, lineHeight: 1.9 }}>
          {tab === 'alert' ? '🔔 價格警示\n設定目標價 / 停損價\n突破時即時通知' : '📊 板塊輪動\n台股 / 美股各板塊\n即時漲跌熱力圖'}
        </div></div>
      )}
    </div>
  );
}

function CommandPalette({ symbols, onPick, onClose }) {
  const [q, setQ] = uS('');
  const [focus, setFocus] = uS(0);
  const list = symbols.filter(s => !q || s.name.includes(q) || s.symbol.toLowerCase().includes(q.toLowerCase()));
  uE(() => {
    const h = e => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') { e.preventDefault(); setFocus(f => Math.min(f + 1, list.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setFocus(f => Math.max(f - 1, 0)); }
      if (e.key === 'Enter' && list[focus]) onPick(list[focus].symbol);
    };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [list, focus]);
  return (
    <div className="cmd-overlay" onClick={onClose}>
      <div className="cmd-panel" onClick={e => e.stopPropagation()}>
        <div className="cmd-search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2.2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input autoFocus className="cmd-input" placeholder="搜尋標的、切換代號…" value={q} onChange={e => { setQ(e.target.value); setFocus(0); }} />
          <span className="cmd-kbd">ESC</span>
        </div>
        <div className="cmd-list">
          {list.map((s, i) => {
            const up = s.pct >= 0;
            return (
              <div key={s.symbol} className={`cmd-item ${i === focus ? 'focused' : ''}`} onMouseEnter={() => setFocus(i)} onClick={() => onPick(s.symbol)}>
                <span className="cmd-dot" style={{ background: up ? 'var(--up)' : 'var(--dn)' }} />
                <div className="cmd-main"><div className="cmd-name">{s.name}</div><div className="cmd-sym">{s.symbol}</div></div>
                <div className="cmd-right"><div className={up ? 'up' : 'dn'} style={{ fontWeight: 700 }}>{s.price.toFixed(2)}</div><div className={`${up ? 'up' : 'dn'}`} style={{ fontSize: 10 }}>{up ? '▲' : '▼'}{Math.abs(s.pct).toFixed(2)}%</div></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KeyModal({ onClose }) {
  const [tab, setTab] = uS('gemini');
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="key-panel" onClick={e => e.stopPropagation()}>
        <h3>AI 投資顧問設定</h3>
        <p className="key-hint">Key 僅存於本機 localStorage，不會上傳</p>
        <div className="key-tabs">
          <button className={`key-tab ${tab === 'gemini' ? 'active' : ''}`} onClick={() => setTab('gemini')}>🆓 Gemini（免費）</button>
          <button className={`key-tab ${tab === 'claude' ? 'active' : ''}`} onClick={() => setTab('claude')}>Claude</button>
        </div>
        <p className="key-hint" style={{ color: 'var(--dn)', fontWeight: 700 }}>{tab === 'gemini' ? 'Gemini 2.0 Flash Lite 免費，每天 1500 次請求' : '至 console.anthropic.com 取得 API Key'}</p>
        <input type="password" placeholder={tab === 'gemini' ? 'AIza…' : 'sk-ant-…'} />
        <div className="key-actions"><button>儲存並使用</button><button className="ghost" onClick={onClose}>取消</button></div>
      </div>
    </div>
  );
}

Object.assign(window, { ChartPanel, RightColumn, CommandPalette, KeyModal });
