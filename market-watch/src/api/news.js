const IS_PROD = import.meta.env.PROD
const CORS_PROXY = 'https://corsproxy.io/?'
function px(url) { return IS_PROD ? CORS_PROXY + encodeURIComponent(url) : url }

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

  // Production: fetch Google News RSS via CORS proxy, parse client-side
  const isTW = /\.(TW|TWO)$/i.test(symbol)
  const q    = isTW ? encodeURIComponent((name || symbol) + ' 股票') : encodeURIComponent((symbol || name) + ' stock')
  const lang = isTW ? 'zh-TW' : 'en-US'
  const gl   = isTW ? 'TW'    : 'US'
  const ceid = isTW ? 'TW:zh-Hant' : 'US:en'
  const rssUrl = `https://news.google.com/rss/search?q=${q}&hl=${lang}&gl=${gl}&ceid=${ceid}`
  const r = await fetch(px(rssUrl))
  if (!r.ok) throw new Error(`新聞 RSS 失敗 (${r.status})`)
  const xml = await r.text()
  const items = []
  const rx = /<item>([\s\S]*?)<\/item>/g
  let m
  while ((m = rx.exec(xml)) !== null) {
    const c = m[1]
    const raw     = (c.match(/<title>([\s\S]*?)<\/title>/))?.[1] || ''
    const title   = raw.replace(/<!\[CDATA\[|\]\]>/g, '').trim()
    const link    = (c.match(/<link>(https?:\/\/[^\s<]+)<\/link>/) || c.match(/<guid[^>]*>(https?:\/\/[^\s<]+)<\/guid>/))?.[1]?.trim() || ''
    const pubDate = c.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() || ''
    const srcRaw  = c.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || ''
    const source  = srcRaw.replace(/<!\[CDATA\[|\]\]>/g, '').trim()
    if (title && title.length > 5) items.push({ title, link, pubDate, source })
  }
  return items.slice(0, 25)
}
