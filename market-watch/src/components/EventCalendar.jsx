import { useState } from 'react'

// Hardcoded upcoming macro events — simulated for demo
// In a real app this would come from an economic calendar API
const BASE_EVENTS = [
  { date: '2026-05-20', time: '08:30', name: 'CPI 年增率', region: 'US', impact: 'high', forecast: '2.4%', prev: '2.6%' },
  { date: '2026-05-21', time: '14:00', name: 'FOMC 議事紀錄', region: 'US', impact: 'high', forecast: null, prev: null },
  { date: '2026-05-22', time: '08:30', name: '初請失業金', region: 'US', impact: 'med', forecast: '228K', prev: '231K' },
  { date: '2026-05-23', time: '08:30', name: 'PCE 物價指數', region: 'US', impact: 'high', forecast: '2.2%', prev: '2.3%' },
  { date: '2026-05-27', time: '09:00', name: '台灣出口訂單', region: 'TW', impact: 'med', forecast: null, prev: '+5.2%' },
  { date: '2026-05-28', time: '20:00', name: '標普 500 財報季結束', region: 'US', impact: 'low', forecast: null, prev: null },
  { date: '2026-06-04', time: '14:30', name: '非農就業人數', region: 'US', impact: 'high', forecast: '185K', prev: '177K' },
  { date: '2026-06-11', time: '14:00', name: 'FOMC 利率決議', region: 'US', impact: 'high', forecast: '4.25%', prev: '4.50%' },
  { date: '2026-06-12', time: '08:30', name: 'CPI 核心年增率', region: 'US', impact: 'high', forecast: '2.8%', prev: '2.9%' },
  { date: '2026-06-18', time: '09:00', name: '台灣 GDP 初值', region: 'TW', impact: 'high', forecast: '+2.8%', prev: '+2.6%' },
]

const IMPACT_STYLES = {
  high: { bg: 'rgba(239,83,80,.15)', color: 'var(--dn)', label: '高' },
  med:  { bg: 'rgba(245,158,11,.12)', color: 'var(--warn)', label: '中' },
  low:  { bg: 'rgba(38,166,154,.1)',  color: 'var(--up)',   label: '低' },
}

const REGION_FLAGS = { US: '🇺🇸', TW: '🇹🇼', EU: '🇪🇺', JP: '🇯🇵', CN: '🇨🇳' }

export default function EventCalendar() {
  const [filter, setFilter] = useState('ALL')
  const [expanded, setExpanded] = useState(null)

  const today = new Date().toISOString().slice(0, 10)
  const filtered = BASE_EVENTS
    .filter(e => e.date >= today)
    .filter(e => filter === 'ALL' || e.region === filter || (filter === 'HIGH' && e.impact === 'high'))
    .slice(0, 20)

  function dayLabel(dateStr) {
    const d = new Date(dateStr + 'T00:00:00')
    const diff = Math.round((d - new Date(today + 'T00:00:00')) / 86400000)
    if (diff === 0) return '今天'
    if (diff === 1) return '明天'
    if (diff <= 7) return `${diff}天後`
    return d.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
  }

  let lastDate = null

  return (
    <div className="event-cal">
      <div className="ec-header">
        <div className="ec-title">經濟行事曆</div>
        <div className="ec-filters">
          {['ALL', 'HIGH', 'US', 'TW'].map(f => (
            <button
              key={f}
              className={`ec-filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >{f === 'HIGH' ? '⚡高影響' : f}</button>
          ))}
        </div>
      </div>

      <div className="ec-list">
        {filtered.length === 0 && (
          <div className="ec-empty">近期無符合事件</div>
        )}
        {filtered.map((ev, i) => {
          const imp = IMPACT_STYLES[ev.impact]
          const showDate = ev.date !== lastDate
          lastDate = ev.date
          const isToday = ev.date === today
          return (
            <div key={i}>
              {showDate && (
                <div className={`ec-date-header ${isToday ? 'today' : ''}`}>
                  <span>{isToday ? '📅 今天' : dayLabel(ev.date)}</span>
                  <span className="ec-date-str">{ev.date.slice(5)}</span>
                </div>
              )}
              <div
                className={`ec-item ${expanded === i ? 'expanded' : ''}`}
                onClick={() => setExpanded(v => v === i ? null : i)}
              >
                <div className="ec-item-left">
                  <span className="ec-flag">{REGION_FLAGS[ev.region] ?? ev.region}</span>
                  <div>
                    <div className="ec-name">{ev.name}</div>
                    <div className="ec-time">{ev.time} {ev.region === 'US' ? 'ET' : 'TST'}</div>
                  </div>
                </div>
                <div className="ec-item-right">
                  <span className="ec-impact-badge" style={{ background: imp.bg, color: imp.color }}>
                    {imp.label}
                  </span>
                  {ev.forecast && <span className="ec-forecast">預: {ev.forecast}</span>}
                </div>
              </div>
              {expanded === i && ev.prev && (
                <div className="ec-detail">
                  <span className="ec-detail-k">前值</span>
                  <span className="ec-detail-v">{ev.prev}</span>
                  {ev.forecast && <>
                    <span className="ec-detail-k">預測</span>
                    <span className="ec-detail-v">{ev.forecast}</span>
                  </>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
