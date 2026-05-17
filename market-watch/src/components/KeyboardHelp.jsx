import { useState, useEffect } from 'react'
import { useWatchlistStore } from '../store/watchlistStore'

const SHORTCUTS = [
  { keys: ['j', 'k'], desc: '↓↑ 切換自選標的', group: '導覽' },
  { keys: ['/'], desc: '聚焦搜尋欄', group: '導覽' },
  { keys: ['⌘', 'K'], desc: '快速切換標的（命令列）', group: '導覽' },
  { keys: ['1'], desc: 'AI 顧問面板', group: '面板' },
  { keys: ['2'], desc: '持倉面板', group: '面板' },
  { keys: ['3'], desc: '警示面板', group: '面板' },
  { keys: ['4'], desc: '新聞面板', group: '面板' },
  { keys: ['5'], desc: '板塊熱力圖', group: '面板' },
  { keys: ['6'], desc: '總經日曆', group: '面板' },
  { keys: ['7'], desc: '選股篩選器', group: '面板' },
  { keys: ['d'], desc: '切換深色 / 淺色主題', group: '操作' },
  { keys: ['r'], desc: '手動重新整理行情', group: '操作' },
  { keys: ['?'], desc: '顯示此快捷鍵面板', group: '操作' },
  { keys: ['Esc'], desc: '關閉彈窗 / 退出全螢幕', group: '操作' },
  { keys: ['LR'], desc: '圖表：線性迴歸 + 預測延伸', group: '圖表' },
  { keys: ['ICH'], desc: '圖表：一目均衡表 Ichimoku', group: '圖表' },
  { keys: ['VWAP'], desc: '圖表：成交量加權均價', group: '圖表' },
  { keys: ['PP'], desc: '圖表：樞紐點 Pivot Points', group: '圖表' },
  { keys: ['Fib'], desc: '圖表：費波那契回調', group: '圖表' },
  { keys: ['VP'], desc: '圖表：Volume Profile 分布', group: '圖表' },
  { keys: ['RSI'], desc: '圖表：RSI 子圖', group: '圖表' },
  { keys: ['MCD'], desc: '圖表：MACD 子圖', group: '圖表' },
  { keys: ['OBV'], desc: '圖表：OBV 量能子圖', group: '圖表' },
  { keys: ['RD'], desc: '圖表：報酬分布直方圖', group: '圖表' },
  { keys: ['✏'], desc: '圖表：畫水平線模式', group: '圖表' },
]

export default function KeyboardHelp({ onToggleDark }) {
  const [open, setOpen] = useState(false)
  const doRefresh = useWatchlistStore(s => s.doRefresh)

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === '?') setOpen(v => !v)
      if (e.key === 'Escape') setOpen(false)
      if (e.key === 'd' && onToggleDark) onToggleDark()
      if (e.key === 'r') doRefresh()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onToggleDark, doRefresh])

  if (!open) return null

  return (
    <div className="kb-overlay" onClick={() => setOpen(false)}>
      <div className="kb-modal" onClick={e => e.stopPropagation()}>
        <div className="kb-header">
          <span className="kb-title">鍵盤快捷鍵</span>
          <button className="kb-close" onClick={() => setOpen(false)}>✕</button>
        </div>
        <div className="kb-list">
          {SHORTCUTS.map((s, i) => (
            <div key={i} className="kb-row">
              <div className="kb-keys">
                {s.keys.map(k => <kbd key={k} className="kb-key">{k}</kbd>)}
              </div>
              <span className="kb-desc">{s.desc}</span>
            </div>
          ))}
        </div>
        <div className="kb-hint">按 <kbd className="kb-key">?</kbd> 或 <kbd className="kb-key">Esc</kbd> 關閉</div>
      </div>
    </div>
  )
}
