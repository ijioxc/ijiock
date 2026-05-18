const SYSTEM = '你是一位專業的台灣股市與全球金融市場投資顧問，擅長技術分析（均線、KD、MACD、RSI、布林通道等）與基本面分析。回覆使用繁體中文，語氣專業但親切，回答精簡有重點，善用條列式表達。重要：投資有風險，建議加入風險提示。'

export async function askGemini({ apiKey, messages, system = SYSTEM }) {
  if (!apiKey) throw new Error('請先設定 Gemini API Key')

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`

  const contents = messages.map(m => ({
    role: m.role === 'ai' ? 'model' : 'user',
    parts: [{ text: m.text }],
  }))

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { maxOutputTokens: 800, temperature: 0.7 },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.error?.message ?? `API 錯誤 ${res.status}`
    throw new Error(msg)
  }
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '無法取得建議'
}
