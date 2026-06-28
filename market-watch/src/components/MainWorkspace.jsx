import React, { useEffect } from 'react';
import { useLayoutStore, useThemeStore, useSettingsStore } from '../store/uiStore';
import ResearchColumn from './ResearchColumn';
import ScreenerColumn from './ScreenerColumn';
import IntelligenceColumn from './IntelligenceColumn';
import './Layout.css';

export default function MainWorkspace() {
  const focusedColumn = useLayoutStore((s) => s.focusedColumn);
  const setFocusedColumn = useLayoutStore((s) => s.setFocusedColumn);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const toggleSettingsModal = useSettingsStore((s) => s.toggleSettingsModal);

  // 1. 同步深淺色 CSS 變數
  useEffect(() => {
    document.documentElement.setAttribute('data-appearance', theme);
  }, [theme]);

  // 2. 【新增】全局監聽 ESC 鍵來還原版面、以及 Enter / C 切換
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 避免在輸入框中觸發熱鍵
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        if (e.key === 'Escape') {
          document.activeElement.blur();
        }
        return;
      }

      if (e.key === 'Escape') {
        setFocusedColumn(null);
      } else if (e.key === 'Enter') {
        // 如果還沒有聚焦到 B 欄位，按下 Enter 直接聚焦 B 欄位看圖
        if (focusedColumn !== 'B') {
          setFocusedColumn('B');
        }
      } else if (e.key.toLowerCase() === 'c') {
        // 按下 c 切換到情報欄位
        if (focusedColumn !== 'C') {
          setFocusedColumn('C');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedColumn, setFocusedColumn]);

  // 3. 【優化】點擊欄位的邏輯
  const handleColumnClick = (col) => {
    if (focusedColumn === null) {
      // 均分模式下，點擊誰就放大誰
      setFocusedColumn(col);
    } else if (focusedColumn === col) {
      // 點擊已經放大的自己，不作動作（避免重複觸發）
      return; 
    } else {
      // 當已有欄位放大時，點擊其他「被模糊」的欄位，預設行為是「還原全覽」而不是跳過去
      // 這樣可以把其他黯淡的欄位當作「背景遮罩 (Overlay)」來使用
      setFocusedColumn(null);
    }
  };

  return (
    <>
      <div className={`workspace-container ${focusedColumn ? 'has-focus' : ''}`}>
        
        {/* 左側導覽列 (Command Center) */}
        <nav className="nav-sidebar">
          {/* 頂部功能區 */}
          <button className="icon-btn" title="全局搜尋 (Cmd+K)">🔍</button>
          <div style={{ height: 'var(--space-4)' }}></div>
          <button className="icon-btn" title="台股研究" style={{ color: 'var(--accent)' }}>📊</button>
          <button className="icon-btn" title="加密貨幣" style={{ opacity: 0.5 }}>🪙</button>

          <div style={{ flex: 1 }}></div>
          
          {/* 底部設定區 */}
          <div title="API 狀態正常" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--dn)', marginBottom: 'var(--space-4)', boxShadow: '0 0 8px var(--dn)' }}></div>
          <button className="icon-btn" title="切換深淺色" onClick={toggleTheme}>🌓</button>
          <button className="icon-btn" title="全域設定" onClick={toggleSettingsModal}>⚙️</button>
        </nav>

        {/* Column A: 市場全貌 */}
        <div className={`column col-a ${focusedColumn === 'A' ? 'is-focused' : ''}`}>
          <div className="col-header" onClick={() => handleColumnClick('A')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
            <span>市場全貌</span>
            {focusedColumn === 'A' && (
              <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setFocusedColumn(null); }} style={{ padding: '4px', fontSize: '14px' }}>✕</button>
            )}
          </div>
          <div style={{ pointerEvents: focusedColumn === 'A' || focusedColumn === null ? 'auto' : 'none', flex: 1, position: 'relative', overflow: 'hidden' }}>
             <ScreenerColumn />
          </div>
        </div>

        {/* Column B: 深度研究 */}
        <div className={`column col-b ${focusedColumn === 'B' ? 'is-focused' : ''}`}>
          <div className="col-header" onClick={() => handleColumnClick('B')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
            <span>深度研究</span>
            {focusedColumn === 'B' && (
              <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setFocusedColumn(null); }} style={{ padding: '4px', fontSize: '14px' }}>✕</button>
            )}
          </div>
          <div style={{ pointerEvents: focusedColumn === 'B' || focusedColumn === null ? 'auto' : 'none', flex: 1, position: 'relative', overflow: 'hidden' }}>
             <ResearchColumn />
          </div>
        </div>

        {/* Column C: 情報中樞 */}
        <div className={`column col-c ${focusedColumn === 'C' ? 'is-focused' : ''}`}>
          <div className="col-header" onClick={() => handleColumnClick('C')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
            <span>情報中樞</span>
            {focusedColumn === 'C' && (
              <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setFocusedColumn(null); }} style={{ padding: '4px', fontSize: '14px' }}>✕</button>
            )}
          </div>
          <div style={{ pointerEvents: focusedColumn === 'C' || focusedColumn === null ? 'auto' : 'none', flex: 1, position: 'relative', overflow: 'hidden' }}>
             <IntelligenceColumn />
          </div>
        </div>
      </div>
    </>
  );
}
