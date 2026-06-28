import React, { useEffect, useRef, useState } from 'react';
import { useResearchStore, useNotesStore } from '../store/researchStore';
import { useDecisionStore } from '../store/useDecisionStore';
import { useWatchlistStore } from '../store/watchlistStore';
import { useLayoutStore, useSettingsStore } from '../store/uiStore';
import { PORTFOLIO_LOGIC } from '../config/portfolioLogic';
import ChartPanel from './ChartPanel';
import { StockDecisionCard } from './decision/StockDecisionCard';

// Removed EngineBlock since we use StockDecisionCard now

export default function ResearchColumn() {
  const { currentTicker, decisionObject, isChartLoading } = useResearchStore();
  const { indicators, fetchData, chartData, timeframe, setTimeframe } = useResearchStore();
  const selectedTicker = useWatchlistStore((s) => s.selected);
  const updateAnalysis = useDecisionStore((s) => s.updateAnalysis);
  const addLog = useDecisionStore((s) => s.addLog);
  const setFocusedColumn = useLayoutStore((s) => s.setFocusedColumn);
  const { overlays, toggleOverlay } = useSettingsStore();
  const [decision, setDecision] = useState(null);
  const [reason, setReason] = useState('');

  const logicData = PORTFOLIO_LOGIC.METRICS[selectedTicker] || { pivot: '無資料', trigger: '無資料' };
  
  useEffect(() => {
    if (selectedTicker) {
      fetchData(selectedTicker);
    }
  }, [selectedTicker, timeframe, fetchData]);

  useEffect(() => {
    if (indicators && chartData) {
      updateAnalysis({ indicators, rawOHLC: chartData });
    }
  }, [indicators, chartData, updateAnalysis]);

  useEffect(() => {
    if (chartData.length === 0 && selectedTicker !== '未選擇標的') {
      fetchData(selectedTicker);
    }
  }, [selectedTicker, chartData.length, fetchData]);
  
  const chartContainerRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    let rAF_ID;
    const observer = new ResizeObserver((entries) => {
      if (rAF_ID) cancelAnimationFrame(rAF_ID);
      rAF_ID = requestAnimationFrame(() => {
        if (!entries || !entries.length) return;
        window.dispatchEvent(new Event('resize'));
      });
    });

    observer.observe(chartContainerRef.current);
    return () => {
      observer.disconnect();
      if (rAF_ID) cancelAnimationFrame(rAF_ID);
    };
  }, []);

  return (
    <div className="hide-scrollbar" style={{ display: 'block', height: '100%', padding: '12px 24px 24px 24px', boxSizing: 'border-box', overflowY: 'auto' }}>
      
      {/* Header 與結論膠囊 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
          <h1 className="heading-xl" style={{ margin: 0, fontSize: '28px', letterSpacing: '-0.5px' }}>
            {decisionObject?.stock?.name || selectedTicker}
          </h1>
          <span style={{ fontSize: '14px', color: 'var(--text-3)', fontWeight: 600 }}>
            {selectedTicker}
          </span>
        </div>
        
        {indicators && (
          <div style={{ textAlign: 'right', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span className="mono" style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', lineHeight: 1 }}>
              {indicators.price?.toFixed(2)}
            </span>
            <span className="mono" style={{ fontSize: '14px', fontWeight: 600, color: indicators.changePercent >= 0 ? 'var(--up)' : 'var(--dn)' }}>
              {indicators.changePercent >= 0 ? '▲' : '▼'}{Math.abs(indicators.changePercent || 0).toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {/* Chart Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
        <div className="segmented-control" style={{ flexShrink: 0, display: 'flex' }}>
          {['15分', '日', '週', '月', '3mo', '1y'].map(tf => (
            <div 
              key={tf} 
              className={`segmented-item ${timeframe === tf ? 'active' : ''}`}
              onClick={() => setTimeframe(tf)}
            >
              {tf}
            </div>
          ))}
        </div>
        
        {/* Quick Overlays (MA, BB, SAR) */}
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          {[
            { key: 'ma', label: 'MA' },
            { key: 'bb', label: 'BB' },
            { key: 'sar', label: 'SAR' }
          ].map(opt => {
            const isActive = !!overlays[opt.key];
            return (
              <div 
                key={opt.key}
                onClick={() => toggleOverlay(opt.key)}
                className="hoverable"
                style={{
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: isActive ? 'var(--accent)' : 'var(--surface-2)',
                  color: isActive ? '#000' : 'var(--text-2)',
                  border: isActive ? '1px solid var(--accent)' : '1px solid var(--border)',
                  transition: 'all 0.2s'
                }}
              >
                {opt.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Chart Panel - 套用 tcard */}
      <div 
        ref={chartContainerRef}
        className="tcard"
        style={{ 
          height: '240px',
          flexShrink: 0,
          marginBottom: '24px', 
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ height: '240px', backgroundColor: 'var(--surface-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <ChartPanel symbol={selectedTicker} />
        </div>
      </div>


      {/* Decision Compressor Card */}
      <StockDecisionCard data={decisionObject} />
    </div>
  );
}
