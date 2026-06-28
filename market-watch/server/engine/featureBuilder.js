const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');

let twseStockNames = {};
let namesLoaded = false;

async function loadStockNames() {
  if (namesLoaded) return;
  try {
    const twseRes = await axios.get('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL');
    if (Array.isArray(twseRes.data)) {
      twseRes.data.forEach(d => {
        twseStockNames[d.Code] = d.Name;
      });
    }
  } catch (e) {
    console.error("Error loading TWSE names", e.message);
  }
  namesLoaded = true;
}

async function fetchRawData(ticker) {
  try {
    await loadStockNames();
    const symbol = ticker.endsWith('.TW') || ticker.endsWith('.TWO') ? ticker : `${ticker}.TW`;
    const quote = await yahooFinance.quote(symbol);
    const summaryDetail = await yahooFinance.quoteSummary(symbol, { modules: ['summaryDetail', 'financialData', 'defaultKeyStatistics'] });
    
    // For historical prices, grab last 60 days
    const queryOptions = { period1: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], interval: '1d' };
    const chartData = await yahooFinance.chart(symbol, queryOptions);
    const history = chartData.quotes;
    
    // Fetch TWSE Institutional Flow (T86)
    let institutionalData = null;
    if (symbol.endsWith('.TW')) {
      try {
        const twseRes = await axios.get('https://openapi.twse.com.tw/v1/fund/T86');
        const code = ticker.replace('.TW', '');
        const dataArr = Array.isArray(twseRes.data) ? twseRes.data : twseRes.data?.data;
        if (Array.isArray(dataArr)) {
          institutionalData = dataArr.find(d => d.Code === code) || null;
        }
      } catch (err) {
        console.error("Error fetching TWSE T86:", err.message);
      }
    }

    // Fetch Chinese Name
    const code = ticker.replace('.TW', '').replace('.TWO', '');
    let chineseName = twseStockNames[code] || null;
    
    if (!chineseName) {
      try {
        const searchRes = await yahooFinance.search(symbol, { lang: 'zh-Hant-TW', region: 'TW' });
        if (searchRes.quotes && searchRes.quotes[0]) {
          chineseName = searchRes.quotes[0].longname || searchRes.quotes[0].shortname;
        }
      } catch (err) {
        if (err.name === 'FailedYahooValidationError' && err.result && err.result.quotes) {
          chineseName = err.result.quotes[0].longname || err.result.quotes[0].shortname;
        }
      }
    }

    // Fetch Google News RSS
    let latestNews = [];
    try {
      const queryStr = chineseName ? `${chineseName} 股票` : `${code} 股票`;
      const query = encodeURIComponent(queryStr);
      const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;
      const rssRes = await axios.get(rssUrl);
      const parser = new XMLParser();
      const rssObj = parser.parse(rssRes.data);
      const items = rssObj.rss?.channel?.item;
      if (items) {
        const arr = Array.isArray(items) ? items : [items];
        latestNews = arr.slice(0, 15).map(i => ({
          title: i.title,
          link: i.link,
          pubDate: i.pubDate
        }));
      }
    } catch (err) {
      console.error("Error fetching Google News RSS:", err.message);
    }
    
    return {
      quote,
      summaryDetail,
      history,
      institutionalData,
      latestNews,
      chineseName
    };
  } catch (err) {
    console.error("Error fetching raw data for", ticker, err.message);
    return null;
  }
}

function isEtf(ticker) {
  return /^00/.test(ticker.replace(/\.(TW|TWO)$/, ''));
}

function calcTrend(rawData) {
  if (!rawData || !rawData.history) return 50;
  const closes = rawData.history.map(d => d.close).filter(Boolean);
  if (closes.length < 20) return 50;

  const cur = closes[closes.length - 1];
  const ma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;

  if (closes.length >= 60) {
    const ma60 = closes.slice(-60).reduce((a, b) => a + b, 0) / 60;
    if (cur > ma20 && ma20 > ma60) return 85;
    if (cur > ma20 && ma20 <= ma60) return 62;
    if (cur <= ma20 && ma20 > ma60) return 42;
    return 20;
  }
  return cur > ma20 ? 68 : 35;
}

function calcQuality(rawData, etf) {
  if (!rawData) return 50;

  if (etf) {
    const sd = rawData.summaryDetail?.summaryDetail || {};
    const q = rawData.quote || {};
    let score = 50;
    // 殖利率：高息 ETF 加分
    const yld = sd.yield || sd.dividendYield || q.trailingAnnualDividendYield || 0;
    if (yld > 0.06) score += 30;
    else if (yld > 0.04) score += 20;
    else if (yld > 0.02) score += 10;
    // 52週漲幅
    const chg52w = q.fiftyTwoWeekChangePercent || 0;
    if (chg52w > 0.15) score += 20;
    else if (chg52w > 0) score += 10;
    else if (chg52w < -0.2) score -= 15;
    return Math.min(100, Math.max(0, score));
  }

  if (!rawData.summaryDetail) return 50;
  const fd = rawData.summaryDetail.financialData || {};
  let score = 50;
  if (fd.returnOnEquity && fd.returnOnEquity > 0.15) score += 25;
  if (fd.operatingMargins && fd.operatingMargins > 0.1) score += 15;
  if (fd.revenueGrowth && fd.revenueGrowth > 0) score += 10;
  return Math.min(100, score);
}

function calcFlow(rawData) {
  if (!rawData) return 50;
  let score = 50;

  if (rawData.institutionalData) {
    const inst = rawData.institutionalData;
    const foreignNet = parseInt(inst['外資及陸資買賣超股數'] || '0', 10);
    const trustNet   = parseInt(inst['投信買賣超股數'] || '0', 10);
    if (foreignNet > 1000000) score += 20;
    else if (foreignNet > 0) score += 10;
    else if (foreignNet < -1000000) score -= 20;
    else if (foreignNet < 0) score -= 10;
    if (trustNet > 500000) score += 20;
    else if (trustNet > 0) score += 10;
    else if (trustNet < -500000) score -= 20;
    else if (trustNet < 0) score -= 10;
  } else if (rawData.history && rawData.history.length >= 10) {
    const h = rawData.history;
    const lastVol = h[h.length - 1].volume || 0;
    const avgVol  = h.slice(-10).reduce((a, b) => a + (b.volume || 0), 0) / 10;
    if (avgVol > 0) {
      const ratio = lastVol / avgVol;
      if (ratio > 2)   score += 25;
      else if (ratio > 1.5) score += 15;
      else if (ratio > 1.2) score += 8;
      else if (ratio < 0.5) score -= 15;
    }
    // 5日動能
    const recent = h.slice(-5).map(d => d.close).filter(Boolean);
    if (recent.length >= 2) {
      const pct = (recent[recent.length-1] - recent[0]) / recent[0];
      if (pct > 0.03) score += 10;
      else if (pct < -0.03) score -= 10;
    }
  }

  return Math.max(0, Math.min(100, score));
}

function calcValuation(rawData, etf) {
  if (!rawData || !rawData.summaryDetail) return 50;
  const sd = rawData.summaryDetail.summaryDetail || {};
  const defaultStats = rawData.summaryDetail.defaultKeyStatistics || {};

  if (etf) {
    // ETF 估值：用當前價格在 52 週區間的相對位置（越靠近低點越值得買）
    const low52  = sd.fiftyTwoWeekLow  || 0;
    const high52 = sd.fiftyTwoWeekHigh || 0;
    const cur    = rawData.quote?.regularMarketPrice || 0;
    if (high52 > low52 && cur > 0) {
      const pctFromHigh = (high52 - cur) / (high52 - low52);
      if (pctFromHigh > 0.7) return 82;
      if (pctFromHigh > 0.4) return 62;
      if (pctFromHigh > 0.2) return 48;
      return 32;
    }
    return 50;
  }

  let score = 50;
  if (sd.trailingPE && sd.trailingPE < 15) score += 20;
  else if (sd.trailingPE && sd.trailingPE > 30) score -= 20;
  if (defaultStats.priceToBook && defaultStats.priceToBook < 2) score += 20;
  return Math.max(0, Math.min(100, score));
}

function calcRisk(rawData) {
  // Risk is penalty (0-100). Higher = more penalty
  let penalty = 0;
  if (!rawData) return 0;
  
  if (rawData.history && rawData.history.length >= 60) {
    const closes = rawData.history.map(d => d.close);
    const currentPrice = closes[closes.length - 1];
    const ma60 = closes.slice(-60).reduce((a, b) => a + b, 0) / 60;
    
    if (currentPrice < ma60) penalty += 30; // Trend break
  }
  
  // Basic News Sentiment Penalty
  if (rawData.latestNews && rawData.latestNews.length > 0) {
    let negativeNewsCount = 0;
    const negativeKeywords = ['跌停', '衰退', '下修', '看壞', '崩', '重挫', '利空', '降評'];
    
    rawData.latestNews.forEach(news => {
      const title = news.title || '';
      const isNegative = negativeKeywords.some(kw => title.includes(kw));
      if (isNegative) negativeNewsCount++;
    });
    
    penalty += negativeNewsCount * 15; // +15 penalty for each negative news
  }
  
  return Math.min(100, penalty);
}

async function buildFeatures(ticker) {
  const rawData = await fetchRawData(ticker);
  const etf = isEtf(ticker);

  return {
    trend:       calcTrend(rawData),
    quality:     calcQuality(rawData, etf),
    flow:        calcFlow(rawData),
    valuation:   calcValuation(rawData, etf),
    risk:        calcRisk(rawData),
    rawQuote:    rawData ? rawData.quote : null,
    chineseName: rawData ? rawData.chineseName : null,
    latestNews:  rawData ? rawData.latestNews : []
  };
}

module.exports = {
  buildFeatures
};
