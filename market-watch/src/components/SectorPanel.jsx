import { useState, useEffect, useRef } from 'react'
import { fetchQuote } from '../api/market'

const US_SECTORS = [
  { sym: 'XLK',  name: '科技',      label: 'TECH' },
  { sym: 'XLC',  name: '通訊',      label: 'COMM' },
  { sym: 'XLY',  name: '非必需消費', label: 'DISC' },
  { sym: 'XLF',  name: '金融',      label: 'FIN'  },
  { sym: 'XLV',  name: '醫療',      label: 'HLTH' },
  { sym: 'XLI',  name: '工業',      label: 'INDS' },
  { sym: 'XLE',  name: '能源',      label: 'NRG'  },
  { sym: 'XLB',  name: '材料',      label: 'MATL' },
  { sym: 'XLP',  name: '必需消費',   label: 'STPL' },
  { sym: 'XLU',  name: '公用',      label: 'UTIL' },
  { sym: 'XLRE', name: '房地產',    label: 'REIT' },
]

const TW_SECTORS = [
  { sym: '2330.TW', name: '半導體',   label: '台積電'  },
  { sym: '2317.TW', name: '電子代工', label: '鴻海'    },
  { sym: '2882.TW', name: '金融',     label: '國泰金'  },
  { sym: '2412.TW', name: '電信',     label: '中華電'  },
  { sym: '2603.TW', name: '航運',     label: '長榮'    },
  { sym: '2002.TW', name: '鋼鐵',     label: '中鋼'    },
  { sym: '1216.TW', name: '食品',     label: '統一'    },
  { sym: '1301.TW', name: '石化',     label: '台塑'    },
  { sym: '1101.TW', name: '水泥',     label: '台泥'    },
  { sym: '2207.TW', name: '汽車',     label: '和泰車'  },
  { sym: '2308.TW', name: '光電',     label: '台達電'  },
  { sym: '3711.TW', name: 'IC設計',   label: '日月光投' },
]

function SectorCell({ sector, q, onSelect, selected }) {
  const pct = q?.changePct ?? null
  const isUp = pct != null && pct >= 0
  const abs = pct != null ? Math.min(Math.abs(pct), 5) : 0
  const intensity = abs / 5
  // 紅漲綠跌
  const bg = pct == null
    ? 'var(--surface-2)'
    : isUp
      ? `rgba(239,83,80,${0.08 + intensity * 0.52})`
      : `rgba(38,166,154,${0.08 + intensity * 0.52})`
  const borderColor = selected
    ? (isUp ? 'rgba(239,83,80,.85)' : 'rgba(38,166,154,.85)')
    : 'transparent'

  return (
    <div
      className="sc-cell"
      style={{ background: bg, border: `2px solid ${borderColor}` }}
      onClick={() => onSelect(sector.sym)}
    >
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
        <div className="sc-price mono">
          {q.price >= 100 ? q.price.toFixed(1) : q.price.toFixed(2)}
        </div>
      )}
    </div>
  )
}

function RankBar({ sectors, quotes }) {
  const ranked = sectors
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
        const w = (Math.abs(s.pct) / maxAbs) * 50
        return (
          <div key={s.sym} className="sc-rank-row">
            <div className="sc-rank-lbl">{s.label}</div>
            <div className="sc-rank-track">
              <div className="sc-rank-mid" />
              <div
                className="sc-rank-fill"
                style={{
                  width: `${w}%`,
                  background: isUp ? 'var(--up)' : 'var(--dn)',
                  position: 'absolute',
                  top: 0, bottom: 0,
                  left: isUp ? '50%' : `calc(50% - ${w}%)`,
                }}
              />
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
  const [market, setMarket] = useState('TW') // 'TW' | 'US'
  const [quotes, setQuotes] = useState({})
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [selected, setSelected] = useState(null)
  const [viewMode, setViewMode] = useState('heat')
  const intervalRef = useRef(null)

  const SECTORS = market === 'TW' ? TW_SECTORS : US_SECTORS

  async function fetchAll(sectorList) {
    setLoading(true)
    const list = sectorList || SECTORS
    const results = await Promise.allSettled(
      list.map(async s => {
        const q = await fetchQuote(s.sym)
        return { sym: s.sym, q }
      })
    )
    const next = { ...quotes }
    results.forEach(r => {
      if (r.status === 'fulfilled') next[r.value.sym] = r.value.q
    })
    setQuotes(next)
    setLastUpdate(new Date())
    setLoading(false)
  }

  useEffect(() => {
    setSelected(null)
    fetchAll(SECTORS)
    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => fetchAll(SECTORS), 60_000)
    return () => clearInterval(intervalRef.current)
  }, [market]) // eslint-disable-line

  const sel = SECTORS.find(s => s.sym === selected)
  const selQ = selected ? quotes[selected] : null
  const withData = SECTORS.map(s => quotes[s.sym]?.changePct).filter(v => v != null)
  const upCount = withData.filter(v => v >= 0).length
  const avgPct = withData.length ? withData.reduce((a, b) => a + b, 0) / withData.length : 0

  return (
    <div className="sector-panel">
      <div className="sc-header">
        <div>
          {/* 市場切換 tab */}
          <div className="sc-mkt-tabs">
            <button
              className={`sc-mkt-tab ${market === 'TW' ? 'active' : ''}`}
              onClick={() => setMarket('TW')}
            >台股</button>
            <button
              className={`sc-mkt-tab ${market === 'US' ? 'active' : ''}`}
              onClick={() => setMarket('US')}
            >美股</button>
          </div>
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
            className="ibtn-sm"
            onClick={() => setViewMode(v => v === 'heat' ? 'rank' : 'heat')}
            title={viewMode === 'heat' ? '切換排名' : '切換熱力圖'}
          >{viewMode === 'heat' ? '≡' : '⬛'}</button>
          <button
            className="ibtn-sm"
            onClick={() => fetchAll()}
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
        <RankBar sectors={SECTORS} quotes={quotes} />
      )}

      {sel && selQ && (
        <div className="sc-detail">
          <div className="sc-detail-name">{sel.name} · {sel.label}</div>
          <div className="sc-detail-row">
            <span className="sc-detail-k">現價</span>
            <span className={`sc-detail-v mono ${selQ.changePct >= 0 ? 'up' : 'dn'}`}>
              {selQ.price >= 100 ? selQ.price.toFixed(1) : selQ.price?.toFixed(2)}
            </span>
          </div>
          <div className="sc-detail-row">
            <span className="sc-detail-k">漲跌</span>
            <span className={`sc-detail-v mono ${selQ.change >= 0 ? 'up' : 'dn'}`}>
              {selQ.change >= 0 ? '+' : ''}{selQ.change?.toFixed(2)}（{selQ.changePct >= 0 ? '+' : ''}{selQ.changePct?.toFixed(2)}%）
            </span>
          </div>
          {selQ.high && <div className="sc-detail-row">
            <span className="sc-detail-k">日高</span>
            <span className="sc-detail-v mono up">{selQ.high >= 100 ? selQ.high.toFixed(1) : selQ.high?.toFixed(2)}</span>
          </div>}
          {selQ.low && <div className="sc-detail-row">
            <span className="sc-detail-k">日低</span>
            <span className="sc-detail-v mono dn">{selQ.low >= 100 ? selQ.low.toFixed(1) : selQ.low?.toFixed(2)}</span>
          </div>}
          {selQ.volume > 0 && <div className="sc-detail-row">
            <span className="sc-detail-k">成交量</span>
            <span className="sc-detail-v mono" style={{ color: 'var(--text-2)' }}>
              {selQ.volume >= 1e8 ? (selQ.volume / 1e8).toFixed(1) + '億'
                : selQ.volume >= 1e4 ? (selQ.volume / 1e4).toFixed(0) + '萬'
                : selQ.volume.toLocaleString()}
            </span>
          </div>}
        </div>
      )}
    </div>
  )
}
