// BandLab — Cloudflare Worker Proxy
// Fugle (台股) + Yahoo (美股) 統一代理
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const FUGLE = 'https://api.fugle.tw/marketdata/v1.0/stock';
const ALLOWED = [
  '/intraday/quote/',
  '/intraday/candles/',
  '/historical/candles/',
  '/intraday/tickers',
  '/intraday/volumes',
  '/snapshot',
];

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }
    const url = new URL(request.url);
    const path = url.pathname;

    // ── Fugle routes ──
    if (path.startsWith('/fugle/')) {
      const sub = path.slice(6); // strip "/fugle"
      if (!ALLOWED.some(a => sub.startsWith(a))) {
        return json({ error: 'path not allowed' }, 403);
      }
      const params = url.searchParams.toString();
      const target = `${FUGLE}${sub}${params ? '?' + params : ''}`;
      try {
        const r = await fetch(target, {
          headers: { 'X-API-KEY': env.FUGLE_API_KEY },
          signal: AbortSignal.timeout(10000),
        });
        const body = await r.text();
        const ttl = sub.includes('/quote/') ? 5
          : sub.includes('/tickers') || sub.includes('/volumes') ? 30
          : 60;
        return new Response(body, {
          status: r.status,
          headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${ttl}` },
        });
      } catch (e) {
        return json({ error: e.message }, 502);
      }
    }

    // ── Yahoo pass-through proxy ──
    if (path === '/yahoo') {
      const target = url.searchParams.get('url');
      if (!target || !target.includes('finance.yahoo.com')) {
        return json({ error: 'invalid url' }, 400);
      }
      try {
        const r = await fetch(target, { signal: AbortSignal.timeout(10000) });
        const body = await r.text();
        return new Response(body, {
          status: r.status,
          headers: { ...CORS, 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return json({ error: e.message }, 502);
      }
    }

    // ── 自動化焦點與盯盤 (Automated Focus & Monitoring) ──
    if (path === '/focus-news') {
      const sources = [
        { name: "Stratechery", url: "https://stratechery.com/" },
        { name: "Fed Press Releases", url: "https://www.federalreserve.gov/newsevents/pressreleases.htm" },
        // 未來可加入更多來源
      ];

      try {
        const results = await Promise.all(sources.map(async (src) => {
          const r = await fetch(src.url, { headers: { 'User-Agent': 'nkust-racing-bot' }});
          const html = await r.text();
          
          let summary = "無摘要";
          let title = src.name;
          
          const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) 
                         || html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
          if (metaMatch) summary = metaMatch[1];
          
          const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
          if (titleMatch) title = titleMatch[1];

          // 簡單清理文字
          summary = summary.replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();

          return { source: src.name, title, summary, url: src.url };
        }));
        return new Response(JSON.stringify({ data: results }), {
          status: 200,
          headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' }
        });
      } catch (e) {
        return json({ error: e.message }, 502);
      }
    }

    // ── Health check ──
    if (path === '/') {
      return json({ status: 'ok', service: 'BandLab Proxy' });
    }

    return json({ error: 'not found' }, 404);
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
