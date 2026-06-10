import { useState } from 'react'

// ⚠️ 示意資料，非即時經濟日曆
const BASE_EVENTS = [
  { date: '2026-06-11', time: '14:00', name: 'FOMC 利率決議', region: 'US', impact: 'high' },
  { date: '2026-06-12', time: '08:30', name: 'CPI 核心年增率', region: 'US', impact: 'high' },
  { date: '2026-06-18', time: '09:00', name: '台灣 GDP 初值', region: 'TW', impact: 'high' },
  { date: '2026-06-25', time: '08:30', name: '初請失業金', region: 'US', impact: 'med' },
  { date: '2026-07-02', time: '14:30', name: '非農就業人數', region: 'US', impact: 'high' },
  { date: '2026-07-09', time: '14:00', name: 'FOMC 議事紀錄', region: 'US', impact: 'high' },
  { date: '2026-07-15', time: '08:30', name: 'CPI 年增率', region: 'US', impact: 'high' },
  { date: '2026-07-22', time: '09:00', name: '台灣出口訂單', region: 'TW', impact: 'med' },
]

const IMPACT_STYLES = {
  high: { bg: 'rgba(239,83,80,.15)', color: 'var(--dn)', label: '高' },
  med:  { bg: 'rgba(245,158,11,.12)', color: 'var(--warn)', label: '中' },
  low:  { bg: 'rgba(38,166,154,.1)',  color: 'var(--up)',   label: '低' },
}

const REGION_FLAGS = { US: '🇺🇸', TW: '🇹🇼', EU: '🇪🇺', JP: '🇯🇵', CN: '🇨🇳' }

export default function EventCalendar() {
  const [filter, setFilter] = useState('ALL')

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = BASE_EVENTS.filter(e => e.date >= today)
  const filtered = upcoming
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

      <div className="ec-notice">⚠ 示意資料，非即時經濟日曆</div>

      <div className="ec-list">
        {filtered.length === 0 && (
          <div className="ec-empty">
            {upcoming.length === 0 ? '示意事件已全部過期，請更新資料' : '近期無符合事件'}
          </div>
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
              <div className="ec-item">
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
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
