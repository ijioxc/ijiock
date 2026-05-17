import { useState } from 'react'
import { useWatchlistStore } from '../store/watchlistStore'

function pearson(a, b) {
  const n = Math.min(a.length, b.length)
  if (n < 3) return null
  const xs = a.slice(-n), ys = b.slice(-n)
  const mx = xs.reduce((s, v) => s + v, 0) / n
  const my = ys.reduce((s, v) => s + v, 0) / n
  let num = 0, dx2 = 0, dy2 = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my
    num += dx * dy; dx2 += dx * dx; dy2 += dy * dy
  }
  const denom = Math.sqrt(dx2 * dy2)
  return denom === 0 ? null : num / denom
}

function CorrelationMatrix({ syms, priceHistory }) {
  const valid = syms.filter(s => (priceHistory[s]?.length ?? 0) >= 5)
  if (valid.length < 2) return null
  return (
    <div className="corr-wrap">
      <div className="corr-title">相關性矩陣</div>
      <div className="corr-table" style={{ gridTemplateColumns: `64px repeat(${valid.length}, 1fr)` }}>
        <div className="corr-cell corr-hdr" />
        {valid.map(s => <div key={s} className="corr-cell corr-hdr">{s.split('.')[0].slice(0, 5)}</div>)}
        {valid.map(row => (
          [<div key={`lbl-${row}`} className="corr-cell corr-row-lbl">{row.split('.')[0].slice(0, 5)}</div>,
          ...valid.map(col => {
            const r = pearson(priceHistory[row], priceHistory[col])
            if (r === null) return <div key={col} className="corr-cell">–</div>
            const isIdentity = row === col
            const abs = Math.abs(r)
            const isPos = r >= 0
            const bg = isIdentity
              ? 'rgba(99,102,241,.25)'
              : isPos
                ? `rgba(38,166,154,${0.08 + abs * 0.55})`
                : `rgba(239,83,80,${0.08 + abs * 0.55})`
            return (
              <div
                key={col}
                className={`corr-cell ${isIdentity ? 'corr-diag' : ''}`}
                style={{ background: bg }}
                title={`${row} / ${col}: ${r.toFixed(3)}`}
              >
                {isIdentity ? '1.0' : r.toFixed(2)}
              </div>
            )
          })]
        ))}
      </div>
      <div className="corr-hint">基於最近 {Math.min(...valid.map(s => priceHistory[s]?.length ?? 0))} 次報價</div>
    </div>
  )
}

const DONUT_COLORS = ['#6366f1','#26a69a','#ef5350','#f59e0b','#06b6d4','#8b5cf6','#f97316','#ec4899']

function DonutChart({ rows }) {
  const total = rows.reduce((s, r) => s + (r.value ?? r.cost * r.qty), 0)
  if (total === 0 || rows.length < 2) return null
  const cx = 40, cy = 40, R = 34, ri = 22
  let cumAngle = -Math.PI / 2
  const arcs = rows.map((r, i) => {
    const pct = (r.value ?? r.cost * r.qty) / total
    const start = cumAngle
    const end = cumAngle + pct * 2 * Math.PI
    cumAngle = end
    const x1 = cx + R * Math.cos(start), y1 = cy + R * Math.sin(start)
    const x2 = cx + R * Math.cos(end),   y2 = cy + R * Math.sin(end)
    const x3 = cx + ri * Math.cos(end),  y3 = cy + ri * Math.sin(end)
    const x4 = cx + ri * Math.cos(start),y4 = cy + ri * Math.sin(start)
    const large = pct > 0.5 ? 1 : 0
    const d = `M${x1} ${y1} A${R} ${R} 0 ${large} 1 ${x2} ${y2} L${x3} ${y3} A${ri} ${ri} 0 ${large} 0 ${x4} ${y4}Z`
    return { d, color: DONUT_COLORS[i % DONUT_COLORS.length], name: r.name, pct }
  })
  return (
    <div className="pf-donut-wrap">
      <svg viewBox="0 0 80 80" className="pf-donut-svg">
        {arcs.map((arc, i) => (
          <path key={i} d={arc.d} fill={arc.color} opacity={0.9} />
        ))}
        <text x="40" y="43" textAnchor="middle" fontSize="8" fontWeight="800" fill="var(--text-2)">配置</text>
      </svg>
      <div className="pf-donut-legend">
        {arcs.map((a, i) => (
          <div key={i} className="pf-donut-item">
            <span className="pf-donut-dot" style={{ background: a.color }} />
            <span className="pf-donut-name">{a.name.slice(0, 4)}</span>
            <span className="pf-donut-pct">{(a.pct * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PnlBarChart({ rows }) {
  const withData = rows.filter(r => r.pnlPct != null)
  if (withData.length === 0) return null
  const maxAbs = Math.max(...withData.map(r => Math.abs(r.pnlPct)), 1)
  return (
    <div className="pf-chart">
      <div className="pf-chart-title">各持倉損益 %</div>
      {withData.map(r => {
        const up = r.pnlPct >= 0
        const pct = (Math.abs(r.pnlPct) / maxAbs) * 100
        return (
          <div key={r.symbol} className="pf-bar-row">
            <span className="pf-bar-sym">{r.name.slice(0, 4)}</span>
            <div className="pf-bar-track">
              <div
                className={`pf-bar-fill ${up ? 'up-fill' : 'dn-fill'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className={`pf-bar-val ${up ? 'up' : 'dn'}`}>
              {up ? '+' : ''}{r.pnlPct.toFixed(2)}%
            </span>
          </div>
        )
      })}
    </div>
  )
}

function calcVaR(rows, priceHistory, totalValue) {
  if (totalValue <= 0 || rows.length === 0) return null
  const weights = rows.map(r => (r.value ?? r.cost * r.qty) / totalValue)
  const histories = rows.map(r => priceHistory[r.symbol] ?? [])
  const minLen = Math.min(...histories.map(h => h.length))
  if (minLen < 10) return null
  const portfolioReturns = []
  for (let i = 1; i < minLen; i++) {
    let pr = 0
    rows.forEach((_, j) => {
      const h = histories[j]
      const offset = h.length - minLen
      const prev = h[offset + i - 1], cur = h[offset + i]
      if (prev > 0) pr += weights[j] * (cur - prev) / prev
    })
    portfolioReturns.push(pr)
  }
  if (portfolioReturns.length < 10) return null
  const sorted = [...portfolioReturns].sort((a, b) => a - b)
  const idx95 = Math.floor(sorted.length * 0.05)
  const idx99 = Math.floor(sorted.length * 0.01)
  const var95 = Math.abs(sorted[idx95] ?? sorted[0]) * totalValue
  const var99 = Math.abs(sorted[idx99] ?? sorted[0]) * totalValue
  return { var95, var99, samples: portfolioReturns.length }
}

function calcBeta(priceHistory, symbol, benchmarkSymbol = '^GSPC') {
  const a = priceHistory[symbol] ?? []
  const b = priceHistory[benchmarkSymbol] ?? priceHistory['SPY'] ?? []
  const n = Math.min(a.length, b.length)
  if (n < 5) return null
  const ra = [], rb = []
  for (let i = 1; i < n; i++) {
    const oa = a[a.length - n + i - 1], na = a[a.length - n + i]
    const ob = b[b.length - n + i - 1], nb = b[b.length - n + i]
    if (oa > 0 && ob > 0) { ra.push((na - oa) / oa); rb.push((nb - ob) / ob) }
  }
  if (ra.length < 5) return null
  const mr = ra.reduce((s, v) => s + v, 0) / ra.length
  const mb = rb.reduce((s, v) => s + v, 0) / rb.length
  let cov = 0, varB = 0
  for (let i = 0; i < ra.length; i++) {
    cov += (ra[i] - mr) * (rb[i] - mb)
    varB += (rb[i] - mb) ** 2
  }
  return varB === 0 ? null : cov / varB
}

function calcRiskMetrics(rows, priceHistory, totalValue) {
  const var_ = calcVaR(rows, priceHistory, totalValue)
  if (!var_) return null

  const weights = rows.map(r => (r.value ?? r.cost * r.qty) / totalValue)
  const histories = rows.map(r => priceHistory[r.symbol] ?? [])
  const minLen = Math.min(...histories.map(h => h.length))
  if (minLen < 10) return var_

  const portfolioReturns = []
  for (let i = 1; i < minLen; i++) {
    let pr = 0
    rows.forEach((_, j) => {
      const h = histories[j]
      const offset = h.length - minLen
      const prev = h[offset + i - 1], cur = h[offset + i]
      if (prev > 0) pr += weights[j] * (cur - prev) / prev
    })
    portfolioReturns.push(pr)
  }

  const n = portfolioReturns.length
  const mean = portfolioReturns.reduce((s, v) => s + v, 0) / n
  const downsideReturns = portfolioReturns.filter(r => r < 0)
  const downsideDev = downsideReturns.length > 0
    ? Math.sqrt(downsideReturns.reduce((s, r) => s + r * r, 0) / n)
    : 0.0001
  const sortino = ((mean * 252) / (downsideDev * Math.sqrt(252))).toFixed(2)

  let peak = 1, maxDD = 0, nav = 1
  for (const r of portfolioReturns) {
    nav *= (1 + r)
    if (nav > peak) peak = nav
    const dd = (nav - peak) / peak
    if (dd < maxDD) maxDD = dd
  }
  const totalReturn = (nav - 1) * 100
  const calmar = maxDD !== 0 ? ((totalReturn / 100) / Math.abs(maxDD)).toFixed(2) : '─'

  return { ...var_, sortino, calmar, totalReturn: totalReturn.toFixed(1), maxDD: (maxDD * 100).toFixed(1) }
}

function VaRPanel({ rows, priceHistory, totalValue }) {
  const metrics = calcRiskMetrics(rows, priceHistory, totalValue)
  if (!metrics) return null
  return (
    <div className="var-panel">
      <div className="var-title">風險指標（歷史模擬法）</div>
      <div className="var-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div className="var-item">
          <div className="var-k">VaR 95%</div>
          <div className="var-v dn">-{metrics.var95.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          <div className="var-hint">單日最大損失</div>
        </div>
        <div className="var-item">
          <div className="var-k">VaR 99%</div>
          <div className="var-v dn">-{metrics.var99.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          <div className="var-hint">極端單日損失</div>
        </div>
        {metrics.sortino && (
          <div className="var-item">
            <div className="var-k">Sortino</div>
            <div className={`var-v ${parseFloat(metrics.sortino) > 1 ? 'up' : 'dn'}`}>{metrics.sortino}</div>
            <div className="var-hint">下行風險調整報酬</div>
          </div>
        )}
        {metrics.calmar && (
          <div className="var-item">
            <div className="var-k">Calmar</div>
            <div className={`var-v ${parseFloat(metrics.calmar) > 1 ? 'up' : 'dn'}`}>{metrics.calmar}</div>
            <div className="var-hint">報酬 / 最大回撤</div>
          </div>
        )}
        {metrics.totalReturn && (
          <div className="var-item">
            <div className="var-k">期間報酬</div>
            <div className={`var-v ${parseFloat(metrics.totalReturn) >= 0 ? 'up' : 'dn'}`}>
              {parseFloat(metrics.totalReturn) >= 0 ? '+' : ''}{metrics.totalReturn}%
            </div>
            <div className="var-hint">樣本期間累積</div>
          </div>
        )}
        {metrics.maxDD && (
          <div className="var-item">
            <div className="var-k">最大回撤</div>
            <div className="var-v dn">{metrics.maxDD}%</div>
            <div className="var-hint">峰谷最大跌幅</div>
          </div>
        )}
      </div>
    </div>
  )
}

function NavChart({ rows, priceHistory, totalCost }) {
  const minLen = Math.min(...rows.map(r => priceHistory[r.symbol]?.length ?? 0))
  if (minLen < 3) return null
  const weights = rows.map(r => r.cost * r.qty / Math.max(totalCost, 1))
  const navSeries = []
  let nav = 100
  for (let i = 1; i < minLen; i++) {
    let dr = 0
    rows.forEach((r, j) => {
      const h = priceHistory[r.symbol]
      const offset = h.length - minLen
      const prev = h[offset + i - 1], cur = h[offset + i]
      if (prev > 0) dr += weights[j] * (cur - prev) / prev
    })
    nav *= (1 + dr)
    navSeries.push(nav)
  }
  const width = 400, height = 48
  const minNav = Math.min(...navSeries, 98), maxNav = Math.max(...navSeries, 102)
  const rangeNav = maxNav - minNav || 1
  const n = navSeries.length
  const pts = navSeries.map((v, i) => {
    const x = (i / (n - 1)) * (width - 4) + 2
    const y = (1 - (v - minNav) / rangeNav) * (height - 6) + 3
    return `${x},${y}`
  }).join(' ')
  const lastNav = navSeries[n - 1]
  const isUp = lastNav >= 100
  const color = isUp ? 'var(--up)' : 'var(--dn)'
  const zeroY = (1 - (100 - minNav) / rangeNav) * (height - 6) + 3
  return (
    <div className="nav-chart-wrap">
      <div className="nav-chart-header">
        <span className="nav-chart-title">投組走勢（NAV 基數100）</span>
        <span className={`nav-chart-val ${isUp ? 'up' : 'dn'}`}>{lastNav.toFixed(1)}</span>
      </div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="nav-chart-svg">
        {zeroY > 3 && zeroY < height - 3 && (
          <line x1="0" y1={zeroY} x2={width} y2={zeroY} stroke="rgba(255,255,255,.1)" strokeWidth="1" strokeDasharray="3,3" />
        )}
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function RebalancePanel({ rows, totalValue }) {
  const [targets, setTargets] = useState(() =>
    Object.fromEntries(rows.map(r => [r.symbol, Math.round(100 / Math.max(rows.length, 1))]))
  )
  const totalTarget = Object.values(targets).reduce((s, v) => s + (parseFloat(v) || 0), 0)
  const isValid = Math.abs(totalTarget - 100) <= 1

  return (
    <div className="rebal-panel">
      <div className="rebal-title">
        再平衡建議
        <span className={`rebal-total ${isValid ? 'up' : 'dn'}`}> {totalTarget.toFixed(0)}%</span>
      </div>
      <div className="rebal-list">
        {rows.map(r => {
          const current = totalValue > 0 ? ((r.value ?? r.cost * r.qty) / totalValue) * 100 : 0
          const target = parseFloat(targets[r.symbol]) || 0
          const diff = target - current
          return (
            <div key={r.symbol} className="rebal-row">
              <span className="rebal-sym">{r.symbol.split('.')[0].slice(0, 5)}</span>
              <div className="rebal-bars">
                <div className="rebal-bar-track">
                  <div className="rebal-bar-cur" style={{ width: `${Math.min(current, 100)}%` }} title={`現持 ${current.toFixed(1)}%`} />
                </div>
                <div className="rebal-bar-track" style={{ background: 'rgba(99,102,241,.1)' }}>
                  <div className="rebal-bar-tgt" style={{ width: `${Math.min(target, 100)}%` }} />
                </div>
              </div>
              <input
                type="number" min="0" max="100" step="1"
                className="rebal-input"
                value={targets[r.symbol] ?? ''}
                onChange={e => setTargets(prev => ({ ...prev, [r.symbol]: e.target.value }))}
              />
              <span className={`rebal-diff ${diff >= 0 ? 'up' : 'dn'}`}>
                {diff >= 0 ? '+' : ''}{diff.toFixed(1)}%
              </span>
            </div>
          )
        })}
      </div>
      {!isValid && (
        <div className="rebal-warn">目標總和需為 100%（目前 {totalTarget.toFixed(0)}%）</div>
      )}
    </div>
  )
}

function PositionSizer({ totalValue, quotes, symbols }) {
  const [sym, setSym] = useState('')
  const [riskPct, setRiskPct] = useState('1')
  const [stopDist, setStopDist] = useState('')
  const price = sym ? (quotes[sym]?.price ?? null) : null

  const riskAmount = totalValue * (parseFloat(riskPct) / 100)
  const stop = parseFloat(stopDist)
  const shares = price && stop > 0 && !isNaN(stop) ? Math.floor(riskAmount / stop) : null
  const posValue = shares && price ? shares * price : null
  const posWeight = posValue && totalValue > 0 ? (posValue / totalValue) * 100 : null

  return (
    <div className="sizer-panel">
      <div className="sizer-title">倉位計算器（固定風險法）</div>
      <div className="sizer-row">
        <select className="sizer-select" value={sym} onChange={e => setSym(e.target.value)}>
          <option value="">選擇標的…</option>
          {symbols.map(s => <option key={s.symbol} value={s.symbol}>{s.name} ({s.symbol})</option>)}
        </select>
        <div className="sizer-field">
          <label>風險%</label>
          <input type="number" className="sizer-input" value={riskPct} min="0.1" max="5" step="0.1"
            onChange={e => setRiskPct(e.target.value)} />
        </div>
        <div className="sizer-field">
          <label>停損距</label>
          <input type="number" className="sizer-input" value={stopDist} placeholder={price ? (price * 0.02).toFixed(2) : ''}
            onChange={e => setStopDist(e.target.value)} />
        </div>
      </div>
      {shares !== null && (
        <div className="sizer-result">
          <div className="sizer-res-item">
            <span className="sizer-res-k">建議股數</span>
            <span className="sizer-res-v up">{shares.toLocaleString()}</span>
          </div>
          <div className="sizer-res-item">
            <span className="sizer-res-k">投入市值</span>
            <span className="sizer-res-v">{posValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="sizer-res-item">
            <span className="sizer-res-k">占比</span>
            <span className={`sizer-res-v ${posWeight > 20 ? 'dn' : 'up'}`}>{posWeight.toFixed(1)}%</span>
          </div>
          <div className="sizer-res-item">
            <span className="sizer-res-k">最大虧損</span>
            <span className="sizer-res-v dn">-{riskAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
        </div>
      )}
    </div>
  )
}

const STORAGE_KEY = 'mw-portfolio'

function loadPositions() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function savePositions(p) { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)) }

export default function PortfolioPanel() {
  const quotes = useWatchlistStore(s => s.quotes)
  const symbols = useWatchlistStore(s => s.symbols)
  const priceHistory = useWatchlistStore(s => s.priceHistory)
  const [positions, setPositions] = useState(loadPositions)
  const [draft, setDraft] = useState({ symbol: '', qty: '', cost: '' })
  const [showAdd, setShowAdd] = useState(false)

  function addPosition() {
    if (!draft.symbol || !draft.qty || !draft.cost) return
    const sym = draft.symbol.toUpperCase()
    const updated = [...positions.filter(p => p.symbol !== sym), {
      symbol: sym,
      name: symbols.find(s => s.symbol === sym)?.name ?? sym,
      qty: parseFloat(draft.qty),
      cost: parseFloat(draft.cost),
    }]
    setPositions(updated)
    savePositions(updated)
    setDraft({ symbol: '', qty: '', cost: '' })
    setShowAdd(false)
  }

  function removePosition(sym) {
    const updated = positions.filter(p => p.symbol !== sym)
    setPositions(updated)
    savePositions(updated)
  }

  function exportCsv() {
    const header = ['代號', '名稱', '股數', '成本價', '現價', '市值', '損益', '損益%']
    const body = rows.map(r => [
      r.symbol, r.name, r.qty, r.cost.toFixed(2),
      r.price != null ? r.price.toFixed(2) : '',
      r.value != null ? r.value.toFixed(0) : '',
      r.pnl != null ? r.pnl.toFixed(0) : '',
      r.pnlPct != null ? r.pnlPct.toFixed(2) + '%' : '',
    ])
    const csv = [header, ...body].map(row => row.join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `portfolio-${new Date().toISOString().slice(0, 10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const rows = positions.map(p => {
    const q = quotes[p.symbol]
    const price = q?.price ?? null
    const value = price != null ? price * p.qty : null
    const costTotal = p.cost * p.qty
    const pnl = value != null ? value - costTotal : null
    const pnlPct = value != null ? ((pnl / costTotal) * 100) : null
    return { ...p, price, value, pnl, pnlPct }
  })

  const totalValue = rows.reduce((s, r) => s + (r.value ?? r.cost * r.qty), 0)
  const totalCost = rows.reduce((s, r) => s + r.cost * r.qty, 0)
  const totalPnl = totalValue - totalCost
  const totalPnlPct = totalCost ? (totalPnl / totalCost) * 100 : 0
  const isUp = totalPnl >= 0

  return (
    <div className="portfolio-panel">
      <div className="pf-header">
        <div className="pf-summary">
          <div className="pf-total">{totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          <div className={`pf-pnl ${isUp ? 'up' : 'dn'}`}>
            {isUp ? '+' : ''}{totalPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            <span className="pf-pnl-pct"> ({isUp ? '+' : ''}{totalPnlPct.toFixed(2)}%)</span>
          </div>
        </div>
        <div className="pf-header-btns">
          {rows.length > 0 && (
            <button className="ibtn-sm" onClick={exportCsv} title="匯出 CSV" style={{ fontSize: 11 }}>↓</button>
          )}
          <button className="ibtn-sm pf-add-btn" onClick={() => setShowAdd(v => !v)}>＋</button>
        </div>
      </div>

      {showAdd && (
        <div className="pf-add-form">
          <select
            value={draft.symbol}
            onChange={e => {
              const sym = e.target.value
              const price = quotes[sym]?.price
              setDraft(d => ({ ...d, symbol: sym, cost: price ? price.toFixed(2) : d.cost }))
            }}
          >
            <option value="">選擇標的…</option>
            {symbols.map(s => <option key={s.symbol} value={s.symbol}>{s.name} ({s.symbol})</option>)}
          </select>
          <div className="pf-add-row">
            <input type="number" placeholder="股數" value={draft.qty}
              onChange={e => setDraft(d => ({ ...d, qty: e.target.value }))} />
            <input type="number" placeholder="成本價" value={draft.cost}
              onChange={e => setDraft(d => ({ ...d, cost: e.target.value }))} />
          </div>
          <button className="pf-confirm-btn" onClick={addPosition}>加入持倉</button>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="pf-empty">尚無持倉<br /><span>點 ＋ 加入你的股票</span></div>
      ) : (
        <>
          <NavChart rows={rows} priceHistory={priceHistory} totalCost={totalCost} />
          <DonutChart rows={rows} />
          {rows.some(r => r.pnlPct != null) && (
            <PnlBarChart rows={rows} />
          )}
          <VaRPanel rows={rows} priceHistory={priceHistory} totalValue={totalValue} />
          <PositionSizer totalValue={totalValue} quotes={quotes} symbols={symbols} />
          {rows.length >= 2 && <RebalancePanel rows={rows} totalValue={totalValue} />}
          {rows.length >= 2 && (
            <CorrelationMatrix
              syms={rows.map(r => r.symbol)}
              priceHistory={priceHistory}
            />
          )}
          <div className="pf-list">
            {rows.map(r => (
              <div key={r.symbol} className="pf-row">
                <div className="pf-row-left">
                  <div className="pf-row-name">{r.name}</div>
                  <div className="pf-row-sym mono">{r.symbol}</div>
                  <div className="pf-row-meta">{r.qty} 股 × {r.cost.toFixed(2)}</div>
                </div>
                <div className="pf-row-right">
                  {r.price != null ? (
                    <>
                      <div className={`pf-row-value mono ${r.pnl >= 0 ? 'up' : 'dn'}`}>
                        {r.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                      <div className={`pf-row-pnl ${r.pnl >= 0 ? 'up' : 'dn'}`}>
                        {r.pnl >= 0 ? '+' : ''}{r.pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        <span className="pf-pnl-pct"> {r.pnl >= 0 ? '+' : ''}{r.pnlPct.toFixed(2)}%</span>
                      </div>
                    </>
                  ) : <div className="loading-dots"><span className="dot1"/><span className="dot2"/><span className="dot3"/></div>}
                </div>
                <button className="del-btn" onClick={() => removePosition(r.symbol)}>✕</button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
