import { useState, useEffect, useCallback } from 'react'
import { useWatchlistStore } from '../store/watchlistStore'
import { fetchNews } from '../api/news'

const BULL_WORDS = ['漲', '突破', '創高', '上升', '增長', '盈利', '看多', 'surge', 'rise', 'beat', 'strong', 'growth', 'buy', 'bullish', 'record', 'gain', 'rally', 'soar', 'profit', 'up', 'outperform']
const BEAR_WORDS = ['跌', '崩', '虧損', '下降', '拋售', '看空', '暴跌', 'fall', 'drop', 'crash', 'weak', 'loss', 'sell', 'bearish', 'decline', 'miss', 'cut', 'warn', 'risk', 'concern', 'fail', 'down']

function scoreSentiment(title = '') {
  const t = title.toLowerCase()
  const bull = BULL_WORDS.filter(w => t.includes(w)).length
  const bear = BEAR_WORDS.filter(w => t.includes(w)).length
  if (bull > bear) return 'bull'
  if (bear > bull) return 'bear'
  return 'neutral'
}

function timeAgo(pubDate) {
  if (!pubDate) return ''
  const diff = Date.now() - new Date(pubDate).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '剛剛'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export default function NewsPanel() {
  const selected = useWatchlistStore(s => s.selected)
  const symbols = useWatchlistStore(s => s.symbols)
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback((sym, symName) => {
    setLoading(true)
    setError(null)
    fetchNews(sym, symName)
      .then(d => { setNews(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  const sym = symbols.find(s => s.symbol === selected)
  const name = sym?.name ?? selected ?? '市場'

  useEffect(() => {
    if (selected) load(selected, name)
  }, [selected, load, name])

  return (
    <div className="news-panel">
      <div className="news-header">
        <div className="news-title">{name} 新聞</div>
        <button
          className="ibtn-sm news-refresh"
          onClick={() => selected && load(selected, name)}
          title="重新載入"
        >↻</button>
      </div>

      {loading && (
        <div className="news-loading">
          <div className="loading-dots">
            <span className="dot1" /><span className="dot2" /><span className="dot3" />
          </div>
          <span className="news-loading-txt">載入新聞中…</span>
        </div>
      )}

      {!loading && error && (
        <div className="news-error">
          <span className="news-error-icon">⚠</span>
          {error}
        </div>
      )}

      {!loading && !error && news.length === 0 && (
        <div className="news-empty">
          <div className="news-empty-icon">📰</div>
          <div>目前無相關新聞</div>
          <div className="news-empty-sub">點 ↻ 重新整理</div>
        </div>
      )}

      {!loading && news.length > 0 && (
        <ul className="news-list scroll-soft">
          {news.map((item, i) => {
            const sentiment = scoreSentiment(item.title)
            return (
              <li key={i} className={`news-item news-${sentiment}`}>
                <div className="news-headline-wrap">
                  <span className={`news-sentiment-dot ${sentiment}`} title={sentiment === 'bull' ? '偏正面' : sentiment === 'bear' ? '偏負面' : '中性'} />
                  {item.link ? (
                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="news-headline">
                      {item.title}
                    </a>
                  ) : (
                    <div className="news-headline no-link">{item.title}</div>
                  )}
                </div>
                <div className="news-meta">
                  {item.source && <span className="news-source">{item.source}</span>}
                  <span className={`news-senti-badge ${sentiment}`}>
                    {sentiment === 'bull' ? '▲ 偏多' : sentiment === 'bear' ? '▼ 偏空' : '─ 中性'}
                  </span>
                  {item.pubDate && <span className="news-time">{timeAgo(item.pubDate)}</span>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
