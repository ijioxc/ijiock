import { useMemo, useState } from 'react'
import { useWatchlistStore } from '../store/watchlistStore'
import { useTechIndicators } from '../hooks/useTechIndicators'
import { fetchOHLC } from '../api/market'
import { useEffect } from 'react'

const CRITERIA = [
  { id: 'rsi_oversold',   label: 'RSI 超賣 < 30',         desc: '低檔反彈機會',   color: 'var(--up)' },
  { id: 'rsi_overbought', label: 'RSI 超買 > 70',         desc: '高檔回落風險',   color: 'var(--dn)' },
  { id: 'macd_golden',    label: 'MACD 金叉',             desc: 'DIF > DEA 多訊', color: 'var(--up)' },
  { id: 'macd_death',     label: 'MACD 死叉',             desc: 'DIF < DEA 空訊', color: 'var(--dn)' },
  { id: 'above_ma20',     label: '站上 MA20',             desc: '中期多頭',        color: 'var(--up)' },
  { id: 'below_ma20',     label: '跌破 MA20',             desc: '中期空頭',        color: 'var(--dn)' },
  { id: 'kd_golden',      label: 'KD 金叉低檔',           desc: 'K值<50金叉',     color: 'var(--up)' },
  { id: 'kd_death',       label: 'KD 死叉高檔',           desc: 'K值>50死叉',     color: 'var(--dn)' },
  { id: 'bull_engulf',    label: '看漲吞噬 K線',          desc: '陽線吞噬前陰',   color: 'var(--up)' },
  { id: 'bear_engulf',    label: '看跌吞噬 K線',          desc: '陰線吞噬前陽',   color: 'var(--dn)' },
  { id: 'bb_squeeze',     label: 'BB 帶寬收縮 < 6%',     desc: '蓄勢等突破',     color: 'var(--warn)' },
  { id: 'stoch_oversold', label: 'StochRSI 超賣 < 20',   desc: '動能超賣',        color: 'var(--up)' },
  { id: 'wr_oversold',    label: 'Williams %R 超賣',      desc: '%R < -80',        color: 'var(--up)' },
]

function matchCriteria(tech, criterionId) {
  if (!tech) return false
  switch (criterionId) {
    case 'rsi_oversold':   return parseFloat(tech.lastRsi) <= 30
    case 'rsi_overbought': return parseFloat(tech.lastRsi) >= 70
    case 'macd_golden':    return parseFloat(tech.lastMacd) > parseFloat(tech.lastSignal)
    case 'macd_death':     return parseFloat(tech.lastMacd) < parseFloat(tech.lastSignal)
    case 'above_ma20':     return tech.maStatus.includes('多頭')
    case 'below_ma20':     return tech.maStatus.includes('空頭')
    case 'kd_golden':      return tech.kdSignal.includes('金叉') || tech.kdSignal.includes('偏多')
    case 'kd_death':       return tech.kdSignal.includes('死叉') || tech.kdSignal.includes('偏空')
    case 'bull_engulf':    return tech.candlePattern?.name?.includes('Bull') || tech.candlePattern?.name?.includes('吞噬') && tech.candlePattern?.bull
    case 'bear_engulf':    return tech.candlePattern?.name?.includes('Bear') || tech.candlePattern?.name?.includes('吞噬') && tech.candlePattern?.bull === false
    case 'bb_squeeze':     return tech.bbWidth !== null && parseFloat(tech.bbWidth) < 6
    case 'stoch_oversold': return tech.stochRsiK !== null && parseFloat(tech.stochRsiK) < 20
    case 'wr_oversold':    return tech.williamsR !== null && parseFloat(tech.williamsR) <= -80
    default:               return false
  }
}

const PRESETS = [
  { label: '金叉反彈', criteria: ['rsi_oversold', 'macd_golden', 'kd_golden', 'stoch_oversold'] },
  { label: '超強勢多頭', criteria: ['above_ma20', 'macd_golden', 'rsi_overbought'] },
  { label: '超賣機會', criteria: ['rsi_oversold', 'wr_oversold', 'kd_golden'] },
  { label: '突破蓄勢', criteria: ['bb_squeeze', 'above_ma20', 'macd_golden'] },
  { label: '空頭警示', criteria: ['macd_death', 'kd_death', 'below_ma20'] },
]

function ScreenerRow({ symbol, name, tech, matches, quote, onSelect }) {
  const up = quote && quote.change >= 0
  const hitCount = matches.length
  const bullHits = matches.filter(id => CRITERIA.find(c => c.id === id)?.color === 'var(--up)').length
  const bearHits = matches.filter(id => CRITERIA.find(c => c.id === id)?.color === 'var(--dn)').length
  const signal = bullHits > bearHits ? 'bull' : bearHits > bullHits ? 'bear' : 'neutral'
  return (
    <div className={`screener-row ${signal}`} onClick={() => onSelect(symbol)}>
      <div className="screener-row-left">
        <div className="screener-sym mono">{symbol}</div>
        <div className="screener-name">{name}</div>
      </div>
      <div className="screener-row-center">
        {matches.map(id => {
          const c = CRITERIA.find(cr => cr.id === id)
          return c ? (
            <span key={id} className="screener-hit" style={{ color: c.color, borderColor: c.color }}>
              {c.label}
            </span>
          ) : null
        })}
      </div>
      <div className="screener-row-right">
        {quote ? (
          <span className={`screener-price ${up ? 'up' : 'dn'}`}>
            {quote.price?.toFixed(2)} <span style={{ fontSize: 9 }}>{up ? '▲' : '▼'}{Math.abs(quote.changePct).toFixed(2)}%</span>
          </span>
        ) : <span style={{ color: 'var(--text-3)', fontSize: 10 }}>─</span>}
        <span className={`screener-score ${signal}`}>{hitCount}</span>
      </div>
    </div>
  )
}

function SymbolTech({ symbol, range, onReady }) {
  const [candles, setCandles] = useState([])
  useEffect(() => {
    let cancelled = false
    fetchOHLC(symbol, range).then(data => {
      if (cancelled) return
      const sorted = data.sort((a, b) => a.time - b.time)
      setCandles(sorted)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [symbol, range])
  const tech = useTechIndicators(candles)
  useEffect(() => {
    if (tech) onReady(symbol, tech)
  }, [tech, symbol, onReady])
  return null
}

export default function ScreenerPanel() {
  const symbols = useWatchlistStore(s => s.symbols)
  const quotes = useWatchlistStore(s => s.quotes)
  const setSelected = useWatchlistStore(s => s.setSelected)
  const [selectedCriteria, setSelectedCriteria] = useState(['rsi_oversold', 'macd_golden', 'kd_golden'])
  const [techMap, setTechMap] = useState({})
  const [range, setRange] = useState('3mo')
  const [loading, setLoading] = useState(false)
  const [hasScanned, setHasScanned] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  function handleTechReady(symbol, tech) {
    setTechMap(prev => {
      const next = { ...prev, [symbol]: tech }
      setPendingCount(p => Math.max(0, p - 1))
      return next
    })
  }

  function runScan() {
    setTechMap({})
    setLoading(true)
    setHasScanned(true)
    setPendingCount(symbols.length)
  }

  useEffect(() => {
    if (hasScanned && pendingCount === 0) setLoading(false)
  }, [pendingCount, hasScanned])

  const results = useMemo(() => {
    if (!hasScanned) return []
    return symbols.map(({ symbol, name }) => {
      const tech = techMap[symbol]
      const matches = selectedCriteria.filter(id => matchCriteria(tech, id))
      return { symbol, name, tech, matches }
    }).filter(r => r.matches.length > 0)
      .sort((a, b) => b.matches.length - a.matches.length)
  }, [symbols, techMap, selectedCriteria, hasScanned])

  return (
    <div className="screener-panel">
      <div className="screener-header">
        <div className="screener-title">選股篩選器</div>
        <div className="screener-range-tabs">
          {['1mo', '3mo', '6mo'].map(r => (
            <button
              key={r}
              className={`range-tab ${range === r ? 'active' : ''}`}
              onClick={() => setRange(r)}
            >{r}</button>
          ))}
        </div>
      </div>

      <div className="screener-presets">
        {PRESETS.map(p => (
          <button
            key={p.label}
            className="screener-preset-btn"
            onClick={() => setSelectedCriteria(p.criteria)}
          >{p.label}</button>
        ))}
      </div>

      <div className="screener-criteria">
        {CRITERIA.map(c => (
          <button
            key={c.id}
            className={`screener-crit-btn ${selectedCriteria.includes(c.id) ? 'active' : ''}`}
            style={selectedCriteria.includes(c.id) ? { borderColor: c.color, color: c.color } : {}}
            onClick={() => setSelectedCriteria(prev =>
              prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id]
            )}
            title={c.desc}
          >
            {c.label}
          </button>
        ))}
      </div>

      <button
        className="screener-run-btn"
        onClick={runScan}
        disabled={loading || selectedCriteria.length === 0}
      >
        {loading ? `掃描中 (${pendingCount}/${symbols.length})…` : '▶ 開始掃描'}
      </button>

      {hasScanned && loading && (
        <div className="screener-loading-bar">
          <div
            className="screener-loading-fill"
            style={{ width: `${((symbols.length - pendingCount) / symbols.length) * 100}%` }}
          />
        </div>
      )}

      {hasScanned && symbols.map(({ symbol }) => (
        <SymbolTech
          key={`${symbol}-${range}-${hasScanned}`}
          symbol={symbol}
          range={range}
          onReady={handleTechReady}
        />
      ))}

      {hasScanned && !loading && (
        <div className="screener-results-header">
          找到 {results.length} / {symbols.length} 個符合標的
        </div>
      )}

      <div className="screener-results">
        {results.length === 0 && hasScanned && !loading && (
          <div className="screener-empty">無符合條件標的<br /><span>嘗試調整篩選條件</span></div>
        )}
        {results.map(r => (
          <ScreenerRow
            key={r.symbol}
            symbol={r.symbol}
            name={r.name}
            tech={r.tech}
            matches={r.matches}
            quote={quotes[r.symbol]}
            onSelect={(sym) => { setSelected(sym) }}
          />
        ))}
      </div>
    </div>
  )
}
