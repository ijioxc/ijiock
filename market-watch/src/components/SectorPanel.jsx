import { useState, useEffect, useRef } from 'react'
import { fetchQuote } from '../api/market'

const SECTORS = [
  { sym: 'XLK',  name: '科技',     label: 'TECH',   accent: '#6366f1' },
  { sym: 'XLC',  name: '通訊',     label: 'COMM',   accent: '#06b6d4' },
  { sym: 'XLY',  name: '非必需消費', label: 'DISC',   accent: '#8b5cf6' },
  { sym: 'XLF',  name: '金融',     label: 'FIN',    accent: '#0ea5e9' },
  { sym: 'XLV',  name: '醫療',     label: 'HLTH',   accent: '#10b981' },
  { sym: 'XLI',  name: '工業',     label: 'INDS',   accent: '#84cc16' },
  { sym: 'XLE',  name: '能源',     label: 'NRG',    accent: '#f97316' },
  { sym: 'XLB',  name: '材料',     label: 'MATL',   accent: '#a78bfa' },
  { sym: 'XLP',  name: '必需消費',  label: 'STPL',   accent: '#fb923c' },
  { sym: 'XLU',  name: '公用',     label: 'UTIL',   accent: '#34d399' },
  { sym: 'XLRE', name: '房地產',   label: 'REIT',   accent: '#f472b6' },
]

function SectorCell({ sector, q, onSelect, selected }) {
  const pct = q?.changePct ?? null
  const isUp = pct != null && pct >= 0
  const abs = pct != null ? Math.min(Math.abs(pct), 5) : 0
  const intensity = abs / 5
  let bg, border
  if (pct == null) {
    bg = 'var(--surface-2)'
    border = '2px solid transparent'
  } else if (isUp) {
    bg = `rgba(38,166,154,${0.08 + intensity * 0.5})`
    border = selected ? '2px solid rgba(38,166,154,.8)' : '2px solid transparent'
  } else {
    bg = `rgba(239,83,80,${0.08 + intensity * 0.5})`
    border = selected ? '2px solid rgba(239,83,80,.8)' : '2px solid transparent'
  }

  return (
    <div className="sc-cell" style={{ background: bg, border }} onClick={() => onSelect(sector.sym)}>
      <div className="sc-label">{sector.label}</div>
      <div className="sc-name">{sector.name}</div>
      {pct != null ? (
        <div className={`sc-pct ${isUp ? 'up' : 'dn'}`}>
          {isUp ? '+' : ''}{pct.toFixed(2)}%
        </div>
      ) : (
        <div className="sc-pct" style={{ color: 'var(--text-3)' }}>…</div>
      )}
      {q?.price != null && (
        <div className="sc-price mono">{q.price.toFixed(2)}</div>
      )}
    </div>
  )
}

function RankBar({ sectors, quotes }) {
  const ranked = [...sectors]
    .map(s => ({ ...s, pct: quotes[s.sym]?.changePct ?? null }))
    .filter(s => s.pct !== null)
    .sort((a, b) => b.pct - a.pct)

  if (ranked.length === 0) return null
  const maxAbs = Math.max(...ranked.map(s => Math.abs(s.pct)), 0.1)

  return (
    <div className="sc-rank">
      <div className="sc-rank-title">板塊排名</div>
      {ranked.map(s => {
        const isUp = s.pct >= 0
        const w = (Math.abs(s.pct) / maxAbs) * 100
        return (
          <div key={s.sym} className="sc-rank-row">
            <div className="sc-rank-lbl">{s.label}</div>
            <div className="sc-rank-track">
              <div
                className="sc-rank-fill"
                style={{
                  width: `${w}%`,
                  background: isUp ? 'var(--up)' : 'var(--dn)',
                  marginLeft: isUp ? '50%' : `calc(50% - ${w / 2}%)`,
                }}
              />
              <div className="sc-rank-mid" />
            </div>
            <div className={`sc-rank-val ${isUp ? 'up' : 'dn'}`}>
              {isUp ? '+' : ''}{s.pct.toFixed(2)}%
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function SectorPanel() {
  const [quotes, setQuotes] = useState({})
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [selected, setSelected] = useState(null)
  const [viewMode, setViewMode] = useState('heat') // 'heat' | 'rank'
  const intervalRef = useRef(null)

  async function fetchAll() {
    setLoading(true)
    const results = await Promise.allSettled(
      SECTORS.map(async s => {
        const q = await fetchQuote(s.sym)
        return { sym: s.sym, q }
      })
    )
    const next = {}
    results.forEach(r => {
      if (r.status === 'fulfilled') next[r.value.sym] = r.value.q
    })
    setQuotes(next)
    setLastUpdate(new Date())
    setLoading(false)
  }

  useEffect(() => {
    fetchAll()
    intervalRef.current = setInterval(fetchAll, 60_000)
    return () => clearInterval(intervalRef.current)
  }, [])

  const sel = SECTORS.find(s => s.sym === selected)
  const selQ = selected ? quotes[selected] : null

  // Summary: how many sectors up vs down
  const withData = SECTORS.map(s => quotes[s.sym]?.changePct).filter(v => v != null)
  const upCount = withData.filter(v => v >= 0).length
  const avgPct = withData.length ? (withData.reduce((a, b) => a + b, 0) / withData.length) : 0

  return (
    <div className="sector-panel">
      <div className="sc-header">
        <div>
          <div className="sc-title">美股板塊</div>
          {lastUpdate && (
            <div className="sc-update">
              更新 {lastUpdate.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {withData.length > 0 && (
            <div className="sc-summary">
              <span className="up">▲{upCount}</span>
              <span style={{ color: 'var(--text-3)', margin: '0 3px' }}>/</span>
              <span className="dn">▼{withData.length - upCount}</span>
              <span style={{ marginLeft: 6, fontWeight: 700, fontSize: 10, color: avgPct >= 0 ? 'var(--up)' : 'var(--dn)' }}>
                avg {avgPct >= 0 ? '+' : ''}{avgPct.toFixed(2)}%
              </span>
            </div>
          )}
          <button
            className={`ibtn-sm ${viewMode === 'heat' ? 'active-sm' : ''}`}
            onClick={() => setViewMode(v => v === 'heat' ? 'rank' : 'heat')}
            title={viewMode === 'heat' ? '切換排名' : '切換熱力圖'}
          >{viewMode === 'heat' ? '≡' : '⬛'}</button>
          <button
            className="ibtn-sm"
            onClick={fetchAll}
            title="重新整理"
            style={{ fontSize: 13 }}
          >{loading ? '…' : '↻'}</button>
        </div>
      </div>

      {viewMode === 'heat' ? (
        <div className="sc-grid">
          {SECTORS.map(s => (
            <SectorCell
              key={s.sym}
              sector={s}
              q={quotes[s.sym]}
              selected={selected === s.sym}
              onSelect={sym => setSelected(v => v === sym ? null : sym)}
            />
          ))}
        </div>
      ) : (
        <div className="sc-rank-wrap">
          <RankBar sectors={SECTORS} quotes={quotes} />
        </div>
      )}

      {sel && selQ && (
        <div className="sc-detail">
          <div className="sc-detail-name">{sel.name} ({sel.sym})</div>
          <div className="sc-detail-row">
            <span className="sc-detail-k">現價</span>
            <span className={`sc-detail-v mono ${selQ.changePct >= 0 ? 'up' : 'dn'}`}>{selQ.price?.toFixed(2)}</span>
          </div>
          <div className="sc-detail-row">
            <span className="sc-detail-k">漲跌</span>
            <span className={`sc-detail-v mono ${selQ.change >= 0 ? 'up' : 'dn'}`}>
              {selQ.change >= 0 ? '+' : ''}{selQ.change?.toFixed(2)} ({selQ.changePct >= 0 ? '+' : ''}{selQ.changePct?.toFixed(2)}%)
            </span>
          </div>
          {selQ.high && (
            <div className="sc-detail-row">
              <span className="sc-detail-k">日高</span>
              <span className="sc-detail-v mono up">{selQ.high?.toFixed(2)}</span>
            </div>
          )}
          {selQ.low && (
            <div className="sc-detail-row">
              <span className="sc-detail-k">日低</span>
              <span className="sc-detail-v mono dn">{selQ.low?.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
