import { WORKER_URL } from './config'

const IS_PROD = import.meta.env.PROD

export async function fetchNews(symbol = '', name = '') {
  if (!IS_PROD) {
    const p = new URLSearchParams()
    if (symbol) p.set('s', symbol)
    if (name && name !== symbol) p.set('n', name)
    const r = await fetch(`/api/news?${p.toString()}`)
    if (!r.ok) throw new Error(`新聞載入失敗 (${r.status})`)
    const data = await r.json()
    if (data.error) throw new Error(data.error)
    return data
  }

  // Production: fetch RSS via CF Worker, parse with DOMParser
  const p = new URLSearchParams()
  if (symbol) p.set('s', symbol)
  if (name && name !== symbol) p.set('n', name)
  const r = await fetch(`${WORKER_URL}/news?${p.toString()}`)
  if (!r.ok) throw new Error(`新聞載入失敗 (${r.status})`)
  const data = await r.json()
  if (data.error) throw new Error(data.error)
  return data
}
