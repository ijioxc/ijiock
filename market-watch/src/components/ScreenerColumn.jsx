import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useWatchlistStore } from '../store/watchlistStore';
import { fetchMarketBreadth } from '../services/twseApi';
import { PORTFOLIO_LOGIC } from '../config/portfolioLogic';

// 迷你 Sparkline 元件 (使用 Canvas 取代 SVG 以解決 DOM 過載與效能瓶頸)
function Sparkline({ data, signal }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.length === 0) return;
    
    // Support high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    
    const getX = (i) => (i / (data.length - 1)) * width;
    const getY = (val) => height - ((val - min) / range) * (height - 4) - 2;

    const color = signal === 'up' ? '#26a69a' : '#ef5350';

    // 1. Draw gradient area
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let i = 0; i < data.length; i++) {
      ctx.lineTo(getX(i), getY(data[i]));
    }
    ctx.lineTo(width, height);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, color + '66'); // 40% opacity
    gradient.addColorStop(1, color + '00'); // 0% opacity
    ctx.fillStyle = gradient;
    ctx.fill();

    // 2. Draw line with glow
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      if (i === 0) ctx.moveTo(getX(i), getY(data[i]));
      else ctx.lineTo(getX(i), getY(data[i]));
    }
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    
    // Hardware accelerated glow
    ctx.shadowBlur = 4;
    ctx.shadowColor = color;
    
    ctx.stroke();

  }, [data, signal]);

  if (!data || data.length === 0) return null;

  return <canvas ref={canvasRef} style={{ width: '48px', height: '22px', display: 'block' }} />;
}

export default function ScreenerColumn() {
  // === 統一從 watchlistStore 讀取 ===
  const symbols = useWatchlistStore((s) => s.symbols);
  const selected = useWatchlistStore((s) => s.selected);
  const setSelected = useWatchlistStore((s) => s.setSelected);
  const quotes = useWatchlistStore((s) => s.quotes);
  const priceHistory = useWatchlistStore((s) => s.priceHistory);
  const addSymbol = useWatchlistStore((s) => s.addSymbol);
  const removeSymbol = useWatchlistStore((s) => s.removeSymbol);
  const doRefresh = useWatchlistStore((s) => s.doRefresh);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [newTickerInput, setNewTickerInput] = useState('');
  const [breadth, setBreadth] = useState({ up: 0, down: 0, unchanged: 0 });

  useEffect(() => {
    fetchMarketBreadth().then(data => setBreadth(data));
  }, []);

  // 把 symbols + quotes + priceHistory 組合成統一的顯示資料
  const watchlist = useMemo(() => {
    return symbols.map(sym => {
      const q = quotes[sym.symbol] || {};
      const hist = priceHistory[sym.symbol] || [];
      const changePct = q.changePct ?? 0;
      return {
        symbol: sym.symbol,
        name: sym.name,
        category: sym.category,
        price: q.price ?? 0,
        change: changePct.toFixed(2),
        signal: changePct >= 0 ? 'up' : 'dn',
        priceHistory: hist
      };
    });
  }, [symbols, quotes, priceHistory]);

  // 利用 useMemo 將清單動態分類 (對應 PORTFOLIO_LOGIC.CATEGORIES)
  const groupedWatchlist = useMemo(() => {
    const groups = {};
    Object.keys(PORTFOLIO_LOGIC.CATEGORIES).forEach(key => {
      groups[key] = [];
    });
    
    watchlist.forEach(item => {
      const matchSearch = item.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.name.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return;

      // 依 store 動態判定的 category 分組（無需寫死對照表）
      const key = groups[item.category] !== undefined ? item.category : 'OTHER';
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    
    return groups;
  }, [watchlist, searchTerm]);

  // 合併成一個一維陣列給 J/K 熱鍵使用
  const filteredList = useMemo(() => {
    return Object.values(groupedWatchlist).flat();
  }, [groupedWatchlist]);

  const renderWatchlistItem = (item, categoryData, categoryKey) => {
    const isSelected = selected === item.symbol;
    const stripColor = item.signal === 'up' ? 'var(--up)' : 'var(--dn)';
    const stripColorSoft = item.signal === 'up' ? 'var(--up-soft)' : 'var(--dn-soft)';
    
    return (
      <div 
        key={item.symbol}
        onClick={() => setSelected(item.symbol)}
        className="tcard hoverable"
        style={{ 
          padding: '6px 10px', 
          cursor: 'pointer',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          overflow: 'hidden',
          marginBottom: '1px',
          backgroundColor: isSelected ? 'var(--surface-3)' : 'var(--surface-2)',
          borderColor: isSelected ? 'var(--border-md)' : 'var(--border)',
          boxShadow: isSelected ? `0 0 0 1px ${stripColorSoft}, var(--card-shadow)` : 'var(--card-shadow)',
        }}
      >
        {/* 左側狀態細色條 */}
        <div style={{ 
          position: 'absolute', left: 0, top: '20%', bottom: '20%', width: '3px', 
          backgroundColor: stripColor, 
          borderRadius: '0 4px 4px 0',
          boxShadow: isSelected ? `0 0 8px ${stripColor}` : 'none',
          opacity: isSelected ? 1 : 0.6
        }} />
        
        <div style={{ flex: 1, paddingLeft: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1px' }}>
            <div className="mono" style={{ fontSize: '14px', fontWeight: 600, color: isSelected ? 'var(--text)' : 'var(--text-2)' }}>{item.symbol}</div>
            {/* 顯示類別徽章 */}
            <div style={{ 
              fontSize: '9px', padding: '1px 5px', borderRadius: '3px', 
              backgroundColor: categoryData.color, color: '#000', 
              fontWeight: 800, letterSpacing: '0.5px',
              boxShadow: isSelected ? `0 0 6px ${categoryData.color}` : 'none'
            }}>
              {categoryKey}
            </div>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{item.name}</div>
        </div>

        {/* Sparkline */}
        <div style={{ width: '50px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkline data={item.priceHistory} signal={item.signal} />
        </div>

        <div style={{ textAlign: 'right', flex: 1 }}>
          <div className="mono" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.5px' }}>{item.price.toFixed(2)}</div>
          <div className="mono" style={{ fontSize: '12px', color: stripColor, fontWeight: 500 }}>
            {item.signal === 'up' ? '+' : ''}{item.change}%
          </div>
        </div>
        
        {/* 動態刪除按鈕 */}
        <button 
          onClick={(e) => { e.stopPropagation(); removeSymbol(item.symbol); }}
          style={{ 
            background: 'none', border: 'none',
            padding: '4px', color: 'var(--text-3)', cursor: 'pointer', marginLeft: '8px',
            opacity: isSelected ? 0.8 : 0.2, transition: 'opacity 0.2s'
          }}
          title="移除標的"
        >
          ✕
        </button>
      </div>
    );
  };

  // J/K Highlight Logic
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'j' || e.key === 'k') {
        const currentIndex = filteredList.findIndex(i => i.symbol === selected);
        if (currentIndex === -1 && filteredList.length > 0) {
          setSelected(filteredList[0].symbol);
          return;
        }

        if (e.key === 'j' && currentIndex < filteredList.length - 1) {
          setSelected(filteredList[currentIndex + 1].symbol);
        } else if (e.key === 'k' && currentIndex > 0) {
          setSelected(filteredList[currentIndex - 1].symbol);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredList, selected, setSelected]);

  // 初始觸發一次資料刷新
  useEffect(() => {
    doRefresh();
  }, [doRefresh]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
      
      {/* Search Bar & Add Stock */}
      <div style={{ padding: '10px 12px', flexShrink: 0, borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--surface-3)', backdropFilter: 'var(--blur-md)' }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}>🔍</span>
          <input 
            type="text" 
            placeholder="搜尋代碼或名稱... (Press / to focus)" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              width: '100%', padding: '6px 10px 6px 32px', 
              backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)', 
              borderRadius: '6px', color: 'var(--text)', fontSize: '13px',
              transition: 'all 0.2s', outline: 'none'
            }}
            onFocus={(e) => { e.target.style.backgroundColor = 'var(--input-bg-focus)'; e.target.style.borderColor = 'var(--accent)'; }}
            onBlur={(e) => { e.target.style.backgroundColor = 'var(--input-bg)'; e.target.style.borderColor = 'var(--input-border)'; }}
          />
        </div>
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (newTickerInput.trim()) {
              const ticker = newTickerInput.trim().toUpperCase();
              addSymbol(ticker, ticker, 'TW');
              setNewTickerInput('');
            }
          }}
          style={{ display: 'flex', gap: '8px' }}
        >
          <input 
            type="text" 
            placeholder="輸入標的代碼 (如 2317.TW)..." 
            value={newTickerInput}
            onChange={(e) => setNewTickerInput(e.target.value)}
            style={{ flex: 1, padding: '6px 10px', backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: '6px', color: 'var(--text)', fontSize: '12px', outline: 'none' }}
          />
          <button 
            type="submit"
            className="tcard hoverable"
            style={{ padding: '6px 12px', backgroundColor: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
          >
            加入監控
          </button>
        </form>
      </div>
      
      {/* 列表區 */}
      <div style={{ display: 'flex', flexDirection: 'column', padding: '8px 12px', gap: '12px', flex: 1, overflowY: 'auto' }}>
        
        {Object.entries(groupedWatchlist).map(([key, list]) => {
          if (list.length === 0) return null;
          const category = PORTFOLIO_LOGIC.CATEGORIES[key];
          return (
            <div key={key}>
              <div 
                style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600, letterSpacing: '1px', marginBottom: '4px', paddingLeft: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}
                title={category.logic}
              >
                <span>{category.label}</span>
                <div style={{ height: '1px', flex: 1, background: 'var(--border)' }}></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {list.map(item => renderWatchlistItem(item, category, key))}
              </div>
            </div>
          );
        })}

      </div>

      {/* 底部固定區 - 市場脈搏 (Market Pulse) */}
      <div style={{ 
        padding: '10px 12px', 
        borderTop: '1px solid var(--border)', 
        backgroundColor: 'var(--surface-3)',
        backdropFilter: 'var(--blur-md)',
        flexShrink: 0
      }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>台股市場脈搏</span>
          <span style={{ color: 'var(--text-3)', fontSize: '11px', fontWeight: 400 }}>漲跌家數</span>
        </div>
        
        {/* 漲跌家數比 */}
        <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)' }}>
          <div style={{ width: `${(breadth.up / (breadth.up + breadth.down) * 100) || 50}%`, backgroundColor: 'var(--up)', boxShadow: '0 0 10px var(--up)' }} />
          <div style={{ width: `${(breadth.down / (breadth.up + breadth.down) * 100) || 50}%`, backgroundColor: 'var(--dn)', boxShadow: '0 0 10px var(--dn)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
          <span style={{ color: 'var(--up)' }}>▲ {breadth.up}</span>
          <span style={{ color: 'var(--dn)' }}>▼ {breadth.down}</span>
        </div>

        {/* Heatmap CTA */}
        <button 
          className="tcard hoverable"
          style={{ 
            marginTop: '10px', 
            padding: '8px', 
            width: '100%',
            borderRadius: 'var(--radius-sm)', 
            backgroundColor: 'var(--surface-2)',
            border: '1px solid var(--border)',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text)',
            textAlign: 'center',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => e.target.style.color = 'var(--accent)'}
          onMouseOut={(e) => e.target.style.color = 'var(--text)'}
        >
          <span style={{ fontSize: '16px' }}>🔲</span> 查看板塊熱力圖 
        </button>
      </div>

    </div>
  );
}
