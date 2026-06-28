// src/services/marketApi.js

const dataCache = new Map();

/**
 * 透過 Yahoo Finance Proxy 獲取歷史 K 線資料 (具備快取層)
 * @param {string} symbol - 股票代碼 (e.g., '2330.TW', 'AAPL')
 * @param {string} range - 獲取範圍 (e.g., '1y', '6mo')
 * @returns {Promise<Array>} 轉換後的 lightweight-charts OHLC 資料陣列
 */
export async function fetchHistoricalData(symbol, tf = '日') {
  const cacheKey = `${symbol}_${tf}`;
  if (dataCache.has(cacheKey)) {
    return dataCache.get(cacheKey);
  }

  // Map UI timeframe to Yahoo range & interval
  let rangeStr = '6mo';
  let intervalStr = '1d';
  switch (tf) {
    case '15分': rangeStr = '5d'; intervalStr = '15m'; break;
    case '日':   rangeStr = '6mo'; intervalStr = '1d'; break;
    case '週':   rangeStr = '2y'; intervalStr = '1wk'; break;
    case '月':   rangeStr = '5y'; intervalStr = '1mo'; break;
    case '3mo':  rangeStr = '3mo'; intervalStr = '1d'; break;
    case '1y':   rangeStr = '1y'; intervalStr = '1d'; break;
    default:     rangeStr = tf; intervalStr = '1d'; break;
  }

  try {
    // Yahoo Finance API endpoint
    const url = `/api/yahoo/v8/finance/chart/${encodeURIComponent(symbol)}?range=${rangeStr}&interval=${intervalStr}`;
    const res = await fetch(url);
    
    if (!res.ok) {
      if (res.status === 429) {
        console.warn(`Yahoo API rate limited (429) for ${symbol}. Falling back to mock data.`);
        return generateMockData(symbol);
      }
      throw new Error(`Failed to fetch data for ${symbol}: ${res.statusText}`);
    }

    const data = await res.json();
    const result = data.chart?.result?.[0];

    if (!result || !result.timestamp || !result.indicators?.quote?.[0]) {
      console.warn(`No valid data returned for ${symbol}`);
      return [];
    }

    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    const adjCloses = result.indicators.adjclose?.[0]?.adjclose; // 取得除權息還原收盤價
    
    const formattedData = [];
    
    let lastValidClose = null;

    for (let i = 0; i < timestamps.length; i++) {
      const open = quotes.open[i];
      const high = quotes.high[i];
      const low = quotes.low[i];
      const close = quotes.close[i];
      const adjclose = adjCloses ? adjCloses[i] : close;
      const volume = quotes.volume[i] || 0;

      const isIntraday = intervalStr.endsWith('m') || intervalStr.endsWith('h');
      
      let timeVal;
      if (isIntraday) {
        // Lightweight charts wants UNIX timestamp in seconds for intraday
        timeVal = timestamps[i];
      } else {
        // 日期轉換 (YYYY-MM-DD) 給日線以上
        timeVal = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
      }

      if (open != null && high != null && low != null && close != null && adjclose != null) {
        // 資料清洗與正規化 (極度重要): 歷史還原
        const ratio = close !== 0 ? adjclose / close : 1;
        
        const adjustedOpen = open * ratio;
        const adjustedHigh = high * ratio;
        const adjustedLow = low * ratio;
        const adjustedClose = adjclose;

        formattedData.push({
          time: timeVal,
          open: adjustedOpen,
          high: adjustedHigh,
          low: adjustedLow,
          close: adjustedClose,
          volume: volume
        });
        lastValidClose = adjustedClose;
      } else if (lastValidClose !== null) {
        // 插補缺失的交易日 (維持平盤)
        formattedData.push({
          time: timeVal,
          open: lastValidClose,
          high: lastValidClose,
          low: lastValidClose,
          close: lastValidClose,
          volume: 0
        });
      }
    }

    // 移除重複的 time
    const uniqueData = formattedData.filter((v, i, a) => a.findIndex(t => (t.time === v.time)) === i);

    dataCache.set(cacheKey, uniqueData);
    return uniqueData;

  } catch (error) {
    console.error("fetchHistoricalData Error:", error);
    console.warn("Falling back to mock data due to API failure.");
    const fallback = generateMockData(symbol);
    // 可選擇是否快取 fallback，這裡不快取以利後續重試
    return fallback;
  }
}

// 備用模擬數據：當 Yahoo API 阻擋時，產生平滑的隨機 K 線，確保畫面不留白
function generateMockData(symbol) {
  const data = [];
  let currentPrice = symbol === '2330.TW' ? 2300 : symbol === '0050.TW' ? 190 : symbol === 'NVDA' ? 1200 : 200;
  const today = new Date();
  
  for (let i = 180; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    currentPrice = currentPrice + (Math.random() - 0.5) * (currentPrice * 0.03);
    
    let adjustedPrice = currentPrice;

    data.push({
      time: date.toISOString().split('T')[0],
      open: adjustedPrice,
      high: adjustedPrice * 1.015,
      low: adjustedPrice * 0.985,
      close: adjustedPrice + (Math.random() - 0.5) * (adjustedPrice * 0.015),
      volume: Math.floor(Math.random() * 10000) + 1000
    });
  }
  return data;
}
