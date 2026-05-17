import { useState, useEffect } from 'react'
import { useWatchlistStore } from '../store/watchlistStore'

const ALERT_TYPES = [
  { key: 'price', label: '價格警示', icon: '💰' },
  { key: 'pct', label: '漲跌幅警示', icon: '📊' },
  { key: 'rsi', label: 'RSI 警示', icon: '📈' },
]

export default function AlertPanel() {
  const selected = useWatchlistStore(s => s.selected)
  const alerts = useWatchlistStore(s => s.alerts)
  const setAlert = useWatchlistStore(s => s.setAlert)
  const triggeredAlerts = useWatchlistStore(s => s.triggeredAlerts)
  const clearTriggered = useWatchlistStore(s => s.clearTriggered)
  const quotes = useWatchlistStore(s => s.quotes)
  const symbols = useWatchlistStore(s => s.symbols)

  const [alertType, setAlertType] = useState('price')
  const [target, setTarget] = useState('')
  const [stop, setStop] = useState('')
  const [pctMove, setPctMove] = useState('')
  const [rsiThresh, setRsiThresh] = useState('')
  const [manageSym, setManageSym] = useState(selected)

  const current = alerts[manageSym] ?? {}
  const q = quotes[manageSym]

  useEffect(() => {
    setManageSym(selected)
    const cur = alerts[selected] ?? {}
    setTarget(cur.target ?? '')
    setStop(cur.stop ?? '')
    setPctMove(cur.pctMove ?? '')
    setRsiThresh(cur.rsiThresh ?? '')
  }, [selected, alerts])

  function save() {
    setAlert(
      manageSym,
      target !== '' ? Number(target) : null,
      stop !== '' ? Number(stop) : null,
      pctMove !== '' ? Number(pctMove) : null,
      rsiThresh !== '' ? Number(rsiThresh) : null,
    )
  }

  const allSetAlerts = symbols.filter(s => {
    const a = alerts[s.symbol]
    return a && (a.target != null || a.stop != null || a.pctMove != null || a.rsiThresh != null)
  })

  return (
    <div className="alert-panel">
      <div className="ap-header">
        <span className="ap-title">盯盤警示</span>
        {triggeredAlerts.length > 0 && (
          <button className="ghost-sm" onClick={clearTriggered}>清除 ({triggeredAlerts.length})</button>
        )}
      </div>

      {q && (
        <div className="ap-current mono">
          <span>{manageSym}</span>
          &nbsp;現價&nbsp;
          <span className={q.change >= 0 ? 'up' : 'dn'}>{q.price?.toFixed(2)}</span>
          &nbsp;
          <span className={q.change >= 0 ? 'up' : 'dn'} style={{ fontSize: 10 }}>
            {q.change >= 0 ? '+' : ''}{q.changePct?.toFixed(2)}%
          </span>
        </div>
      )}

      <div className="ap-type-tabs">
        {ALERT_TYPES.map(t => (
          <button
            key={t.key}
            className={`ap-type-tab ${alertType === t.key ? 'active' : ''}`}
            onClick={() => setAlertType(t.key)}
          >{t.icon} {t.label}</button>
        ))}
      </div>

      {alertType === 'price' && (
        <>
          <div className="ap-row">
            <label>目標價 ↑</label>
            <input type="number" step="any" placeholder="e.g. 1000" value={target} onChange={e => setTarget(e.target.value)} />
            {current.target != null && <span className="ap-set up">已設 {current.target}</span>}
          </div>
          <div className="ap-row">
            <label>停損價 ↓</label>
            <input type="number" step="any" placeholder="e.g. 800" value={stop} onChange={e => setStop(e.target.value)} />
            {current.stop != null && <span className="ap-set dn">已設 {current.stop}</span>}
          </div>
          {q?.price && (
            <div className="ap-hints">
              <button className="ap-hint-btn up" onClick={() => setTarget((q.price * 1.05).toFixed(2))}>+5%</button>
              <button className="ap-hint-btn up" onClick={() => setTarget((q.price * 1.10).toFixed(2))}>+10%</button>
              <button className="ap-hint-btn dn" onClick={() => setStop((q.price * 0.95).toFixed(2))}>-5%</button>
              <button className="ap-hint-btn dn" onClick={() => setStop((q.price * 0.90).toFixed(2))}>-10%</button>
            </div>
          )}
        </>
      )}

      {alertType === 'pct' && (
        <>
          <div className="ap-desc">當日漲跌幅超過設定值時觸發警示</div>
          <div className="ap-row">
            <label>漲幅 %</label>
            <input type="number" step="0.1" min="0" placeholder="e.g. 3" value={pctMove} onChange={e => setPctMove(e.target.value)} />
            {current.pctMove != null && <span className="ap-set up">已設 ±{current.pctMove}%</span>}
          </div>
          <div className="ap-hint-text">任一方向超過 ±{pctMove || '?'}% 時觸發</div>
        </>
      )}

      {alertType === 'rsi' && (
        <>
          <div className="ap-desc">RSI 指標突破閾值時觸發（需圖表載入資料）</div>
          <div className="ap-row">
            <label>RSI 超買值</label>
            <input type="number" step="1" min="50" max="95" placeholder="e.g. 70" value={rsiThresh} onChange={e => setRsiThresh(e.target.value)} />
            {current.rsiThresh != null && <span className="ap-set dn">已設 {current.rsiThresh}</span>}
          </div>
          <div className="ap-hint-text">RSI ≥ {rsiThresh || '?'} 或 ≤ {100 - (parseInt(rsiThresh) || 70)} 時觸發</div>
        </>
      )}

      <button className="save-btn" onClick={save}>儲存警示設定</button>

      {/* All configured alerts summary */}
      {allSetAlerts.length > 0 && (
        <div className="ap-all-section">
          <div className="ap-all-title">已設警示 ({allSetAlerts.length})</div>
          {allSetAlerts.map(({ symbol, name }) => {
            const a = alerts[symbol]
            const q2 = quotes[symbol]
            return (
              <div key={symbol} className="ap-alert-row" onClick={() => setManageSym(symbol)}>
                <span className="ap-alert-sym mono">{symbol}</span>
                <div className="ap-alert-tags">
                  {a.target != null && <span className="ap-tag up">目標 {a.target}</span>}
                  {a.stop != null && <span className="ap-tag dn">停損 {a.stop}</span>}
                  {a.pctMove != null && <span className="ap-tag warn">±{a.pctMove}%</span>}
                  {a.rsiThresh != null && <span className="ap-tag warn">RSI {a.rsiThresh}</span>}
                </div>
                {q2 && (
                  <span className={`ap-alert-price mono ${q2.change >= 0 ? 'up' : 'dn'}`}>{q2.price?.toFixed(2)}</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {triggeredAlerts.length > 0 && (
        <div className="ap-triggered-section">
          <div className="ap-all-title">觸發紀錄</div>
          <ul className="triggered-list">
            {triggeredAlerts.slice(0, 8).map((a, i) => (
              <li key={i} className={a.type === 'target' ? 'up' : 'dn'}>
                {a.type === 'target' ? '📈' : a.type === 'pct' ? '📊' : '📉'}&nbsp;
                {a.symbol}&nbsp;
                {a.type === 'target' ? '突破目標' : a.type === 'pct' ? '漲跌幅' : '跌破停損'}
                <span className="mono"> {a.price?.toFixed(2)}</span>
                <span className="ts">{new Date(a.ts).toLocaleTimeString('zh-TW')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
