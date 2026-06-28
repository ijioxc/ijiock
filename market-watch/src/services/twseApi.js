// src/services/twseApi.js

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5005';

// 簡單記憶體快取
let breadthCache = null;
let lastFetchTime = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * 取得台股大盤漲跌家數
 * 透過我們的 Node 後端 /api/market/breadth
 */
export async function fetchMarketBreadth() {
  const now = Date.now();
  if (breadthCache && now - lastFetchTime < CACHE_TTL) {
    return breadthCache;
  }

  try {
    const res = await fetch(`${API_BASE}/api/market/breadth`);
    if (!res.ok) throw new Error('Backend API Error');
    const data = await res.json();
    
    breadthCache = data;
    lastFetchTime = now;
    return breadthCache;
  } catch (error) {
    console.error('Failed to fetch breadth:', error);
    return { up: 400, down: 400, unchanged: 100 }; // mock fallback
  }
}

