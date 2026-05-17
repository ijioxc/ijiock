import { useState, useEffect, useCallback, useRef } from 'react'
import { useWatchlistStore } from '../store/watchlistStore'

let externalAddToast = null

export function toast(msg, type = 'info', duration = 4000) {
  externalAddToast?.({ msg, type, duration, id: Date.now() + Math.random() })
}

export default function ToastSystem() {
  const [toasts, setToasts] = useState([])
  const triggeredAlerts = useWatchlistStore(s => s.triggeredAlerts)
  const prevLen = useRef(0)

  const addToast = useCallback((t) => {
    setToasts(prev => [...prev, t])
    setTimeout(() => {
      setToasts(prev => prev.filter(x => x.id !== t.id))
    }, t.duration ?? 4000)
  }, [])

  useEffect(() => {
    externalAddToast = addToast
    return () => { externalAddToast = null }
  }, [addToast])

  useEffect(() => {
    if (triggeredAlerts.length > prevLen.current) {
      const a = triggeredAlerts[0]
      const isUp = a.type === 'target'
      addToast({
        id: `alert-${a.ts}`,
        msg: `${isUp ? '📈' : '📉'} ${a.symbol} ${isUp ? '突破目標價' : '跌破停損價'} ${a.price?.toFixed(2)}`,
        type: isUp ? 'up' : 'dn',
        duration: 6000,
      })
    }
    prevLen.current = triggeredAlerts.length
  }, [triggeredAlerts, addToast])

  if (toasts.length === 0) return null

  return (
    <div className="toast-stack">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`toast-item toast-${t.type}`}
          onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
        >
          <span className="toast-msg">{t.msg}</span>
          <button className="toast-close">✕</button>
        </div>
      ))}
    </div>
  )
}
