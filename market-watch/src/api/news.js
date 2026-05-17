export async function fetchNews(symbol = '', name = '') {
  const p = new URLSearchParams()
  if (symbol) p.set('s', symbol)
  if (name && name !== symbol) p.set('n', name)
  const url = `/api/news?${p.toString()}`
  const r = await fetch(url)
  if (!r.ok) throw new Error(`新聞載入失敗 (${r.status})`)
  const data = await r.json()
  if (data.error) throw new Error(data.error)
  return data
}
