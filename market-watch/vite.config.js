import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function marketProxyPlugin() {
  return {
    name: 'market-proxy',
    configureServer(server) {
      // Stooq proxy — US stocks, indices, FX
      server.middlewares.use('/api/stooq', async (req, res) => {
        const url = `https://stooq.com${req.url.replace(/^\/api\/stooq/, '')}`
        try {
          const r = await fetch(url, { headers: { 'User-Agent': UA } })
          res.statusCode = r.status
          res.setHeader('Content-Type', r.headers.get('content-type') || 'text/csv')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.end(await r.text())
        } catch (e) {
          res.statusCode = 502; res.end(e.message)
        }
      })

      // TWSE OpenAPI proxy — current day data
      server.middlewares.use('/api/twse', async (req, res) => {
        const url = `https://openapi.twse.com.tw${req.url.replace(/^\/api\/twse/, '')}`
        try {
          const r = await fetch(url, { headers: { 'User-Agent': UA } })
          res.statusCode = r.status
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.end(await r.text())
        } catch (e) {
          res.statusCode = 502; res.end(e.message)
        }
      })
      // marketdata.app — free US stock OHLC (no API key needed)
      server.middlewares.use('/api/mktdata', async (req, res) => {
        const url = `https://api.marketdata.app${req.url.replace(/^\/api\/mktdata/, '')}`
        try {
          const r = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': UA } })
          res.statusCode = r.status
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.end(await r.text())
        } catch (e) {
          res.statusCode = 502; res.end(e.message)
        }
      })

      // TWSE historical proxy — www.twse.com.tw/rwd
      server.middlewares.use('/api/twse-hist', async (req, res) => {
        const url = `https://www.twse.com.tw${req.url.replace(/^\/api\/twse-hist/, '')}`
        try {
          const r = await fetch(url, { headers: { 'User-Agent': UA, 'Referer': 'https://www.twse.com.tw/' } })
          res.statusCode = r.status
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.end(await r.text())
        } catch (e) {
          res.statusCode = 502; res.end(e.message)
        }
      })

      // News RSS proxy — Google News RSS → JSON (no auth needed)
      server.middlewares.use('/api/news', async (req, res) => {
        const tail = req.url
        const qmark = tail.indexOf('?')
        const qs = qmark >= 0 ? tail.slice(qmark + 1) : ''
        const params = new URLSearchParams(qs)
        const sym  = params.get('s') || ''
        const name = params.get('n') || sym
        const isTW = /^\d{4,5}\.TW$/i.test(sym)
        const query   = isTW ? encodeURIComponent(name + ' 股票') : encodeURIComponent(sym + ' stock')
        const lang    = isTW ? 'zh-TW' : 'en-US'
        const gl      = isTW ? 'TW' : 'US'
        const ceid    = isTW ? 'TW:zh-Hant' : 'US:en'
        const rssUrl  = `https://news.google.com/rss/search?q=${query}&hl=${lang}&gl=${gl}&ceid=${ceid}`
        try {
          const r = await fetch(rssUrl, {
            headers: { 'User-Agent': UA, 'Accept': 'application/rss+xml, application/xml, text/xml, */*' }
          })
          if (!r.ok) throw new Error(`RSS ${r.status}`)
          const xml = await r.text()
          const items = []
          const itemRx = /<item>([\s\S]*?)<\/item>/g
          let m
          while ((m = itemRx.exec(xml)) !== null) {
            const c = m[1]
            const raw   = (c.match(/<title>([\s\S]*?)<\/title>/))?.[1] || ''
            const title = raw.replace(/<!\[CDATA\[|\]\]>/g, '').trim()
            const link  = (c.match(/<link>(https?:\/\/[^\s<]+)<\/link>/) || c.match(/<guid[^>]*>(https?:\/\/[^\s<]+)<\/guid>/))?.[1]?.trim() || ''
            const pubDate = c.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() || ''
            const srcRaw  = c.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || ''
            const source  = srcRaw.replace(/<!\[CDATA\[|\]\]>/g, '').trim()
            if (title && title.length > 5) items.push({ title, link, pubDate, source })
          }
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.end(JSON.stringify(items.slice(0, 25)))
        } catch (e) {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: e.message }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), marketProxyPlugin()],
  base: '/ijiock/',
  build: {
    outDir: '../docs',
    emptyOutDir: true,
  },
})
