import { useState, useRef, useEffect } from 'react'
import { askAdvisor } from '../api/claude'
import { askGemini } from '../api/gemini'
import { useWatchlistStore } from '../store/watchlistStore'
import { fetchOHLC } from '../api/market'
import { useTechIndicators } from '../hooks/useTechIndicators'

const QUICK_PROMPTS = [
  { label: '📈 進場時機', text: '分析目前最佳進場時機與需等待的技術訊號。' },
  { label: '🛡 支撐壓力', text: '分析目前重要支撐位與壓力位的具體價格。' },
  { label: '⚖️ 風險評估', text: '評估目前持有此標的的主要下行風險因素。' },
  { label: '🎯 目標價位', text: '根據技術分析給出短中期合理目標價位。' },
  { label: '🔄 多空分歧', text: '列出目前看多和看空的指標各有哪些，勝率如何？' },
  { label: '📉 回測策略', text: '若在均線金叉時買入、死叉時賣出，歷史勝率如何？' },
]

export default function AdvisorChat() {
  const selected = useWatchlistStore(s => s.selected)
  const symbols = useWatchlistStore(s => s.symbols)
  const quotes = useWatchlistStore(s => s.quotes)
  const apiKey = useWatchlistStore(s => s.apiKey)
  const geminiKey = useWatchlistStore(s => s.geminiKey)
  const aiProvider = useWatchlistStore(s => s.aiProvider)
  const activeKey = aiProvider === 'gemini' ? geminiKey : apiKey
  const info = symbols.find(s => s.symbol === selected)
  const msgsEndRef = useRef(null)

  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [input, setInput] = useState('')
  const [candles, setCandles] = useState([])
  const tech = useTechIndicators(candles)

  useEffect(() => {
    if (!selected) return
    fetchOHLC(selected, '3mo').then(data => setCandles(data.sort((a, b) => a.time - b.time))).catch(() => {})
  }, [selected])

  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function buildContext() {
    const freshCandles = await fetchOHLC(selected, '3mo')
    const sorted = freshCandles.sort((a, b) => a.time - b.time)
    setCandles(sorted)
    return { candles: sorted, tech }
  }

  async function ask() {
    if (!selected) return
    setLoading(true)
    setError('')
    try {
      const { candles: freshCandles, tech: freshTech } = await buildContext()
      const quote = quotes[selected] ?? {}
      const useTech = freshTech ?? tech ?? { trend: '-', kdSignal: '-', macdSignal: '-', maStatus: '-' }
      let reply
      if (aiProvider === 'gemini') {
        const candleText = freshCandles.slice(-5).map(c =>
          `日期:${new Date(c.time * 1000).toLocaleDateString('zh-TW')} O:${c.open?.toFixed(2)} H:${c.high?.toFixed(2)} L:${c.low?.toFixed(2)} C:${c.close?.toFixed(2)}`
        ).join('\n')
        const prompt = `標的：${info?.name ?? selected}（${selected}）\n現價 ${quote.price?.toFixed(2) ?? '-'}，今日 ${quote.changePct >= 0 ? '+' : ''}${quote.changePct?.toFixed(2) ?? '-'}%\n趨勢：${useTech.trend}，KD：${useTech.kdSignal}，MACD：${useTech.macdSignal}\n近5日K線：\n${candleText}\n\n請給出簡短分析（100字內）與操作建議（買進/持有/觀望/賣出）。`
        reply = await askGemini({ apiKey: geminiKey, messages: [{ role: 'user', text: prompt }] })
      } else {
        reply = await askAdvisor({ apiKey, name: info?.name ?? selected, symbol: selected, quote, techSignal: useTech, recentCandles: freshCandles })
      }
      setMessages(m => [...m, { role: 'user', text: `全面分析 ${info?.name ?? selected}` }, { role: 'ai', text: reply }])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function sendCustom(customText) {
    const userMsg = (customText ?? input).trim()
    if (!userMsg || !activeKey) return
    setLoading(true)
    setError('')
    setMessages(m => [...m, { role: 'user', text: userMsg }])
    if (!customText) setInput('')
    try {
      const { tech: freshTech } = await buildContext().catch(() => ({ candles: [], tech: null }))
      const quote = quotes[selected] ?? {}
      const t = freshTech ?? tech
      const technicalContext = t ? `技術指標摘要：趨勢:${t.trend}，KD:${t.kdSignal}(K=${t.lastK},D=${t.lastD})，MACD:${t.macdSignal}，RSI:${t.lastRsi ?? '-'}(${t.rsiSignal})，均線:${t.maStatus}(MA5=${t.ma5},MA20=${t.ma20})` : ''
      const contextLine = selected
        ? `【${info?.name ?? selected}(${selected}) 現價${quote.price?.toFixed(2) ?? '-'} 今日${quote.changePct >= 0 ? '+' : ''}${quote.changePct?.toFixed(2) ?? '-'}% ${technicalContext}】\n\n`
        : ''
      const fullMsg = contextLine + userMsg

      let reply
      if (aiProvider === 'gemini') {
        const history = messages.map(m => ({ role: m.role, text: m.text }))
        reply = await askGemini({ apiKey: geminiKey, messages: [...history, { role: 'user', text: fullMsg }] })
      } else {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 800,
            system: '你是一位專業的台灣股市與全球金融市場投資顧問，擅長技術分析。回覆使用繁體中文，語氣專業但親切，回答精簡有重點，善用條列式。投資有風險，建議加入風險提示。',
            messages: [{ role: 'user', content: fullMsg }],
          }),
        })
        if (!res.ok) throw new Error(`API 錯誤 ${res.status}`)
        const data = await res.json()
        reply = data.content?.[0]?.text ?? '無回應'
      }
      setMessages(m => [...m, { role: 'ai', text: reply }])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="advisor-panel">
      <div className="adv-header">
        <span className="adv-title">AI 投資顧問</span>
        <span className="adv-model mono">{aiProvider === 'gemini' ? 'gemini-2.0-flash 🆓' : 'claude-sonnet-4-6'}</span>
      </div>

      {!activeKey && (
        <div className="adv-notice">
          請點右上角設定 AI API Key（建議使用免費的 Gemini）
        </div>
      )}

      <div className="adv-messages">
        {messages.length === 0 && (
          <div className="adv-empty">
            點擊下方快速提問，或輸入自訂問題
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`adv-msg ${m.role}`}>
            <div className="msg-role">{m.role === 'user' ? '你' : '顧問'}</div>
            <div className="msg-text">{m.text}</div>
          </div>
        ))}
        {loading && (
          <div className="adv-msg ai">
            <div className="msg-role">顧問</div>
            <div className="msg-text typing">分析中<span className="dot1">.</span><span className="dot2">.</span><span className="dot3">.</span></div>
          </div>
        )}
        <div ref={msgsEndRef} />
      </div>

      {error && <div className="adv-error">{error}</div>}

      <div className="adv-quick-prompts">
        {QUICK_PROMPTS.map(p => (
          <button
            key={p.label}
            className="quick-chip"
            onClick={() => sendCustom(p.text)}
            disabled={loading || !activeKey}
          >{p.label}</button>
        ))}
      </div>

      <div className="adv-actions">
        <button className="analyze-btn" onClick={ask} disabled={loading || !activeKey}>
          📊 全面分析當前標的
        </button>
      </div>

      <div className="adv-input-row">
        <input
          placeholder="自訂問題…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendCustom()}
          disabled={loading || !activeKey}
        />
        <button onClick={() => sendCustom()} disabled={loading || !activeKey || !input.trim()}>送出</button>
      </div>
    </div>
  )
}

function computeTech(candles) {
  if (!candles || candles.length < 26) return null
  const closes = candles.map(c => c.close)
  const k = 2 / (26 + 1)
  let e = closes[0]
  const ema26 = closes.map(v => { e = v * k + e * (1 - k); return e })
  const k2 = 2 / (12 + 1)
  let e2 = closes[0]
  const ema12 = closes.map(v => { e2 = v * k2 + e2 * (1 - k2); return e2 })
  const macd = ema12.map((v, i) => v - ema26[i])
  const k3 = 2 / 10
  let sig = macd[0]
  const signal = macd.map(v => { sig = v * k3 + sig * (1 - k3); return sig })
  const lastMacd = macd[macd.length - 1]
  const lastSig = signal[signal.length - 1]
  const macdSignal = lastMacd > lastSig ? '金叉（看多）' : '死叉（看空）'
  const last = closes[closes.length - 1]
  const ma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20
  const trend = last > ma20 ? '中期上升趨勢' : '中期下降趨勢'
  return { trend, kdSignal: '-', macdSignal, maStatus: '-' }
}
