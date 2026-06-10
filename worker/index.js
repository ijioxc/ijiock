// market-proxy — Cloudflare Worker
// 統一 CORS proxy：Yahoo Finance / Google News RSS

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const ALLOWED_ORIGINS = new Set([
  'https://stooq.com',
  'https://openapi.twse.com.tw',
  'https://www.twse.com.tw',
  'https://query1.finance.yahoo.com',
  'https://query2.finance.yahoo.com',
  'https://api.marketdata.app',
])

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

export default {
  async fetch(request, _env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS })
    }

    const url = new URL(request.url)

    // GET /proxy?url=<encoded_target_url>
    if (url.pathname === '/proxy') {
      const target = url.searchParams.get('url')
      if (!target) return json({ error: 'missing url param' }, 400)

      let targetUrl
      try {
        targetUrl = new URL(target)
      } catch {
        return json({ error: 'invalid url' }, 400)
      }

      const origin = `${targetUrl.protocol}//${targetUrl.hostname}`
      if (!ALLOWED_ORIGINS.has(origin)) {
        return json({ error: 'origin not allowed: ' + origin }, 403)
      }

      // Cloudflare Cache API — 30s TTL to avoid Yahoo 429s
      const cache = caches.default
      const cacheKey = new Request(target)
      const cached = await cache.match(cacheKey)
      if (cached) {
        const ct = cached.headers.get('content-type') || 'application/json'
        return new Response(cached.body, { headers: { ...CORS, 'Content-Type': ct } })
      }

      try {
        const r = await fetch(target, {
          headers: { 'User-Agent': UA },
          signal: AbortSignal.timeout(12000),
        })
        const body = await r.text()
        const ct = r.headers.get('content-type') || 'application/json'

        if (r.status === 200) {
          const toStore = new Response(body, {
            status: 200,
            headers: { 'Content-Type': ct, 'Cache-Control': 'max-age=30' },
          })
          ctx.waitUntil(cache.put(cacheKey, toStore))
        }

        return new Response(body, {
          status: r.status,
          headers: { ...CORS, 'Content-Type': ct },
        })
      } catch (e) {
        return json({ error: e.message }, 502)
      }
    }

    // GET /news?s=<symbol>&n=<name>
    if (url.pathname === '/news') {
      const sym  = url.searchParams.get('s') || ''
      const name = url.searchParams.get('n') || sym
      const isTW = /^\d{4,5}\.TW$/i.test(sym)
      const query = isTW ? encodeURIComponent(name + ' 股票') : encodeURIComponent(sym + ' stock')
      const lang  = isTW ? 'zh-TW' : 'en-US'
      const gl    = isTW ? 'TW'    : 'US'
      const ceid  = isTW ? 'TW:zh-Hant' : 'US:en'
      const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=${lang}&gl=${gl}&ceid=${ceid}`

      try {
        const r = await fetch(rssUrl, {
          headers: { 'User-Agent': UA, 'Accept': 'application/rss+xml, application/xml, text/xml, */*' },
          signal: AbortSignal.timeout(12000),
        })
        if (!r.ok) throw new Error(`RSS ${r.status}`)
        const xml = await r.text()
        const items = []
        try {
          const itemRx = /<item>([\s\S]*?)<\/item>/g
          let m
          while ((m = itemRx.exec(xml)) !== null) {
            const c = m[1]
            const raw     = (c.match(/<title>([\s\S]*?)<\/title>/))?.[1] || ''
            const title   = raw.replace(/<!\[CDATA\[|\]\]>/g, '').trim()
            const link    = (c.match(/<link>(https?:\/\/[^\s<]+)<\/link>/) || c.match(/<guid[^>]*>(https?:\/\/[^\s<]+)<\/guid>/))?.[1]?.trim() || ''
            const pubDate = c.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() || ''
            const srcRaw  = c.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || ''
            const source  = srcRaw.replace(/<!\[CDATA\[|\]\]>/g, '').trim()
            if (title && title.length > 5) items.push({ title, link, pubDate, source })
          }
        } catch {
          // XML parsing failed — return empty list rather than crashing
        }
        return json(items.slice(0, 25))
      } catch (e) {
        return json({ error: e.message }, 502)
      }
    }

    if (url.pathname === '/') {
      return json({ status: 'ok', service: 'market-proxy', version: '3' })
    }

    return json({ error: 'not found' }, 404)
  },
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
