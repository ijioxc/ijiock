import React, { useState, useEffect } from 'react';
import { useWatchlistStore } from '../../store/watchlistStore';
import { PORTFOLIO_LOGIC } from '../../config/portfolioLogic';

export default function OpportunityTab() {
  const selectedTicker = useWatchlistStore((s) => s.selected);
  const logicData = PORTFOLIO_LOGIC.METRICS[selectedTicker];
  const [news, setNews] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!selectedTicker) return;
    
    let isMounted = true;
    setIsLoading(true);
    setError(null);
    
    // 真實的去找：透過我們的 news proxy 抓取即時新聞與情報
    const fetchRealData = async () => {
      try {
        const queryName = logicData?.name || selectedTicker;
        // 將核心變數 (Pivot) 也納入搜尋關鍵字，尋找真正有關聯的深度情報
        const searchQuery = `${queryName} ${logicData?.pivot || ''}`.trim();
        const res = await fetch(`/api/news?s=${selectedTicker}&n=${encodeURIComponent(searchQuery)}`);
        
        if (!res.ok) throw new Error('無法取得市場情報');
        const data = await res.json();
        
        if (isMounted) {
          setNews(data || []);
        }
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchRealData();

    return () => {
      isMounted = false;
    };
  }, [selectedTicker, logicData]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 'var(--space-4)', overflowY: 'auto' }}>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <h3 style={{ fontSize: '15px', color: 'var(--text)', marginBottom: '8px' }}>即時市場情報掃描</h3>
        <p style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '16px', lineHeight: '1.5' }}>
          基於您的持倉「{logicData?.name || selectedTicker}」目前的強勢表現與核心變數「{logicData?.pivot || '無'}」，系統已自動抓取最新的真實市場情報與新聞，協助您尋找潛在連動機會。
        </p>

        {isLoading ? (
          <div style={{ color: 'var(--text-3)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="spinner" style={{ 
              width: '12px', height: '12px', 
              border: '2px solid var(--text-3)', 
              borderTopColor: 'var(--accent)', 
              borderRadius: '50%', 
              animation: 'spin 1s linear infinite' 
            }} /> 
            正在從公開資訊源獲取真實數據...
          </div>
        ) : error ? (
          <div style={{ color: 'var(--warn)', fontSize: '13px' }}>
            獲取失敗: {error}
          </div>
        ) : news.length === 0 ? (
          <div style={{ color: 'var(--text-3)', fontSize: '13px' }}>
            目前無相關最新情報。
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {news.map((item, idx) => (
              <a 
                key={idx} 
                href={item.link} 
                target="_blank" 
                rel="noreferrer"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '12px',
                  display: 'block',
                  textDecoration: 'none',
                  transition: 'border-color 0.2s',
                  color: 'inherit',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--accent)', background: 'rgba(82, 168, 255, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                    {item.source}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                    {new Date(item.pubDate).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text)', fontWeight: '500', lineHeight: '1.4' }}>
                  {item.title}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
      {/* 簡單的 CSS Spinner 動畫 */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}
