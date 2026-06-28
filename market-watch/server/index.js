const express = require('express');
const cors = require('cors');
const { buildFeatures } = require('./engine/featureBuilder');
const { score, mapSignal, generateExplanation, generateRiskAlerts } = require('./engine/scoringEngine');

const app = express();
app.use(cors());
app.use(express.json());

const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();
const axios = require('axios');

// TWSE 中文名快取（個股 + ETF）
let twNames = {};
let twNamesLoadedAt = 0;
async function loadTwNames() {
  // 24 小時快取
  if (Date.now() - twNamesLoadedAt < 24 * 60 * 60 * 1000 && Object.keys(twNames).length > 0) return;
  try {
    const [stockRes, etfRes] = await Promise.allSettled([
      axios.get('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL', { timeout: 8000 }),
      axios.get('https://openapi.twse.com.tw/v1/ETFReport/TWT49U', { timeout: 8000 }),
    ]);
    const map = {};
    if (stockRes.status === 'fulfilled' && Array.isArray(stockRes.value.data)) {
      stockRes.value.data.forEach(d => { if (d.Code) map[d.Code] = d.Name; });
    }
    if (etfRes.status === 'fulfilled' && Array.isArray(etfRes.value.data)) {
      etfRes.value.data.forEach(d => {
        const code = d.Code || d.code || d.SecuritiesCode;
        const name = d.Name || d.name || d.SecuritiesName;
        if (code && name) map[code] = name;
      });
    }
    twNames = map;
    twNamesLoadedAt = Date.now();
  } catch (err) {
    console.error('loadTwNames failed:', err.message);
  }
}

async function resolveName(ticker, quote) {
  // 台股／ETF：優先 TWSE 中文
  const twMatch = ticker.match(/^([0-9A-Z]+)\.TW[O]?$/i);
  if (twMatch) {
    await loadTwNames();
    const code = twMatch[1];
    if (twNames[code]) return twNames[code];
    // 退路：Yahoo search 取中文
    try {
      const searchRes = await yahooFinance.search(ticker, { lang: 'zh-Hant-TW', region: 'TW' });
      const zh = searchRes?.quotes?.[0]?.longname || searchRes?.quotes?.[0]?.shortname;
      if (zh && /[一-龥]/.test(zh)) return zh;
    } catch (_) {}
  }
  return quote?.shortName || quote?.longName || ticker;
}

app.post('/api/market/quotes', async (req, res) => {
  try {
    const { tickers } = req.body;
    if (!tickers || !Array.isArray(tickers)) {
      return res.status(400).json({ error: 'Tickers array required' });
    }

    const results = await Promise.all(tickers.map(async (t) => {
      try {
        let symbol = t;
        if (!t.includes('.')) {
          if (/^[0-9A-Z]+$/.test(t) && /[0-9]/.test(t)) {
             symbol = `${t}.TW`;
          }
        }

        const quote = await yahooFinance.quote(symbol);
        if (!quote) return null;

        const queryOptions = { period1: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], interval: '1d' };
        let history = [];
        try {
          const chartData = await yahooFinance.chart(symbol, queryOptions);
          history = chartData?.quotes?.slice(-10).map(q => q.close) || [];
        } catch (chartErr) {
          console.warn(`Could not fetch chart for ${symbol}`);
        }

        const name = await resolveName(symbol, quote);

        return {
          symbol: t,
          price: quote.regularMarketPrice || quote.price || 0,
          change: quote.regularMarketChangePercent || 0,
          priceHistory: history,
          name,
        };
      } catch (err) {
        console.error(`Error fetching quote for ${t}:`, err.message);
        return null;
      }
    }));

    res.json(results.filter(Boolean));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/market/breadth', async (req, res) => {
  try {
    // 簡單模擬：根據大盤走勢隨機分配漲跌家數
    let up = 400, down = 400, unchanged = 150;
    try {
      const quote = await yahooFinance.quote('^TWII');
      if (quote.regularMarketChangePercent > 0) {
        up = 500 + Math.floor(Math.random() * 200);
        down = 300 - Math.floor(Math.random() * 100);
      } else {
        up = 300 - Math.floor(Math.random() * 100);
        down = 500 + Math.floor(Math.random() * 200);
      }
    } catch (e) {
      console.warn("Could not fetch ^TWII");
    }
    
    res.json({ up, down, unchanged });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/decision/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const { style = 'QUALITY' } = req.query;

    console.log(`Calculating Decision for ${ticker} with style ${style}`);

    // 1. Feature Builder
    const features = await buildFeatures(ticker);

    if (!features || !features.rawQuote) {
      return res.status(404).json({ error: 'Data not found for ticker' });
    }

    // 2. Scoring Engine
    const finalScore = score(features, style);

    // 3. Signal Mapping
    const signalState = mapSignal(finalScore);

    // 4. Decision Object Schema
    const decisionObject = {
      stock: {
        ticker: features.rawQuote.symbol,
        name: features.chineseName || features.rawQuote.shortName || features.rawQuote.longName || ticker
      },
      style: style,
      signal: {
        state: signalState,
        score: finalScore,
        confidence: 0.85 // Mocking confidence for now
      },
      factors: {
        trend: parseFloat((features.trend / 100).toFixed(2)),
        quality: parseFloat((features.quality / 100).toFixed(2)),
        flow: parseFloat((features.flow / 100).toFixed(2)),
        valuation: parseFloat((features.valuation / 100).toFixed(2)),
        risk: parseFloat((features.risk / 100).toFixed(2))
      },
      explanation: generateExplanation(features, finalScore, signalState),
      risk: generateRiskAlerts(features),
      latestNews: features.latestNews,
      action: {
        recommendation: finalScore > 70 ? "ADD_BASKET" : "WATCH",
        buttons: ["ADD_BASKET", "OPEN_B"]
      }
    };

    res.json(decisionObject);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
app.get('/api/news-image', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL is required' });
  try {
    const axios = require('axios');
    const response = await axios.get(url, { 
      timeout: 3000, 
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } 
    });
    // extract og:image or twitter:image
    let match = response.data.match(/<meta[^>]*property=[\"']og:image[\"'][^>]*content=[\"']([^\"']+)[\"']/i);
    if (!match) {
      match = response.data.match(/<meta[^>]*name=[\"']twitter:image[\"'][^>]*content=[\"']([^\"']+)[\"']/i);
    }
    if (match && match[1]) {
      return res.json({ imageUrl: match[1] });
    }
    res.json({ imageUrl: null });
  } catch (err) {
    res.json({ imageUrl: null });
  }
});

const PORT = process.env.PORT || 5005;
app.listen(PORT, () => {
  console.log(`Decision Engine Backend running on port ${PORT}`);
});
