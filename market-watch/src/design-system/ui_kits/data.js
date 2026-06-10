// MarketWatch UI kit — mock market data (no live API).
// Prices/percent in the Taiwan convention: positive change = 漲 (red).

function genCandles(seed, n, base, vol) {
  let p = base;
  const out = [];
  let s = seed;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 0; i < n; i++) {
    const open = p;
    const drift = (rnd() - 0.46) * vol;
    const close = Math.max(1, open + drift);
    const high = Math.max(open, close) + rnd() * vol * 0.6;
    const low = Math.min(open, close) - rnd() * vol * 0.6;
    out.push({ open, high, low, close, vol: 0.5 + rnd() });
    p = close;
  }
  return out;
}

const SYMBOLS = [
  { symbol: '2330.TW', name: '台積電', cat: 'TW', price: 1085.0, pct: 2.36, seed: 7, base: 980, vol: 22, tag: 'red', pin: true },
  { symbol: '2317.TW', name: '鴻海', cat: 'TW', price: 203.5, pct: 1.24, seed: 13, base: 190, vol: 5 },
  { symbol: '2454.TW', name: '聯發科', cat: 'TW', price: 1390.0, pct: -0.71, seed: 21, base: 1420, vol: 30 },
  { symbol: '2412.TW', name: '中華電', cat: 'TW', price: 128.5, pct: 0.39, seed: 29, base: 126, vol: 1.5 },
  { symbol: 'AAPL', name: '蘋果', cat: 'US', price: 242.18, pct: 0.86, seed: 4, base: 232, vol: 4, tag: 'blue' },
  { symbol: 'NVDA', name: '輝達', cat: 'US', price: 178.42, pct: -1.14, seed: 18, base: 188, vol: 6 },
  { symbol: 'MSFT', name: '微軟', cat: 'US', price: 478.9, pct: 1.52, seed: 33, base: 460, vol: 7 },
  { symbol: 'TSLA', name: '特斯拉', cat: 'US', price: 412.6, pct: 3.92, seed: 41, base: 380, vol: 12, tag: 'red' },
  { symbol: '^GSPC', name: 'S&P 500', cat: 'IDX', price: 6184.2, pct: 0.42, seed: 51, base: 6100, vol: 30 },
  { symbol: '^IXIC', name: 'NASDAQ', cat: 'IDX', price: 20338.7, pct: 0.71, seed: 57, base: 20000, vol: 120 },
  { symbol: 'BTC-USD', name: '比特幣', cat: 'IDX', price: 98420.0, pct: -2.18, seed: 63, base: 102000, vol: 1800 },
  { symbol: 'TWDUSD=X', name: '台幣/美元', cat: 'FX', price: 31.42, pct: -0.12, seed: 71, base: 31.5, vol: 0.15 },
];

SYMBOLS.forEach(s => { s.candles = genCandles(s.seed, 60, s.base, s.vol); s.spark = s.candles.slice(-14).map(c => c.close); });

const TICKER = [
  { label: '加權指數', price: '23,180', pct: 0.58 },
  { label: '櫃買指數', price: '241.3', pct: 0.92 },
  { label: '道瓊', price: '44,910', pct: -0.21 },
  { label: 'S&P 500', price: '6,184', pct: 0.42 },
  { label: '那斯達克', price: '20,338', pct: 0.71 },
  { label: '費半', price: '5,412', pct: 1.34 },
  { label: '日經225', price: '39,480', pct: -0.44 },
  { label: '黃金', price: '2,684', pct: 0.31 },
  { label: '布蘭特原油', price: '72.4', pct: -1.12 },
  { label: '美元指數', price: '107.2', pct: 0.18 },
];

const NEWS = [
  { t: '台積電法說會釋出樂觀展望，AI 需求帶動先進製程滿載', src: '經濟日報', time: '12分鐘前', senti: 'bull' },
  { t: 'Fed 官員談話偏鷹，市場下修明年降息預期', src: 'Reuters', time: '48分鐘前', senti: 'bear' },
  { t: '輝達新一代 GPU 傳遞延出貨，供應鏈個股震盪', src: 'Bloomberg', time: '1小時前', senti: 'bear' },
  { t: '外資連三日買超台股，買盤集中半導體與金融', src: '工商時報', time: '2小時前', senti: 'bull' },
  { t: '比特幣回落至 9.8 萬美元，市場觀望 ETF 資金流向', src: 'CoinDesk', time: '3小時前', senti: 'neutral' },
];

const PORTFOLIO = [
  { symbol: '2330.TW', name: '台積電', shares: 1000, cost: 880, price: 1085.0 },
  { symbol: 'AAPL', name: '蘋果', shares: 50, cost: 210, price: 242.18 },
  { symbol: 'NVDA', name: '輝達', shares: 80, cost: 195, price: 178.42 },
  { symbol: 'MSFT', name: '微軟', shares: 30, cost: 430, price: 478.9 },
];

const EVENTS = [
  { flag: '🇺🇸', name: '非農就業數據', time: '今日 21:30', impact: 'high', fc: '+18.0萬' },
  { flag: '🇹🇼', name: '央行理事會', time: '明日 14:00', impact: 'high', fc: '利率 2.0%' },
  { flag: '🇺🇸', name: 'CPI 年增率', time: '12/15 21:30', impact: 'high', fc: '2.7%' },
  { flag: '🇪🇺', name: 'ECB 利率決議', time: '12/18 20:45', impact: 'med', fc: '3.0%' },
];

window.MW_DATA = { SYMBOLS, TICKER, NEWS, PORTFOLIO, EVENTS };
