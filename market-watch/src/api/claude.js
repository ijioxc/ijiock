const CLAUDE_SYSTEM = '你是一位專業的台灣股市與全球金融市場投資顧問，擅長技術分析。回覆使用繁體中文，語氣專業但親切，回答精簡有重點，善用條列式。投資有風險，建議加入風險提示。'

async function callClaude({ apiKey, system, messages, maxTokens = 800 }) {
  if (!apiKey) throw new Error('請先設定 Claude API Key')
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
      max_tokens: maxTokens,
      system: system ?? CLAUDE_SYSTEM,
      messages,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `API 錯誤 ${res.status}`)
  }
  const data = await res.json()
  return data.content?.[0]?.text ?? '無法取得建議'
}

export async function askAdvisorFree({ apiKey, messages, system }) {
  const apiMessages = messages.map(m => ({
    role: m.role === 'ai' ? 'assistant' : 'user',
    content: m.text,
  }))
  return callClaude({ apiKey, system, messages: apiMessages })
}

export async function askAdvisor({ apiKey, name, symbol, quote, techSignal, recentCandles }) {
  const candleText = recentCandles.slice(-5).map(c =>
    `日期: ${new Date(c.time * 1000).toLocaleDateString('zh-TW')} O:${c.open?.toFixed(2)} H:${c.high?.toFixed(2)} L:${c.low?.toFixed(2)} C:${c.close?.toFixed(2)}`
  ).join('\n')

  const userMessage = `
標的：${name}（${symbol}）
目前價格：${quote.price?.toFixed(2)} ${quote.currency ?? ''}
漲跌：${quote.change >= 0 ? '+' : ''}${quote.change?.toFixed(2)} (${quote.changePct?.toFixed(2)}%)
今日區間：${quote.low?.toFixed(2)} ~ ${quote.high?.toFixed(2)}

技術指標：
- 趨勢：${techSignal.trend}
- KD訊號：${techSignal.kdSignal}
- MACD訊號：${techSignal.macdSignal}
- 均線狀態：${techSignal.maStatus}

近5日K線：
${candleText}

請以台灣投資顧問角色，給出簡短分析（100字內）與操作建議（買進/持有/觀望/賣出），並說明理由。
`
  return callClaude({ apiKey, messages: [{ role: 'user', content: userMessage }], maxTokens: 512 })
}
