import { useState, useEffect, lazy, Suspense } from 'react'
import NavBar from './components/NavBar'
import WatchList from './components/WatchList'
const ChartPanel = lazy(() => import('./components/ChartPanel'))
import AdvisorChat from './components/AdvisorChat'
import AlertPanel from './components/AlertPanel'
import PortfolioPanel from './components/PortfolioPanel'
import NewsPanel from './components/NewsPanel'
import MarketTicker from './components/MarketTicker'
import KeyboardHelp from './components/KeyboardHelp'
import SectorPanel from './components/SectorPanel'
import ToastSystem from './components/ToastSystem'
import CommandPalette from './components/CommandPalette'
import EventCalendar from './components/EventCalendar'
import ScreenerPanel from './components/ScreenerPanel'
import { useQuotes } from './hooks/useQuotes'
import { useWatchlistStore } from './store/watchlistStore'
import './App.css'

const TABS = ['advisor', 'portfolio', 'alert', 'news', 'sector', 'calendar', 'screener']

function QuotesRunner() {
  useQuotes()
  return null
}

export default function App() {
  const savedDark = typeof localStorage !== 'undefined' ? localStorage.getItem('mw-dark') === '1' : false
  const [darkMode, setDarkMode] = useState(savedDark)
  const [rightTab, setRightTab] = useState('advisor')
  const triggeredAlerts = useWatchlistStore(s => s.triggeredAlerts)
  const forceRefresh = useWatchlistStore(s => s.forceRefresh)

  // Sync dark mode — set both class and data-appearance attr
  useEffect(() => {
    document.documentElement.setAttribute('data-appearance', darkMode ? 'dark' : 'light')
    localStorage.setItem('mw-dark', darkMode ? '1' : '0')
  }, [darkMode])

  // Number keys 1-4 switch right tabs
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      const n = parseInt(e.key)
      if (n >= 1 && n <= 7) setRightTab(TABS[n - 1])
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className={`app ${darkMode ? 'dark' : ''}`}>
      <QuotesRunner />
      <KeyboardHelp onToggleDark={() => setDarkMode(v => !v)} />
      <ToastSystem />
      <CommandPalette />
      {triggeredAlerts.length > 0 && (
        <div className="alert-banner">
          {triggeredAlerts[0].type === 'target' ? '📈' : '📉'}&nbsp;
          {triggeredAlerts[0].symbol}&nbsp;
          {triggeredAlerts[0].type === 'target' ? '突破目標價' : '跌破停損價'}&nbsp;
          {triggeredAlerts[0].price?.toFixed(2)}
        </div>
      )}
      <NavBar darkMode={darkMode} onToggleDark={() => setDarkMode(v => !v)} />
      <MarketTicker />
      <div className="main-layout">
        <WatchList />
        <div className="center-col">
          <Suspense fallback={<div className="chart-overlay">載入圖表中…</div>}>
            <ChartPanel darkMode={darkMode} />
          </Suspense>
        </div>
        <div className="right-col">
          <div className="right-tabs">
            <button className={`r-tab ${rightTab === 'advisor' ? 'active' : ''}`} onClick={() => setRightTab('advisor')}>AI</button>
            <button className={`r-tab ${rightTab === 'portfolio' ? 'active' : ''}`} onClick={() => setRightTab('portfolio')}>持倉</button>
            <button className={`r-tab ${rightTab === 'alert' ? 'active' : ''}`} onClick={() => setRightTab('alert')}>警示</button>
            <button className={`r-tab ${rightTab === 'news' ? 'active' : ''}`} onClick={() => setRightTab('news')}>新聞</button>
            <button className={`r-tab ${rightTab === 'sector' ? 'active' : ''}`} onClick={() => setRightTab('sector')}>板塊</button>
            <button className={`r-tab ${rightTab === 'calendar' ? 'active' : ''}`} onClick={() => setRightTab('calendar')}>日曆</button>
            <button className={`r-tab ${rightTab === 'screener' ? 'active' : ''}`} onClick={() => setRightTab('screener')}>選股</button>
          </div>
          {rightTab === 'advisor' && <AdvisorChat />}
          {rightTab === 'portfolio' && <PortfolioPanel />}
          {rightTab === 'alert' && <AlertPanel />}
          {rightTab === 'news' && <NewsPanel />}
          {rightTab === 'sector' && <SectorPanel />}
          {rightTab === 'calendar' && <EventCalendar />}
          {rightTab === 'screener' && <ScreenerPanel />}
        </div>
      </div>
    </div>
  )
}
