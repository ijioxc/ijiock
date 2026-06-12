import { useState, useRef, useEffect, useCallback } from 'react'
import { useWatchlistStore } from '../store/watchlistStore'
import { IconButton } from '../design-system/components/core/IconButton'
import { Button } from '../design-system/components/core/Button'
import { Sparkline } from '../design-system/components/market/Sparkline'

function HoverTip({ children, tip }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ position: 'relative' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && <div className="wl-hover-tip">{tip}</div>}
    </div>
  )
}

const CATS = ['ALL', 'TW', 'US', 'ETF', 'IDX']
const CAT_LABELS = { TW: '台股', US: '美股', ETF: 'ETF', IDX: '指數' }
const TAG_COLORS = { red: '#ef5350', yellow: '#f59e0b', green: '#26a69a', blue: '#6366f1' }

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
  const [addError, setAddError] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [flashMap, setFlashMap] = useState({})
  const [viewMode, setViewMode] = useState('list')
  const prevPricesRef = useRef({})
  const searchRef = useRef(null)
  const symbolInputRef = useRef(null)

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

  // Focus symbol input when add form opens
  useEffect(() => {
    if (showAdd) setTimeout(() => symbolInputRef.current?.focus(), 50)
    else setAddError('')
  }, [showAdd])

  const flatSymbols = cat === 'ALL' ? symbols : symbols.filter(s => s.category === cat)
  const q = search.toLowerCase()
  let filtered = flatSymbols.filter(s =>
    !q || s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
  )
  if (sortBy === 'gainPct') {
    filtered = [...filtered].sort((a, b) => (quotes[b.symbol]?.changePct ?? -999) - (quotes[a.symbol]?.changePct ?? -999))
  } else if (sortBy === 'lossPct') {
    filtered = [...filtered].sort((a, b) => (quotes[a.symbol]?.changePct ?? 999) - (quotes[b.symbol]?.changePct ?? 999))
  } else {
    filtered = [...filtered].sort((a, b) => {
      const pa = pinnedSymbols.includes(a.symbol) ? 0 : 1
      const pb = pinnedSymbols.includes(b.symbol) ? 0 : 1
      return pa - pb
    })
  }

  const filteredRef = useRef(filtered)
  filteredRef.current = filtered
  const navigate = useCallback((dir) => {
    const list = filteredRef.current
    const idx = list.findIndex(s => s.symbol === selected)
    const next = list[idx + dir]
    if (next) setSelected(next.symbol)
  }, [selected, setSelected])

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

  const groups = cat === 'ALL' && !q && sortBy === 'default'
    ? Object.entries(filtered.reduce((acc, s) => {
        const g = s.category
        if (!acc[g]) acc[g] = []
        acc[g].push(s)
        return acc
      }, {}))
    : null

  function handleAdd() {
    const sym = addDraft.symbol.trim().toUpperCase()
    if (!sym) {
      setAddError('請輸入代號')
      symbolInputRef.current?.focus()
      return
    }
    // Name is optional — fall back to the symbol code itself
    const name = addDraft.name.trim() || sym
    addSymbol(sym, name, addDraft.category)
    setAddDraft({ symbol: '', name: '', category: 'TW' })
    setAddError('')
    setShowAdd(false)
  }

  function handleExport() {
    const data = JSON.stringify(
      { symbols, notes: Object.fromEntries(Object.entries(useWatchlistStore.getState().symbolNotes)), tags: Object.fromEntries(Object.entries(useWatchlistStore.getState().symbolTags)) },
      null, 2
    )
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `watchlist-${new Date().toISOString().slice(0, 10)}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result)
        if (Array.isArray(data.symbols)) {
          data.symbols.forEach(s => {
            if (s.symbol) addSymbol(s.symbol, s.name || s.symbol, s.category || 'US')
          })
        }
        setImportError('')
      } catch { setImportError('JSON 格式錯誤') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

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
        <Sparkline data={priceHistory[symbol]} up={up} width={68} height={36} />
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
          <IconButton
            size="sm"
            active={viewMode === 'heat'}
            title="熱力圖視圖"
            onClick={() => setViewMode(v => v === 'heat' ? 'list' : 'heat')}
          >⬛</IconButton>
          <IconButton
            size="sm"
            active={viewMode === 'table'}
            title="表格視圖"
            onClick={() => setViewMode(v => v === 'table' ? 'list' : 'table')}
          >≡</IconButton>
          <IconButton size="sm" title="匯出自選清單 JSON" onClick={handleExport}>↓</IconButton>
          {/* file input overlaid on the import button */}
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <IconButton size="sm" title="匯入自選清單 JSON">↑</IconButton>
            <input
              type="file"
              accept=".json"
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
              onChange={handleImport}
            />
          </div>
          <IconButton
            size="sm"
            active={showAdd}
            title="新增標的"
            onClick={() => setShowAdd(v => !v)}
          >＋</IconButton>
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
        const avgChg = allQ.reduce((s, q) => s + (q.changePct ?? 0), 0) / allQ.length
        let fgScore = 50 + (pct - 50) * 0.6 + avgChg * 3
        fgScore = Math.max(0, Math.min(100, fgScore))
        const fgLabel = fgScore >= 75 ? '極度貪婪' : fgScore >= 60 ? '貪婪' : fgScore >= 40 ? '中性' : fgScore >= 25 ? '恐懼' : '極度恐懼'
        const fgColor = fgScore >= 60 ? 'var(--dn)' : fgScore <= 40 ? 'var(--up)' : 'var(--warn)'
        const fgDesc = fgScore >= 75
          ? '極度貪婪：市場過熱，追高風險高，留意回調'
          : fgScore >= 60 ? '貪婪：多頭氛圍濃，但需注意過度樂觀'
          : fgScore >= 40 ? '中性：多空均衡，方向不明朗，觀望為主'
          : fgScore >= 25 ? '恐懼：市場悲觀，逢低布局機會浮現'
          : '極度恐懼：恐慌拋售，可能是長線低點'
        return (
          <div className="mkt-breadth">
            <HoverTip tip={`自選清單市場寬度\n上漲 ${gainers} 檔 / 下跌 ${losers} 檔\n上漲比例 ${pct}%\n\n比例 > 60% 偏多格局\n比例 < 40% 偏空格局`}>
              <div className="mkt-breadth-bar">
                <div className="mkt-breadth-fill up-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="mkt-breadth-labels">
                <span className="up">▲ {gainers}</span>
                <span style={{ color: 'var(--text-3)', fontSize: 9 }}>市場情緒</span>
                <span className="dn">▼ {losers}</span>
              </div>
            </HoverTip>
            <HoverTip tip={`貪婪恐懼指數：${fgScore.toFixed(0)} / 100\n\n${fgDesc}\n\n計算方式：\n• 上漲比例（60%權重）\n• 平均漲跌幅（40%權重）\n\n0-25 極度恐懼 25-40 恐懼\n40-60 中性 60-75 貪婪\n75-100 極度貪婪`}>
              <div className="fg-row">
                <div className="fg-track">
                  <div className="fg-fill" style={{ width: `${fgScore}%`, background: fgColor }} />
                </div>
                <span className="fg-label" style={{ color: fgColor }}>{fgLabel}</span>
                <span className="fg-score mono" style={{ color: fgColor }}>{fgScore.toFixed(0)}</span>
              </div>
            </HoverTip>
          </div>
        )
      })()}

      {showAdd && (
        <div className="add-form">
          <div className="add-form-title">新增標的</div>
          <div className="add-form-field">
            <label className="add-form-label">代號 <span className="add-form-required">*</span></label>
            <input
              ref={symbolInputRef}
              placeholder="e.g. 0050.TW 或 AAPL"
              value={addDraft.symbol}
              onChange={e => { setAddDraft(d => ({ ...d, symbol: e.target.value })); setAddError('') }}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowAdd(false) }}
            />
          </div>
          <div className="add-form-field">
            <label className="add-form-label">名稱 <span className="add-form-optional">（選填）</span></label>
            <input
              placeholder="e.g. 元大50（留空自動填入）"
              value={addDraft.name}
              onChange={e => setAddDraft(d => ({ ...d, name: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowAdd(false) }}
            />
          </div>
          <div className="add-form-field">
            <label className="add-form-label">類別</label>
            <select value={addDraft.category} onChange={e => setAddDraft(d => ({ ...d, category: e.target.value }))}>
              <option value="TW">台股</option>
              <option value="US">美股</option>
              <option value="ETF">ETF</option>
              <option value="IDX">指數</option>
            </select>
          </div>
          {addError && <div className="add-form-error">{addError}</div>}
          <div className="add-form-actions">
            <Button variant="primary" size="sm" full onClick={handleAdd}>新增</Button>
            <Button variant="ghost" size="sm" full onClick={() => { setShowAdd(false); setAddError('') }}>取消</Button>
          </div>
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
              ? `rgba(239,83,80,${0.12 + intensity * 0.55})`
              : `rgba(38,166,154,${0.12 + intensity * 0.55})`
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
        <ul className="wl-list scroll-soft">
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
