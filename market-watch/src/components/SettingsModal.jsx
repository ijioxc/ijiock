import React from 'react';
import { createPortal } from 'react-dom';
import { useSettingsStore, useThemeStore } from '../store/uiStore';
import { useWatchlistStore } from '../store/watchlistStore';

const OVERLAY_OPTIONS = [
  { key: 'ma', label: '均線 (MA)' },
  { key: 'bb', label: '布林通道 (BB)' },
  { key: 'sar', label: '拋物線 (SAR)' },
  { key: 'vwap', label: '成交量加權均價 (VWAP)' },
  { key: 'kc', label: '肯特納通道 (KC)' },
  { key: 'lr', label: '線性回歸 (LR)' },
  { key: 'ich', label: '一目均衡表 (Ichimoku)' },
  { key: 'fib', label: '斐波那契 (Fib)' },
  { key: 'pp', label: '樞軸點 (PP)' },
];

export default function SettingsModal() {
  const isSettingsOpen = useSettingsStore(s => s.isSettingsOpen);
  const toggleSettingsModal = useSettingsStore(s => s.toggleSettingsModal);
  const overlays = useSettingsStore(s => s.overlays || {});
  const toggleOverlay = useSettingsStore(s => s.toggleOverlay);
  
  const theme = useThemeStore(s => s.theme);
  const toggleTheme = useThemeStore(s => s.toggleTheme);
  
  const apiKey = useWatchlistStore(s => s.apiKey);
  const setApiKey = useWatchlistStore(s => s.setApiKey);
  const geminiKey = useWatchlistStore(s => s.geminiKey);
  const setGeminiKey = useWatchlistStore(s => s.setGeminiKey);
  const aiProvider = useWatchlistStore(s => s.aiProvider);
  const setAiProvider = useWatchlistStore(s => s.setAiProvider);
  
  if (!isSettingsOpen) return null;

  return createPortal(
    <div 
      style={{ 
        position: 'fixed', inset: 0, zIndex: 9999, 
        backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
      onClick={toggleSettingsModal}
    >
      <div 
        style={{
          width: '500px', maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto',
          backgroundColor: 'var(--bg)', borderRadius: '16px',
          border: '1px solid var(--border)', boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '20px', margin: 0, color: 'var(--text)' }}>全域設定</h2>
          <button 
            onClick={toggleSettingsModal} 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '20px' }}
          >✕</button>
        </div>

        {/* 外觀 */}
        <div>
          <h3 style={{ fontSize: '15px', color: 'var(--text-2)', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>外觀偏好</h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '14px', color: 'var(--text)' }}>深色模式</span>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={theme === 'dark'} 
                onChange={toggleTheme}
                style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--accent)' }}
              />
            </label>
          </div>
        </div>

        {/* 圖表疊加 */}
        <div>
          <h3 style={{ fontSize: '15px', color: 'var(--text-2)', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>圖表進階疊加 (Overlays)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {OVERLAY_OPTIONS.map(opt => (
              <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: 'var(--text)' }}>
                <input 
                  type="checkbox" 
                  checked={!!overlays[opt.key]} 
                  onChange={() => toggleOverlay(opt.key)}
                  style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--accent)' }}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {/* AI 設定 */}
        <div>
          <h3 style={{ fontSize: '15px', color: 'var(--text-2)', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>AI 模型與金鑰</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setAiProvider('gemini')}
                style={{ 
                  flex: 1, padding: '8px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
                  backgroundColor: aiProvider === 'gemini' ? 'var(--accent)' : 'var(--surface-2)',
                  color: aiProvider === 'gemini' ? '#000' : 'var(--text)',
                  border: 'none', fontWeight: aiProvider === 'gemini' ? 600 : 400
                }}
              >Gemini</button>
              <button
                onClick={() => setAiProvider('claude')}
                style={{ 
                  flex: 1, padding: '8px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
                  backgroundColor: aiProvider === 'claude' ? 'var(--accent)' : 'var(--surface-2)',
                  color: aiProvider === 'claude' ? '#000' : 'var(--text)',
                  border: 'none', fontWeight: aiProvider === 'claude' ? 600 : 400
                }}
              >Claude</button>
            </div>
            
            {aiProvider === 'gemini' ? (
              <div>
                <input
                  type="password"
                  placeholder="輸入 Gemini API Key (AIza...)"
                  value={geminiKey || ''}
                  onChange={e => setGeminiKey(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-1)', color: 'var(--text)', boxSizing: 'border-box' }}
                />
              </div>
            ) : (
              <div>
                <input
                  type="password"
                  placeholder="輸入 Claude API Key (sk-ant...)"
                  value={apiKey || ''}
                  onChange={e => setApiKey(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-1)', color: 'var(--text)', boxSizing: 'border-box' }}
                />
              </div>
            )}
          </div>
        </div>

        {/* 底部按鈕 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button 
            onClick={toggleSettingsModal}
            style={{ 
              padding: '8px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
              backgroundColor: 'var(--accent)', color: '#000', border: 'none'
            }}
          >
            完成
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
