import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchQuote } from '../api/market'
import { useWatchlistStore } from '../store/watchlistStore'

// ── 大盤指數 ──────────────────────────────────────────
const TW_INDICES = [
  { sym: '0050.TW',   name: '台灣50',   label: 'TW50' },
  { sym: '0056.TW',   name: '高股息',   label: 'DIV'  },
  { sym: '006208.TW', name: '富邦台50', label: 'FB50' },
  { sym: '00878.TW',  name: '國泰永續', label: 'ESG'  },
]
const US_INDICES = [
  { sym: '^GSPC', name: 'S&P 500', label: 'SPX' },
  { sym: '^IXIC', name: 'NASDAQ',  label: 'NDX' },
  { sym: '^DJI',  name: '道瓊',    label: 'DJI' },
  { sym: '^VIX',  name: '恐慌指數', label: 'VIX' },
]

// ── 板塊代表股 ─────────────────────────────────────────
const TW_SECTORS = [
  { sym: '2330.TW', name: '半導體',   label: '台積電'  },
  { sym: '2317.TW', name: '電子代工', label: '鴻海'    },
  { sym: '2454.TW', name: 'IC設計',   label: '聯發科'  },
  { sym: '2882.TW', name: '金融',     label: '國泰金'  },
  { sym: '2412.TW', name: '電信',     label: '中華電'  },
  { sym: '2603.TW', name: '航運',     label: '長榮'    },
  { sym: '2002.TW', name: '鋼鐵',     label: '中鋼'    },
  { sym: '1216.TW', name: '食品',     label: '統一'    },
  { sym: '1301.TW', name: '石化',     label: '台塑'    },
  { sym: '2308.TW', name: '電源/光電', label: '台達電'  },
  { sym: '2207.TW', name: '汽車',     label: '和泰車'  },
  { sym: '1101.TW', name: '水泥',     label: '台泥'    },
]
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

// ── 題材股 ────────────────────────────────────────────
const TW_THEMES = [
  {
    name: '🤖 AI 伺服器',
    stocks: [
      { sym: '2308.TW', label: '台達電' },
      { sym: '3231.TW', label: '緯創'   },
      { sym: '6669.TW', label: '緯穎'   },
      { sym: '3017.TW', label: '奇鋐'   },
      { sym: '3034.TW', label: '聯詠'   },
    ],
  },
  {
    name: '⚡ 半導體',
    stocks: [
      { sym: '2330.TW', label: '台積電' },
      { sym: '2303.TW', label: '聯電'   },
      { sym: '2454.TW', label: '聯發科' },
      { sym: '3711.TW', label: '日月光投'},
      { sym: '6415.TW', label: '矽力'   },
    ],
  },
  {
    name: '🚢 航運',
    stocks: [
      { sym: '2603.TW', label: '長榮'   },
      { sym: '2609.TW', label: '陽明'   },
      { sym: '2615.TW', label: '萬海'   },
      { sym: '2618.TW', label: '長榮航' },
    ],
  },
  {
    name: '🔋 儲能/電動',
    stocks: [
      { sym: '1519.TW', label: '華城'   },
      { sym: '1590.TW', label: '亞德客' },
      { sym: '6282.TW', label: '康舒'   },
    ],
  },
  {
    name: '🏦 金融股',
    stocks: [
      { sym: '2882.TW', label: '國泰金' },
      { sym: '2881.TW', label: '富邦金' },
      { sym: '2886.TW', label: '兆豐金' },
      { sym: '2884.TW', label: '玉山金' },
    ],
  },
]
const US_THEMES = [
  {
    name: '🤖 AI 概念',
    stocks: [
      { sym: 'NVDA',  label: 'NVIDIA' },
      { sym: 'MSFT',  label: 'Microsoft' },
      { sym: 'GOOGL', label: 'Google' },
      { sym: 'META',  label: 'Meta'   },
      { sym: 'AMD',   label: 'AMD'    },
    ],
  },
  {
    name: '⚡ 半導體',
    stocks: [
      { sym: 'NVDA', label: 'NVDA' },
      { sym: 'AMD',  label: 'AMD'  },
      { sym: 'INTC', label: 'Intel'},
      { sym: 'QCOM', label: 'QCOM' },
      { sym: 'TSM',  label: 'TSMC' },
    ],
  },
  {
    name: '🚗 電動車',
    stocks: [
      { sym: 'TSLA', label: 'Tesla' },
      { sym: 'RIVN', label: 'Rivian'},
      { sym: 'NIO',  label: 'Nio'   },
    ],
  },
  {
    name: '☁️ 雲端',
    stocks: [
      { sym: 'AMZN', label: 'AWS'    },
      { sym: 'MSFT', label: 'Azure'  },
      { sym: 'GOOGL',label: 'GCP'    },
      { sym: 'CRM',  label: 'Salesforce'},
    ],
  },
  {
    name: '💊 生技醫療',
    stocks: [
      { sym: 'LLY',  label: 'Eli Lilly'},
      { sym: 'NVO',  label: 'Novo'   },
      { sym: 'MRNA', label: 'Moderna'},
      { sym: 'ABBV', label: 'AbbVie' },
    ],
  },
]

// ── 小工具 ────────────────────────────────────────────
function pctColor(pct) {
  if (pct == null) return 'var(--text-3)'
  return pct >= 0 ? 'var(--up)' : 'var(--dn)'
}
function pctBg(pct, intensity = 1) {
  if (pct == null) return 'var(--surface-2)'
  const abs = Math.min(Math.abs(pct), 5) / 5 * intensity
  return pct >= 0
    ? `rgba(239,83,80,${0.07 + abs * 0.5})`
    : `rgba(38,166,154,${0.07 + abs * 0.5})`
}
function fmtPrice(p) {
  if (p == null) return '–'
  return p >= 1000 ? p.toFixed(0) : p >= 100 ? p.toFixed(1) : p.toFixed(2)
}

// ── 大盤指數列 ────────────────────────────────────────
function IndexRow({ item, q }) {
  const pct = q?.changePct ?? null
  const isUp = pct != null && pct >= 0
  return (
    <div className="sc-idx-row" style={{ borderLeft: `3px solid ${pct == null ? 'var(--border)' : isUp ? 'var(--up)' : 'var(--dn)'}` }}>
      <div className="sc-idx-left">
        <div className="sc-idx-label">{item.label}</div>
        <div className="sc-idx-name">{item.name}</div>
      </div>
      <div className="sc-idx-right">
        {q ? (
          <>
            <div className={`sc-idx-price mono ${isUp ? 'up' : 'dn'}`}>{fmtPrice(q.price)}</div>
            <div className={`sc-idx-pct ${isUp ? 'up' : 'dn'}`}>{isUp ? '▲' : '▼'}{Math.abs(pct).toFixed(2)}%</div>
          </>
        ) : <span style={{ color: 'var(--text-3)', fontSize: 10 }}>…</span>}
      </div>
    </div>
  )
}

// ── 板塊格子 ─────────────────────────────────────────
function SectorCell({ sector, q, selected, onSelect }) {
  const pct = q?.changePct ?? null
  return (
    <div
      className={`sc-cell ${selected ? 'sc-cell-sel' : ''}`}
      style={{ background: pctBg(pct), borderColor: selected ? (pct >= 0 ? 'var(--up)' : 'var(--dn)') : 'transparent' }}
      onClick={() => onSelect(sector.sym)}
    >
      <div className="sc-cell-label">{sector.label}</div>
      <div className="sc-cell-name">{sector.name}</div>
      {pct != null
        ? <div className={`sc-cell-pct ${pct >= 0 ? 'up' : 'dn'}`}>{pct >= 0 ? '+' : ''}{pct.toFixed(2)}%</div>
        : <div className="sc-cell-pct" style={{ color: 'var(--text-3)' }}>…</div>}
      {q?.price != null && <div className="sc-cell-price mono">{fmtPrice(q.price)}</div>}
    </div>
  )
}

// ── 題材股 chip ───────────────────────────────────────
function ThemeChip({ stock, q, onSelect }) {
  const pct = q?.changePct ?? null
  return (
    <div
      className="sc-chip"
      style={{ background: pctBg(pct, 0.8), color: pctColor(pct) }}
      onClick={() => onSelect && onSelect(stock.sym)}
      title={`${stock.sym}  ${q ? fmtPrice(q.price) : ''}`}
    >
      <span className="sc-chip-label">{stock.label}</span>
      <span className="sc-chip-pct">{pct != null ? `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%` : '…'}</span>
    </div>
  )
}

// ── 可收合標題 ────────────────────────────────────────
function CollapseSection({ title, defaultOpen = true, children, badge }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="sc-section">
      <button className="sc-section-hdr" onClick={() => setOpen(v => !v)}>
        <span className="sc-section-arrow">{open ? '▾' : '▸'}</span>
        <span className="sc-section-title">{title}</span>
        {badge != null && <span className="sc-section-badge">{badge}</span>}
      </button>
      {open && <div className="sc-section-body">{children}</div>}
    </div>
  )
}

// ── 主元件 ────────────────────────────────────────────
export default function SectorPanel() {
  const [market, setMarket] = useState('TW')
  const [quotes, setQuotes] = useState({})
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [selectedSector, setSelectedSector] = useState(null)
  const intervalRef = useRef(null)
  const setSelected = useWatchlistStore(s => s.setSelected)

  const INDICES = market === 'TW' ? TW_INDICES : US_INDICES
  const SECTORS = market === 'TW' ? TW_SECTORS : US_SECTORS
  const THEMES  = market === 'TW' ? TW_THEMES  : US_THEMES

  const allSyms = useCallback(() => {
    const syms = new Set()
    ;[...INDICES, ...SECTORS].forEach(s => syms.add(s.sym))
    THEMES.forEach(t => t.stocks.forEach(s => syms.add(s.sym)))
    return [...syms]
  }, [market]) // eslint-disable-line

  async function fetchAll() {
    setLoading(true)
    const syms = allSyms()
    const results = await Promise.allSettled(
      syms.map(async sym => {
        const q = await fetchQuote(sym)
        return { sym, q }
      })
    )
    const next = { ...quotes }
    results.forEach(r => { if (r.status === 'fulfilled') next[r.value.sym] = r.value.q })
    setQuotes(next)
    setLastUpdate(new Date())
    setLoading(false)
  }

  useEffect(() => {
    setSelectedSector(null)
    fetchAll()
    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(fetchAll, 60_000)
    return () => clearInterval(intervalRef.current)
  }, [market]) // eslint-disable-line

  // Sector breadth summary
  const sectorData = SECTORS.map(s => quotes[s.sym]?.changePct).filter(v => v != null)
  const upCount = sectorData.filter(v => v >= 0).length
  const dnCount = sectorData.length - upCount

  return (
    <div className="sector-panel">

      {/* ── 市場切換 ── */}
      <div className="sc-mkt-bar">
        <div className="sc-mkt-btns">
          <button
            className={`sc-mkt-btn ${market === 'TW' ? 'active' : ''}`}
            onClick={() => setMarket('TW')}
          >🇹🇼 台股</button>
          <button
            className={`sc-mkt-btn ${market === 'US' ? 'active' : ''}`}
            onClick={() => setMarket('US')}
          >🇺🇸 美股</button>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {sectorData.length > 0 && (
            <span className="sc-breadth">
              <span className="up">▲{upCount}</span>
              <span style={{ color: 'var(--text-3)' }}> / </span>
              <span className="dn">▼{dnCount}</span>
            </span>
          )}
          <button
            className="ibtn-sm"
            onClick={fetchAll}
            title="重新整理"
            style={{ fontSize: 13 }}
          >{loading ? '…' : '↻'}</button>
        </div>
      </div>

      {lastUpdate && (
        <div className="sc-update-bar">
          更新 {lastUpdate.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      )}

      {/* ── 可下滑內容 ── */}
      <div className="sc-scroll">

        {/* 大盤指數 */}
        <CollapseSection title="大盤指數" defaultOpen={true}>
          <div className="sc-idx-list">
            {INDICES.map(item => (
              <IndexRow key={item.sym} item={item} q={quotes[item.sym]} />
            ))}
          </div>
        </CollapseSection>

        {/* 板塊熱力圖 */}
        <CollapseSection
          title="板塊"
          defaultOpen={true}
          badge={sectorData.length > 0 ? `${upCount}漲 ${dnCount}跌` : null}
        >
          <div className="sc-grid">
            {SECTORS.map(s => (
              <SectorCell
                key={s.sym}
                sector={s}
                q={quotes[s.sym]}
                selected={selectedSector === s.sym}
                onSelect={sym => {
                  setSelectedSector(v => v === sym ? null : sym)
                  setSelected(sym)
                }}
              />
            ))}
          </div>
          {/* 排名條 */}
          {sectorData.length > 0 && (
            <div className="sc-rank-mini">
              {SECTORS
                .map(s => ({ ...s, pct: quotes[s.sym]?.changePct ?? null }))
                .filter(s => s.pct !== null)
                .sort((a, b) => b.pct - a.pct)
                .slice(0, 5)
                .map(s => (
                  <div key={s.sym} className="sc-rank-mini-row">
                    <span className="sc-rank-mini-lbl">{s.label}</span>
                    <div className="sc-rank-mini-bar-wrap">
                      <div
                        className="sc-rank-mini-fill"
                        style={{
                          width: `${Math.min(Math.abs(s.pct) / 5 * 100, 100)}%`,
                          background: s.pct >= 0 ? 'var(--up)' : 'var(--dn)',
                        }}
                      />
                    </div>
                    <span className={`sc-rank-mini-val ${s.pct >= 0 ? 'up' : 'dn'}`}>
                      {s.pct >= 0 ? '+' : ''}{s.pct.toFixed(2)}%
                    </span>
                  </div>
                ))}
            </div>
          )}
        </CollapseSection>

        {/* 題材股 */}
        <CollapseSection title="題材股" defaultOpen={true}>
          <div className="sc-themes">
            {THEMES.map(theme => (
              <div key={theme.name} className="sc-theme-group">
                <div className="sc-theme-name">{theme.name}</div>
                <div className="sc-theme-chips">
                  {theme.stocks.map(stock => (
                    <ThemeChip
                      key={stock.sym}
                      stock={stock}
                      q={quotes[stock.sym]}
                      onSelect={sym => setSelected(sym)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CollapseSection>

      </div>
    </div>
  )
}
