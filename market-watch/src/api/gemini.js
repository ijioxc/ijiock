const SYSTEM = '你是一位專業的台灣股市與全球金融市場投資顧問，擅長技術分析（均線、KD、MACD、RSI、布林通道等）與基本面分析。回覆使用繁體中文，語氣專業但親切，回答精簡有重點，善用條列式表達。重要：投資有風險，建議加入風險提示。'

export async function askGemini({ apiKey, messages, system = SYSTEM }) {
  if (!apiKey) throw new Error('請先設定 Gemini API Key')

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`

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
    const raw = err?.error?.message ?? `API 錯誤 ${res.status}`
    let msg = raw
    if (raw.includes('spending cap') || raw.includes('spend')) {
      msg = `❌ 此 Key 屬於付費專案且已超出月費上限。\n\n請建立免費層 Key：\n1. 開啟 aistudio.google.com/apikey\n2. 點「建立 API 金鑰」→「在新專案中建立」\n3. ⚠️ 建立後確認專案顯示「免費層級」，不要選現有專案\n4. 複製新 Key 並在設定中替換`
    } else if (raw.includes('free_tier') && raw.includes('limit: 0')) {
      msg = `❌ 此專案未啟用免費配額。\n\n請建立免費層 Key：\n1. 開啟 aistudio.google.com/apikey\n2. 點「建立 API 金鑰」→「在新專案中建立」\n3. ⚠️ 確認顯示「免費層級」後再複製使用`
    } else if (raw.includes('RESOURCE_EXHAUSTED') || (raw.includes('quota') && res.status === 429)) {
      msg = `❌ 配額不足（429）。若剛建立 key 請等 1 分鐘再試；或已達每分鐘上限（15 RPM），請稍後重試。`
    }
    throw new Error(msg)
  }
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '無法取得建議'
}
