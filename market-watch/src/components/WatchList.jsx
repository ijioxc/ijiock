import { useState, useRef, useEffect, useCallback } from 'react'
import { useWatchlistStore } from '../store/watchlistStore'

const CATS = ['ALL', 'TW', 'US', 'IDX', 'FX']
const CAT_LABELS = { TW: '台股', US: '美股', IDX: '指數', FX: '外匯' }

function MiniSparkline({ data, up }) {
  const W = 68, H = 36, P = 3
  if (!data || data.length < 2) return <svg width={W} height={H} className="sparkline" />
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => [
    P + (i / (data.length - 1)) * (W - P * 2),
    P + (1 - (v - min) / range) * (H - P * 2),
  ])
  const polyPts = pts.map(([x, y]) => `${x},${y}`).join(' ')
  const areaD = `M ${pts[0][0]},${H} ${pts.map(([x, y]) => `L ${x},${y}`).join(' ')} L ${pts[pts.length - 1][0]},${H} Z`
  const color = up ? 'var(--up)' : 'var(--dn)'
  const fillRgba = up ? 'rgba(239,83,80,.13)' : 'rgba(38,166,154,.13)'
  const [lx, ly] = pts[pts.length - 1]
  return (
    <svg width={W} height={H} className="sparkline">
      <path d={areaD} fill={fillRgba} />
      <polyline points={polyPts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="2.5" fill={color} />
    </svg>
  )
}

function LoadingDots() {
  return (
    <div className="loading-dots">
      <span className="dot1" />
      <span className="dot2" />
      <span className="dot3" />
    </div>
  )
}

export default function WatchList() {
  const symbols = useWatchlistStore(s => s.symbols)
  const quotes = useWatchlistStore(s => s.quotes)
  const priceHistory = useWatchlistStore(s => s.priceHistory)
  const selected = useWatchlistStore(s => s.selected)
  const setSelected = useWatchlistStore(s => s.setSelected)
  const addSymbol = useWatchlistStore(s => s.addSymbol)
  const removeSymbol = useWatchlistStore(s => s.removeSymbol)
  const pinnedSymbols = useWatchlistStore(s => s.pinnedSymbols)
  const symbolTags = useWatchlistStore(s => s.symbolTags)
  const togglePin = useWatchlistStore(s => s.togglePin)
  const setTag = useWatchlistStore(s => s.setTag)
  const symbolNotes = useWatchlistStore(s => s.symbolNotes)
  const setNote = useWatchlistStore(s => s.setNote)
  const alerts = useWatchlistStore(s => s.alerts)
  const [tagMenu, setTagMenu] = useState(null)
  const [noteEdit, setNoteEdit] = useState(null)
  const [importError, setImportError] = useState('')
  const [cat, setCat] = useState('ALL')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('default')
  const [addDraft, setAddDraft] = useState({ symbol: '', name: '', category: 'TW' })
  const [showAdd, setShowAdd] = useState(false)
  const [flashMap, setFlashMap] = useState({})
  const [viewMode, setViewMode] = useState('list')
  const prevPricesRef = useRef({})
  const searchRef = useRef(null)

  useEffect(() => {
    Object.entries(quotes).forEach(([sym, q]) => {
      if (!q?.price) return
      const prev = prevPricesRef.current[sym]
      if (prev != null && prev !== q.price) {
        const dir = q.price > prev ? 'up' : 'dn'
        setFlashMap(m => ({ ...m, [sym]: dir }))
        setTimeout(() => setFlashMap(m => { const n = { ...m }; delete n[sym]; return n }), 650)
      }
      prevPricesRef.current[sym] = q.price
    })
  }, [quotes])

  // Keyboard navigation: J/K navigate, / to focus search
  const flatSymbols = cat === 'ALL' ? symbols : symbols.filter(s => s.category === cat)
  const navigate = useCallback((dir) => {
    const idx = flatSymbols.findIndex(s => s.symbol === selected)
    const next = flatSymbols[idx + dir]
    if (next) setSelected(next.symbol)
  }, [flatSymbols, selected, setSelected])

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); navigate(1) }
      if (e.key === 'ArrowUp'   || e.key === 'k') { e.preventDefault(); navigate(-1) }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        setCat(c => { const i = CATS.indexOf(c); return CATS[(i + 1) % CATS.length] })
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setCat(c => { const i = CATS.indexOf(c); return CATS[(i - 1 + CATS.length) % CATS.length] })
      }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate])

  const q = search.toLowerCase()
  let filtered = flatSymbols.filter(s =>
    !q || s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
  )
  if (sortBy === 'gainPct') {
    filtered = [...filtered].sort((a, b) => (quotes[b.symbol]?.changePct ?? -999) - (quotes[a.symbol]?.changePct ?? -999))
  } else if (sortBy === 'lossPct') {
    filtered = [...filtered].sort((a, b) => (quotes[a.symbol]?.changePct ?? 999) - (quotes[b.symbol]?.changePct ?? 999))
  } else {
    // pinned items float to top when no sort is applied
    filtered = [...filtered].sort((a, b) => {
      const pa = pinnedSymbols.includes(a.symbol) ? 0 : 1
      const pb = pinnedSymbols.includes(b.symbol) ? 0 : 1
      return pa - pb
    })
  }
  const groups = cat === 'ALL' && !q && sortBy === 'default'
    ? Object.entries(filtered.reduce((acc, s) => {
        const g = s.category
        if (!acc[g]) acc[g] = []
        acc[g].push(s)
        return acc
      }, {}))
    : null

  const TAG_COLORS = { red: '#ef5350', yellow: '#f59e0b', green: '#26a69a', blue: '#6366f1' }

  function renderItem({ symbol, name }) {
    const q = quotes[symbol]
    const up = q && q.change >= 0
    const flash = flashMap[symbol]
    const absPct = Math.abs(q?.changePct ?? 0)
    const isHot = absPct >= 3
    const isPinned = pinnedSymbols.includes(symbol)
    const tag = symbolTags[symbol]
    const alert = alerts[symbol]
    const hasAlert = alert && (alert.target != null || alert.stop != null || alert.pctMove != null)
    return (
      <li key={symbol} className={`wl-item ${selected === symbol ? 'active' : ''} ${isHot ? 'wl-hot' : ''} ${isPinned ? 'wl-pinned' : ''}`} onClick={() => setSelected(symbol)}>
        {tag && <span className="wl-tag-dot" style={{ background: TAG_COLORS[tag] }} />}
        <div className="wl-left">
          <div className="wl-name-row">
            <div className="wl-name">{name}</div>
            {isPinned && <span className="wl-pin-icon">📌</span>}
            {hasAlert && <span className="wl-alert-icon" title="已設警示">🔔</span>}
            {isHot && <span className={`wl-mover-badge ${up ? 'up-bg up' : 'dn-bg dn'}`}>HOT</span>}
          </div>
          <div className="wl-symbol mono">{symbol}</div>
        </div>
        <MiniSparkline data={priceHistory[symbol]} up={up} />
        <div className="wl-right">
          {q ? (
            <>
              <div className={`wl-price mono ${up ? 'up' : 'dn'} ${flash ? `flash-${flash}` : ''}`}>
                {q.price?.toFixed(2)}
              </div>
              <div className={`wl-chg ${up ? 'up' : 'dn'}`}>
                {up ? '▲' : '▼'}{Math.abs(q.changePct).toFixed(2)}%
              </div>
            </>
          ) : <LoadingDots />}
        </div>
        <div className="wl-actions">
          <button
            className={`wl-pin-btn ${isPinned ? 'pinned' : ''}`}
            onClick={e => { e.stopPropagation(); togglePin(symbol) }}
            title={isPinned ? '取消置頂' : '置頂'}
          >{isPinned ? '★' : '☆'}</button>
          <button
            className="wl-tag-btn"
            onClick={e => { e.stopPropagation(); setTagMenu(v => v === symbol ? null : symbol) }}
            title="標籤"
          >●</button>
          <button
            className={`wl-tag-btn ${symbolNotes[symbol] ? 'note-active' : ''}`}
            onClick={e => { e.stopPropagation(); setNoteEdit(v => v === symbol ? null : symbol); setTagMenu(null) }}
            title="筆記"
            style={{ fontSize: 10 }}
          >{symbolNotes[symbol] ? '📝' : '✎'}</button>
        </div>
        {noteEdit === symbol && (
          <div className="wl-note-edit" onClick={e => e.stopPropagation()}>
            <textarea
              className="wl-note-input"
              placeholder="輸入筆記…"
              defaultValue={symbolNotes[symbol] ?? ''}
              autoFocus
              rows={2}
              onBlur={e => { setNote(symbol, e.target.value.trim()); setNoteEdit(null) }}
              onKeyDown={e => { if (e.key === 'Escape') { setNoteEdit(null); e.preventDefault() } }}
            />
          </div>
        )}
        {symbolNotes[symbol] && noteEdit !== symbol && (
          <div className="wl-note-preview">{symbolNotes[symbol]}</div>
        )}
        {tagMenu === symbol && (
          <div className="wl-tag-picker" onClick={e => e.stopPropagation()}>
            {Object.entries(TAG_COLORS).map(([k, v]) => (
              <button
                key={k}
                className={`tag-pick-dot ${tag === k ? 'active-tag' : ''}`}
                style={{ background: v }}
                onClick={() => { setTag(symbol, tag === k ? null : k); setTagMenu(null) }}
              />
            ))}
            <button className="tag-pick-dot" style={{ background: 'var(--border-md)' }}
              onClick={() => { setTag(symbol, null); setTagMenu(null) }}
            >✕</button>
          </div>
        )}
        <button className="del-btn" onClick={e => { e.stopPropagation(); removeSymbol(symbol) }}>✕</button>
      </li>
    )
  }

  return (
    <aside className="watchlist">
      <div className="wl-header">
        <span className="wl-title">自選清單</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            className={`ibtn-sm ${viewMode === 'heat' ? 'active-sm' : ''}`}
            onClick={() => setViewMode(v => v === 'heat' ? 'list' : 'heat')}
            title="熱力圖視圖"
            style={{ fontSize: 10, fontWeight: 800 }}
          >⬛</button>
          <button
            className={`ibtn-sm ${viewMode === 'table' ? 'active-sm' : ''}`}
            onClick={() => setViewMode(v => v === 'table' ? 'list' : 'table')}
            title="表格視圖"
            style={{ fontSize: 10, fontWeight: 800 }}
          >≡</button>
          <button
            className="ibtn-sm"
            title="匯出自選清單 JSON"
            onClick={() => {
              const data = JSON.stringify({ symbols, notes: Object.fromEntries(Object.entries(useWatchlistStore.getState().symbolNotes)), tags: Object.fromEntries(Object.entries(useWatchlistStore.getState().symbolTags)) }, null, 2)
              const blob = new Blob([data], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a'); a.href = url; a.download = `watchlist-${new Date().toISOString().slice(0,10)}.json`; a.click()
              URL.revokeObjectURL(url)
            }}
          >↓</button>
          <label className="ibtn-sm" title="匯入自選清單 JSON" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0 6px' }}>
            ↑
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={e => {
              const file = e.target.files?.[0]
              if (!file) return
              const reader = new FileReader()
              reader.onload = ev => {
                try {
                  const data = JSON.parse(ev.target.result)
                  if (Array.isArray(data.symbols)) {
                    data.symbols.forEach(s => {
                      if (s.symbol && s.name) addSymbol(s.symbol, s.name, s.category || 'US')
                    })
                  }
                  setImportError('')
                } catch { setImportError('JSON 格式錯誤') }
              }
              reader.readAsText(file)
              e.target.value = ''
            }} />
          </label>
          <button className="ibtn-sm" onClick={() => setShowAdd(v => !v)}>＋</button>
        </div>
      </div>

      <div className="wl-search-wrap">
        <input
          ref={searchRef}
          className="wl-search"
          placeholder="搜尋標的 / 或按 /"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Escape' && setSearch('')}
        />
        {search && (
          <button className="wl-search-clear" onClick={() => setSearch('')}>✕</button>
        )}
      </div>

      <div className="cat-tabs">
        {CATS.map(c => (
          <button key={c} className={`cat-tab ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
          <button
            className={`cat-tab ${sortBy === 'gainPct' ? 'active' : ''}`}
            onClick={() => setSortBy(v => v === 'gainPct' ? 'default' : 'gainPct')}
            title="漲幅排序"
          >↑%</button>
          <button
            className={`cat-tab ${sortBy === 'lossPct' ? 'active' : ''}`}
            onClick={() => setSortBy(v => v === 'lossPct' ? 'default' : 'lossPct')}
            title="跌幅排序"
          >↓%</button>
        </div>
      </div>

      {/* Market breadth + Fear/Greed */}
      {(() => {
        const allQ = symbols.map(s => quotes[s.symbol]).filter(Boolean)
        if (allQ.length < 3) return null
        const gainers = allQ.filter(q => q.change >= 0).length
        const losers = allQ.length - gainers
        const pct = Math.round((gainers / allQ.length) * 100)
        // Simple Fear/Greed from breadth + avg change
        const avgChg = allQ.reduce((s, q) => s + (q.changePct ?? 0), 0) / allQ.length
        let fgScore = 50 + (pct - 50) * 0.6 + avgChg * 3
        fgScore = Math.max(0, Math.min(100, fgScore))
        const fgLabel = fgScore >= 75 ? '極度貪婪' : fgScore >= 60 ? '貪婪' : fgScore >= 40 ? '中性' : fgScore >= 25 ? '恐懼' : '極度恐懼'
        const fgColor = fgScore >= 60 ? 'var(--dn)' : fgScore <= 40 ? 'var(--up)' : 'var(--warn)'
        return (
          <div className="mkt-breadth">
            <div className="mkt-breadth-bar">
              <div className="mkt-breadth-fill up-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="mkt-breadth-labels">
              <span className="up">▲ {gainers}</span>
              <span style={{ color: 'var(--text-3)', fontSize: 9 }}>市場情緒</span>
              <span className="dn">▼ {losers}</span>
            </div>
            <div className="fg-row">
              <div className="fg-track">
                <div className="fg-fill" style={{ width: `${fgScore}%`, background: fgColor }} />
              </div>
              <span className="fg-label" style={{ color: fgColor }}>{fgLabel}</span>
              <span className="fg-score mono" style={{ color: fgColor }}>{fgScore.toFixed(0)}</span>
            </div>
          </div>
        )
      })()}

      {showAdd && (
        <div className="add-form">
          <input placeholder="代號 e.g. 0050.TW" value={addDraft.symbol} onChange={e => setAddDraft(d => ({ ...d, symbol: e.target.value }))} />
          <input placeholder="名稱 e.g. 元大50" value={addDraft.name} onChange={e => setAddDraft(d => ({ ...d, name: e.target.value }))} />
          <select value={addDraft.category} onChange={e => setAddDraft(d => ({ ...d, category: e.target.value }))}>
            <option value="TW">台股</option>
            <option value="US">美股</option>
            <option value="IDX">指數</option>
            <option value="FX">外匯</option>
          </select>
          <button onClick={() => {
            if (addDraft.symbol && addDraft.name) {
              addSymbol(addDraft.symbol.trim().toUpperCase(), addDraft.name, addDraft.category)
              setAddDraft({ symbol: '', name: '', category: 'TW' })
              setShowAdd(false)
            }
          }}>新增</button>
        </div>
      )}

      {viewMode === 'table' ? (
        <div className="wl-table-wrap">
          <table className="wl-table">
            <thead>
              <tr>
                <th>名稱</th>
                <th>現價</th>
                <th>漲跌%</th>
                <th>量</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ symbol, name }) => {
                const q = quotes[symbol]
                const up = q && q.change >= 0
                const flash = flashMap[symbol]
                const tag = symbolTags[symbol]
                const TAG_COLORS = { red: '#ef5350', yellow: '#f59e0b', green: '#26a69a', blue: '#6366f1' }
                return (
                  <tr
                    key={symbol}
                    className={`wl-trow ${selected === symbol ? 'active' : ''}`}
                    onClick={() => setSelected(symbol)}
                  >
                    <td>
                      {tag && <span style={{ color: TAG_COLORS[tag], fontSize: 8, marginRight: 3 }}>●</span>}
                      <span className="wl-tname">{name}</span>
                      <span className="wl-tsym mono"> {symbol}</span>
                    </td>
                    <td className={`mono ${up ? 'up' : 'dn'} ${flash ? `flash-${flash}` : ''}`}>
                      {q ? q.price?.toFixed(2) : '…'}
                    </td>
                    <td className={q ? (up ? 'up' : 'dn') : ''}>
                      {q ? `${up ? '▲' : '▼'}${Math.abs(q.changePct).toFixed(2)}%` : '…'}
                    </td>
                    <td style={{ color: 'var(--text-3)', fontSize: 9 }}>
                      {q?.volume > 0 ? (q.volume >= 1e6 ? (q.volume / 1e6).toFixed(1) + 'M' : (q.volume / 1e3).toFixed(0) + 'K') : '–'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : viewMode === 'heat' ? (
        <div className="wl-heatmap">
          {symbols.map(({ symbol, name }) => {
            const q = quotes[symbol]
            const pct = q?.changePct ?? 0
            const abs = Math.min(Math.abs(pct), 10)
            const intensity = abs / 10
            const isUp = pct >= 0
            const bg = isUp
              ? `rgba(38,166,154,${0.12 + intensity * 0.55})`
              : `rgba(239,83,80,${0.12 + intensity * 0.55})`
            const border = selected === symbol ? '2px solid var(--accent)' : '2px solid transparent'
            return (
              <div
                key={symbol}
                className="heat-cell"
                style={{ background: bg, border }}
                onClick={() => setSelected(symbol)}
              >
                <div className="heat-name">{name}</div>
                {q ? (
                  <div className={`heat-pct ${isUp ? 'up' : 'dn'}`}>
                    {isUp ? '+' : ''}{pct.toFixed(2)}%
                  </div>
                ) : (
                  <div className="heat-pct" style={{ color: 'var(--text-3)' }}>…</div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <ul className="wl-list">
          {filtered.length === 0 && (
            <li style={{ padding: '16px 8px', textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>
              找不到「{search}」
            </li>
          )}
          {groups
            ? groups.map(([groupCat, items]) => (
                <li key={groupCat} style={{ listStyle: 'none' }}>
                  <div className="section-label">{CAT_LABELS[groupCat] ?? groupCat}</div>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {items.map(renderItem)}
                  </ul>
                </li>
              ))
            : filtered.map(renderItem)
          }
        </ul>
      )}
    </aside>
  )
}
