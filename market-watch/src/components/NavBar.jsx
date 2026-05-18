import { useState, useEffect } from 'react'
import { useWatchlistStore } from '../store/watchlistStore'

function SessionClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // Determine US market session (Eastern Time = UTC-4 in EDT, UTC-5 in EST)
  // Using UTC offset: EDT (Mar–Nov) UTC-4, EST (Nov–Mar) UTC-5
  const utcH = now.getUTCHours()
  const utcM = now.getUTCMinutes()
  const utcDay = now.getUTCDay() // 0=Sun, 6=Sat
  const month = now.getUTCMonth() + 1 // 1-12
  const isDST = month >= 3 && month <= 11 // approx EDT
  const offsetH = isDST ? 4 : 5 // hours behind UTC
  const etH = (utcH - offsetH + 24) % 24
  const etMin = utcM
  const etTotal = etH * 60 + etMin

  const isWeekend = utcDay === 0 || utcDay === 6
  let session, sessionColor
  if (isWeekend) {
    session = '休市'
    sessionColor = 'var(--text-3)'
  } else if (etTotal >= 240 && etTotal < 570) {
    session = '盤前'  // 4:00-9:30 ET
    sessionColor = 'var(--warn)'
  } else if (etTotal >= 570 && etTotal < 960) {
    session = '正盤'  // 9:30-16:00 ET
    sessionColor = 'var(--up)'
  } else if (etTotal >= 960 && etTotal < 1200) {
    session = '盤後'  // 16:00-20:00 ET
    sessionColor = '#06b6d4'
  } else {
    session = '閉市'
    sessionColor = 'var(--text-3)'
  }

  // TW market: 9:00-13:30 TST = 01:00-05:30 UTC
  const twTotal = (utcH * 60 + utcM + 480) % (24 * 60) // UTC+8
  const isTwOpen = !isWeekend && twTotal >= 540 && twTotal < 810

  const etTimeStr = `${String(etH).padStart(2, '0')}:${String(etMin).padStart(2, '0')} ET`

  return (
    <div className="session-clock">
      <div className="session-item">
        <span className="session-dot" style={{ background: sessionColor }} />
        <span className="session-label">US</span>
        <span className="session-status" style={{ color: sessionColor }}>{session}</span>
      </div>
      <div className="session-divider" />
      <div className="session-item">
        <span className="session-dot" style={{ background: isTwOpen ? 'var(--up)' : 'var(--text-3)' }} />
        <span className="session-label">TW</span>
        <span className="session-status" style={{ color: isTwOpen ? 'var(--up)' : 'var(--text-3)' }}>
          {isTwOpen ? '正盤' : '閉市'}
        </span>
      </div>
      <div className="session-divider" />
      <span className="session-time mono">{etTimeStr}</span>
    </div>
  )
}

export default function NavBar({ darkMode, onToggleDark }) {
  const apiKey = useWatchlistStore(s => s.apiKey)
  const setApiKey = useWatchlistStore(s => s.setApiKey)
  const geminiKey = useWatchlistStore(s => s.geminiKey)
  const setGeminiKey = useWatchlistStore(s => s.setGeminiKey)
  const aiProvider = useWatchlistStore(s => s.aiProvider)
  const setAiProvider = useWatchlistStore(s => s.setAiProvider)
  const [showKey, setShowKey] = useState(false)
  const [draftClaude, setDraftClaude] = useState(apiKey)
  const [draftGemini, setDraftGemini] = useState(geminiKey)
  const [tab, setTab] = useState(aiProvider)
  const triggeredAlerts = useWatchlistStore(s => s.triggeredAlerts)
  const clearTriggered = useWatchlistStore(s => s.clearTriggered)

  return (
    <nav className="navbar">
      <div className="logo">
        <div className="logo-mark">
          <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
        </div>
        <div>
          <div className="logo-txt">MarketWatch</div>
          <div className="logo-sub">自動盯盤 · 投資顧問</div>
        </div>
      </div>

      <div className="live-badge">
        <span className="live-dot" />
        LIVE
      </div>
      <SessionClock />

      {triggeredAlerts.length > 0 && (
        <button className="alert-badge" onClick={clearTriggered} title="點擊清除">
          ⚠ {triggeredAlerts.length} 個警示
        </button>
      )}

      <div className="nav-right">
        <button
          className="ibtn cmd-trigger"
          title="快速切換標的 (⌘K / Ctrl+K)"
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>
        <button className="ibtn" onClick={() => setShowKey(v => !v)} title="設定 API Key">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
        <button className="ibtn" onClick={onToggleDark} title={darkMode ? '切換亮色 (d)' : '切換暗色 (d)'}>
          {darkMode ? '☀' : '🌙'}
        </button>
        <button
          className="ibtn"
          title="快捷鍵說明 (?)"
          style={{ fontSize: 13, fontWeight: 800 }}
          onMouseDown={e => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' })) }}
        >?</button>
      </div>

      {showKey && (
        <div className="key-modal" onClick={() => setShowKey(false)}>
          <div className="key-panel" onClick={e => e.stopPropagation()}>
            <h3>AI 投資顧問設定</h3>
            <p className="key-hint">Key 僅存於本機 localStorage，不會上傳</p>

            <div className="key-provider-tabs">
              <button
                className={`key-tab ${tab === 'gemini' ? 'active' : ''}`}
                onClick={() => setTab('gemini')}
              >🆓 Gemini（免費）</button>
              <button
                className={`key-tab ${tab === 'claude' ? 'active' : ''}`}
                onClick={() => setTab('claude')}
              >Claude</button>
            </div>

            {tab === 'gemini' ? (
              <>
                <p className="key-hint" style={{ color: 'var(--dn)', fontWeight: 700 }}>
                  Gemini 2.0 Flash 免費，每天 1500 次請求
                </p>
                <p className="key-hint">
                  至 <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>aistudio.google.com/apikey</a> 取得免費 API Key
                </p>
                <input
                  type="password"
                  placeholder="AIza..."
                  value={draftGemini}
                  onChange={e => setDraftGemini(e.target.value)}
                />
              </>
            ) : (
              <>
                <p className="key-hint">
                  至 <a href="https://console.anthropic.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>console.anthropic.com</a> 取得 API Key
                </p>
                <input
                  type="password"
                  placeholder="sk-ant-..."
                  value={draftClaude}
                  onChange={e => setDraftClaude(e.target.value)}
                />
              </>
            )}

            <div className="key-actions">
              <button onClick={() => {
                if (tab === 'gemini') setGeminiKey(draftGemini)
                else setApiKey(draftClaude)
                setAiProvider(tab)
                setShowKey(false)
              }}>儲存並使用</button>
              <button className="ghost" onClick={() => setShowKey(false)}>取消</button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
