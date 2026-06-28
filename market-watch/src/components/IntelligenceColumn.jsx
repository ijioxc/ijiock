import React, { useState, useEffect } from 'react';
import { useDecisionStore } from '../store/useDecisionStore';
import { useWatchlistStore } from '../store/watchlistStore';
import { STYLES, extractFeatures, calculateScore } from '../config/scoringEngine';
import { API_BASE } from '../config/apiConfig';

export default function IntelligenceColumn() {
  const selectedTicker = useWatchlistStore((s) => s.selected);
  const setSelected = useWatchlistStore((s) => s.setSelected);
  const addSymbol = useWatchlistStore((s) => s.addSymbol);
  const watchlistSymbols = useWatchlistStore((s) => s.symbols);
  const { shoppingBasket, addToBasket, removeFromBasket, addLog } = useDecisionStore();
  const [radarStocks, setRadarStocks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [marketData, setMarketData] = useState([]);
  const [activeStyleId, setActiveStyleId] = useState('QUALITY');
  const [regime, setRegime] = useState('bull'); // 'bull' or 'bear'
  const [showHelp, setShowHelp] = useState(false);

  const fetchMarketData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/twse/v1/exchangeReport/BWIBBU_ALL');
      if (!res.ok) throw new Error('無法取得上市個股資料');
      
      const data = await res.json();
      
      const parsedData = data.map(stock => ({
        symbol: `${stock.Code}.TW`,
        name: stock.Name,
        pe: parseFloat(stock.PEratio),
        yld: parseFloat(stock.DividendYield),
        pb: parseFloat(stock.PBratio),
        raw: stock
      }));

      setMarketData(parsedData);
      // 初次載入使用 state 的預設值
      await applyFilterAndPick(parsedData, activeStyleId, regime);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 核心！從 Fake Random 改為 Two-pass Filtering
  const applyFilterAndPick = async (dataPool, styleId, currentRegime) => {
    if (!dataPool || dataPool.length === 0) return;

    setIsLoading(true);

    let filteredPool = dataPool;
    if (styleId === 'ETF') {
      filteredPool = dataPool.filter(stock => stock.symbol.startsWith('00'));
    } else {
      filteredPool = dataPool.filter(stock => !stock.symbol.startsWith('00'));
    }

    // 1. 第一階段：前端基礎海選 (用真實的 PE, PB, Yield)
    const scoredData = filteredPool.map(stock => {
      const features = extractFeatures(stock.raw);
      const score = calculateScore(features, styleId, currentRegime);
      return { ...stock, score };
    });

    // 根據基礎分數排名
    scoredData.sort((a, b) => b.score - a.score);
    const topCandidates = scoredData.slice(0, 30);
    // 隨機打亂前 30 名，增加雷達多樣性
    const shuffled = [...topCandidates].sort(() => 0.5 - Math.random());
    const selectedForDeepCheck = shuffled.slice(0, 5); // 只取 5 檔避免 429 Rate Limit

    setRadarStocks([]);

    // 2. 第二階段：後端深度驗證
    try {
      const results = await Promise.all(selectedForDeepCheck.map(async (stock) => {
        try {
          const res = await fetch(`${API_BASE}/api/decision/${stock.symbol}?style=${styleId}`);
          if (res.ok) {
            const decision = await res.json();
            return {
              ...stock,
              score: decision.signal.score, // 覆蓋為真實後端分數
              decisionObject: decision
            };
          }
        } catch (err) {
          console.warn(`Deep check failed for ${stock.symbol}`, err);
        }
        return stock; // 若失敗則退回基礎分數
      }));

      // 依據後端真實分數再次排序
      results.sort((a, b) => b.score - a.score);
      setRadarStocks(results);
    } catch (err) {
      console.error(err);
      setRadarStocks(selectedForDeepCheck); // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEtfData = async () => {
    setIsLoading(true);
    setRadarStocks([]);
    const etfList = watchlistSymbols.filter(s => s.category === 'ETF');
    if (etfList.length === 0) { setIsLoading(false); return; }
    try {
      const results = await Promise.all(etfList.map(async (etf) => {
        try {
          const res = await fetch(`${API_BASE}/api/decision/${etf.symbol}?style=ETF`);
          if (res.ok) {
            const decision = await res.json();
            return { symbol: etf.symbol, name: decision.stock?.name || etf.name, score: decision.signal.score, pe: 0, yld: 0, pb: 0, decisionObject: decision };
          }
        } catch (err) {
          console.warn(`ETF check failed for ${etf.symbol}`, err);
        }
        return { symbol: etf.symbol, name: etf.name, score: 0, pe: 0, yld: 0, pb: 0 };
      }));
      results.sort((a, b) => b.score - a.score);
      setRadarStocks(results.filter(r => r.score > 0));
    } catch (err) {
      console.error('ETF fetch failed', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStyleChange = (styleId) => {
    setActiveStyleId(styleId);
    if (styleId === 'ETF') {
      fetchEtfData();
    } else {
      applyFilterAndPick(marketData, styleId, regime);
    }
  };

  const handleRegimeChange = (newRegime) => {
    setRegime(newRegime);
    applyFilterAndPick(marketData, activeStyleId, newRegime);
  };

  const toggleRegime = () => handleRegimeChange(regime === 'bull' ? 'bear' : 'bull');

  useEffect(() => {
    fetchMarketData();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 'var(--space-2)', padding: 'var(--space-2)' }}>
      
      {/* 1. 上面部分：機會掃描雷達 */}
      <div className="tcard" style={{ flex: '1 1 55%', display: 'flex', flexDirection: 'column', padding: '12px', backgroundColor: 'var(--surface-1)', overflowY: 'visible', minHeight: '380px' }}>
        
        {/* 風格篩選器 Tab 與 刷新按鈕 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '8px' }}>
          
          {/* 左側 Tabs (Models) */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap', overflowX: 'auto', flex: 1, paddingBottom: '2px', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
            {Object.entries(STYLES).map(([id, style]) => (
              <button
                key={id}
                onClick={() => handleStyleChange(id)}
                className="hoverable"
                style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  border: activeStyleId === id ? `1px solid var(--accent)` : `1px solid var(--border)`,
                  background: activeStyleId === id ? 'rgba(82, 168, 255, 0.1)' : 'var(--surface-2)',
                  color: activeStyleId === id ? 'var(--accent)' : 'var(--text-3)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                {style.label}
              </button>
            ))}
          </div>

          {/* 右側：環境選擇器 (Regime), 刷新 與 說明 */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {/* Regime Toggle Button */}
            <button 
              onClick={toggleRegime}
              className="hoverable"
              style={{
                background: 'var(--surface-2)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '26px'
              }}
              title={`目前環境: ${regime === 'bull' ? 'Bull' : 'Bear'} (點擊切換)`}
            >
              {regime === 'bull' ? '🐂' : '🐻'}
            </button>

            {/* Refresh Button */}
            <button 
              onClick={() => {
                if (activeStyleId === 'ETF') {
                  fetchEtfData();
                } else if (marketData.length > 0) {
                  applyFilterAndPick(marketData, activeStyleId, regime);
                } else {
                  fetchMarketData();
                }
              }}
              disabled={isLoading}
              className="hoverable"
              style={{ 
                background: 'transparent', 
                border: '1px solid var(--border)', 
                color: 'var(--text-2)', 
                padding: '4px 8px', 
                borderRadius: '4px', 
                cursor: isLoading ? 'not-allowed' : 'pointer', 
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '26px'
              }}
              title="重抓資料"
            >
              ↻
            </button>

            {/* Help Bubble Button */}
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowHelp(!showHelp)}
                className="hoverable"
                style={{ 
                  background: 'var(--surface-3)', 
                  border: 'none', 
                  color: 'var(--text-2)', 
                  borderRadius: '50%', 
                  cursor: 'pointer', 
                  fontSize: '12px',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: '2px',
                  fontWeight: 'bold'
                }}
              >
                ?
              </button>
              
              {showHelp && (
                <div style={{ 
                  position: 'absolute', 
                  right: 0, 
                  top: '100%', 
                  width: '240px', 
                  background: 'var(--surface-2)', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  zIndex: 100, 
                  fontSize: '12px', 
                  color: 'var(--text-2)', 
                  boxShadow: '0 8px 24px rgba(0,0,0,0.8)', 
                  marginTop: '8px', 
                  border: '1px solid var(--border)' 
                }}>
                  <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--accent)' }}>💡 動態評分引擎指南</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div><b style={{color: 'var(--text)'}}>Style (風格):</b> 決定模型偏好的財務特徵與權重分配（例如 Quality 看重 ROE 與 FCF）。</div>
                    <div><b style={{color: 'var(--text)'}}>🐂/🐻 (環境):</b> 模擬市場多空 Regime，熊市會自動調高防禦性特徵的分數。</div>
                    <div><b style={{color: 'var(--text)'}}>Score (分數):</b> 模型為該股算出的綜合契合度。</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {isLoading && radarStocks.length === 0 ? (
          <div style={{ color: 'var(--text-3)', fontSize: '13px', padding: '20px 0', textAlign: 'center' }}>
            正在透過模型計算全市場標的得分...
          </div>
        ) : error ? (
          <div style={{ color: 'var(--warn)', fontSize: '13px', padding: '20px 0', textAlign: 'center' }}>
            取得資料失敗: {error}
          </div>
        ) : radarStocks.length === 0 ? (
          <div style={{ color: 'var(--text-3)', fontSize: '13px', padding: '20px 0', textAlign: 'center' }}>
            找不到符合的標的。
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
            {radarStocks.map((item, index) => (
              <div 
                key={item.symbol} 
                onClick={() => setSelected(item.symbol)}
                className={`hoverable ${selectedTicker === item.symbol ? 'is-active' : ''}`}
                style={{ 
                  padding: '8px 12px', 
                  backgroundColor: selectedTicker === item.symbol ? 'var(--surface-3)' : 'var(--surface-2)', 
                  borderRadius: '6px', 
                  cursor: 'pointer', 
                  borderLeft: '3px solid var(--accent)',
                  transition: 'all 0.2s',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  minHeight: '48px'
                }}
              >
                {/* 左側：名稱與數據標籤 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>
                      <span style={{ color: 'var(--text-3)', marginRight: '4px', fontSize: '12px' }}>#{index + 1}</span>
                      {item.symbol} {item.name}
                    </div>
                    {/* 模型評分 Badge */}
                    <div style={{ 
                      fontSize: '11px', 
                      fontWeight: 800,
                      color: item.score > 80 ? '#000' : 'var(--text)', 
                      background: item.score > 80 ? 'var(--up)' : 'var(--surface-3)', 
                      padding: '2px 6px', 
                      borderRadius: '4px',
                      border: '1px solid var(--border)'
                    }}>
                      Score: {item.score.toFixed(1)}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {item.pe > 0 && (
                      <span style={{ fontSize: '10px', color: 'var(--text-2)', background: 'var(--surface-1)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                        PE {item.pe}x
                      </span>
                    )}
                    {item.yld > 0 && (
                      <span style={{ fontSize: '10px', color: 'var(--up)', background: 'rgba(38, 166, 154, 0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(38, 166, 154, 0.3)' }}>
                        Yield {item.yld}%
                      </span>
                    )}
                    {item.pb > 0 && (
                      <span style={{ fontSize: '10px', color: 'var(--text-2)', background: 'var(--surface-1)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                        PB {item.pb}x
                      </span>
                    )}
                  </div>
                </div>

                {/* 右側：放入購物籃按鈕 (Human Confirmation Layer) */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    addToBasket(item);
                  }}
                  className="hoverable"
                  style={{ 
                    padding: '6px 12px', 
                    backgroundColor: 'var(--surface-1)', 
                    color: 'var(--text)', 
                    border: '1px solid var(--border)', 
                    borderRadius: '4px', 
                    fontSize: '11px', 
                    fontWeight: 700, 
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                  title="加入籃子待人工確認"
                >
                  確認推薦 +
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. 下面部分：決策購物籃 (Human Confirmation Layer) */}
      <div className="tcard" style={{ flex: '1 1 45%', display: 'flex', flexDirection: 'column', padding: '12px', backgroundColor: 'var(--surface-1)', overflowY: 'auto' }}>
        <h4 style={{ margin: '0 0 10px 0', color: 'var(--text)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--warn)' }}>🛒</span> 決策購物籃 (確認層)
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {shoppingBasket.length === 0 && (
            <div style={{ color: 'var(--text-3)', fontSize: '13px', textAlign: 'center', padding: '24px 0', backgroundColor: 'var(--surface-2)', borderRadius: '6px' }}>
              模型推薦的標的會在這裡等待你的人工確認。
            </div>
          )}
          {shoppingBasket.map(item => (
            <div 
              key={item.symbol} 
              onClick={() => setSelected(item.symbol)}
              className={`hoverable ${selectedTicker === item.symbol ? 'is-active' : ''}`}
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '8px 12px', 
                backgroundColor: selectedTicker === item.symbol ? 'var(--surface-3)' : 'var(--surface-2)', 
                borderRadius: '6px', 
                cursor: 'pointer',
                borderLeft: selectedTicker === item.symbol ? '3px solid var(--text)' : '3px solid transparent',
                transition: 'all 0.2s',
                minHeight: '40px'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text)' }}>{item.symbol} {item.name}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>Model Score: {item.score?.toFixed(1)}</div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { label: '買進', act: '買進', color: 'var(--up)' },
                  { label: '移除', act: '移除', color: 'var(--text-3)' }
                ].map(btn => (
                  <button 
                    key={btn.label} 
                    onClick={(e) => {
                      e.stopPropagation(); // 避免觸發 selectTicker
                      if (btn.act === '移除') {
                        removeFromBasket(item.symbol);
                      } else {
                        addSymbol(item.symbol, item.name, 'TW');
                        addLog('買進', `核准模型推薦 (Score: ${item.score?.toFixed(1)})`, item.symbol);
                        removeFromBasket(item.symbol);
                      }
                    }}
                    className="hoverable"
                    style={{ 
                      padding: '4px 8px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      backgroundColor: 'transparent', 
                      border: `1px solid ${btn.color}`, 
                      color: btn.color, 
                      borderRadius: '4px', 
                      cursor: 'pointer', 
                      fontWeight: 600, 
                      fontSize: '11px'
                    }}
                    title={btn.act}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
