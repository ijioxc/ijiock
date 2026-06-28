import { useEffect } from 'react'
import MainWorkspace from './components/MainWorkspace'
import ToastSystem from './components/ToastSystem'
import CommandPalette from './components/CommandPalette'
import SettingsModal from './components/SettingsModal'
import { useQuotes } from './hooks/useQuotes'
import { useWatchlistStore, DEFAULT_SYMBOLS, classifySymbol } from './store/watchlistStore'
import './App.css'

function QuotesRunner() {
  useQuotes()
  return null
}

export default function App() {
  const triggeredAlerts = useWatchlistStore(s => s.triggeredAlerts)

  // Migration:
  // 1) 若清單過短，補齊預設標的
  // 2) 重新分類所有現有符號（移除舊版寫死的 MOAT / CASHFLOW / INSIDER 等 hard-coded 分類）
  useEffect(() => {
    const store = useWatchlistStore.getState()
    const twSymbols = store.symbols.filter(s => s.category === 'TW' || s.category === 'ETF')
    if (twSymbols.length <= 3) {
      DEFAULT_SYMBOLS.forEach(def => store.addSymbol(def.symbol, def.name, def.category))
    }
    // 動態重分類
    const reclassified = store.symbols.map(s => ({ ...s, category: classifySymbol(s.symbol) }))
    useWatchlistStore.setState({ symbols: reclassified })
    // 立即抓一次行情，讓名稱由 backend 填入
    store.doRefresh?.()
  }, [])

  return (
    <>
      <QuotesRunner />
      <ToastSystem />
      <CommandPalette />
      
      {triggeredAlerts.length > 0 && (
        <div className="alert-banner" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, background: 'var(--color-up)', color: 'white', padding: '8px', textAlign: 'center' }}>
          {triggeredAlerts[0].type === 'target' ? '📈' : '📉'}&nbsp;
          {triggeredAlerts[0].symbol}&nbsp;
          {triggeredAlerts[0].type === 'target' ? '突破目標價' : '跌破停損價'}&nbsp;
          {triggeredAlerts[0].price?.toFixed(2)}
        </div>
      )}

      <MainWorkspace />
      <SettingsModal />
    </>
  )
}
