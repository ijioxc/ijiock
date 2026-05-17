import { useState, useEffect, useRef, useCallback } from 'react'
import { useWatchlistStore } from '../store/watchlistStore'

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef(null)
  const symbols = useWatchlistStore(s => s.symbols)
  const quotes = useWatchlistStore(s => s.quotes)
  const selected = useWatchlistStore(s => s.selected)
  const setSelected = useWatchlistStore(s => s.setSelected)

  const filtered = query
    ? symbols.filter(s =>
        s.symbol.toLowerCase().includes(query.toLowerCase()) ||
        s.name.toLowerCase().includes(query)
      )
    : symbols

  const pick = useCallback((sym) => {
    setSelected(sym)
    setOpen(false)
    setQuery('')
    setCursor(0)
  }, [setSelected])

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(v => !v)
        if (!open) { setQuery(''); setCursor(0) }
      }
      if (e.key === 'Escape') { setOpen(false); setQuery('') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50) }
  }, [open])

  useEffect(() => { setCursor(0) }, [query])

  function handleKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    if (e.key === 'Enter' && filtered[cursor]) { pick(filtered[cursor].symbol) }
    if (e.key === 'Escape') { setOpen(false) }
  }

  if (!open) return null

  const CAT_COLORS = { TW: '#10b981', US: '#6366f1', IDX: '#f97316', FX: '#06b6d4' }

  return (
    <div className="cmd-overlay" onClick={() => setOpen(false)}>
      <div className="cmd-panel" onClick={e => e.stopPropagation()}>
        <div className="cmd-search-wrap">
          <span className="cmd-icon">⌕</span>
          <input
            ref={inputRef}
            className="cmd-input"
            placeholder="搜尋標的…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
          />
          <span className="cmd-hint-key">ESC</span>
        </div>
        <div className="cmd-list">
          {filtered.length === 0 && (
            <div className="cmd-empty">找不到「{query}」</div>
          )}
          {filtered.map((s, i) => {
            const q = quotes[s.symbol]
            const isUp = q && q.change >= 0
            const isActive = selected === s.symbol
            return (
              <div
                key={s.symbol}
                className={`cmd-item ${cursor === i ? 'focused' : ''} ${isActive ? 'current' : ''}`}
                onMouseEnter={() => setCursor(i)}
                onClick={() => pick(s.symbol)}
              >
                <span className="cmd-cat-dot" style={{ background: CAT_COLORS[s.category] ?? 'var(--text-3)' }} />
                <div className="cmd-item-main">
                  <span className="cmd-name">{s.name}</span>
                  <span className="cmd-sym mono">{s.symbol}</span>
                </div>
                <div className="cmd-item-right">
                  {q ? (
                    <>
                      <span className={`cmd-price mono ${isUp ? 'up' : 'dn'}`}>
                        {q.price?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                      <span className={`cmd-chg ${isUp ? 'up' : 'dn'}`}>
                        {isUp ? '▲' : '▼'}{Math.abs(q.changePct).toFixed(2)}%
                      </span>
                    </>
                  ) : (
                    <span style={{ color: 'var(--text-3)', fontSize: 10 }}>…</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <div className="cmd-footer">
          <span><kbd>↑↓</kbd> 選擇</span>
          <span><kbd>↩</kbd> 確認</span>
          <span><kbd>Esc</kbd> 關閉</span>
          <span style={{ marginLeft: 'auto' }}>{filtered.length} 個標的</span>
        </div>
      </div>
    </div>
  )
}
