// market-proxy — Cloudflare Worker
// 統一 CORS proxy：Stooq / TWSE / Yahoo Finance / marketdata.app

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
  async fetch(request) {
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

      try {
        const r = await fetch(target, {
          headers: { 'User-Agent': UA },
          signal: AbortSignal.timeout(12000),
        })
        const body = await r.text()
        const ct = r.headers.get('content-type') || 'application/json'
        return new Response(body, {
          status: r.status,
          headers: { ...CORS, 'Content-Type': ct },
        })
      } catch (e) {
        return json({ error: e.message }, 502)
      }
    }

    if (url.pathname === '/') {
      return json({ status: 'ok', service: 'market-proxy', version: '2' })
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
