import React, { useState, useRef, useEffect } from 'react';
import { useResearchStore } from '../../store/researchStore';
import { useWatchlistStore } from '../../store/watchlistStore';
import ReactMarkdown from 'react-markdown';

export default function AITab() {
  const selectedTicker = useWatchlistStore((s) => s.selected) || '未選擇標的';
  const chatHistory = useResearchStore((s) => s.chatHistory);
  const isAILoading = useResearchStore((s) => s.isAILoading);
  const askAI = useResearchStore((s) => s.askAI);
  
  const [inputText, setInputText] = useState('');
  const [includeContext, setIncludeContext] = useState(true);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isAILoading]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim() || isAILoading) return;
    askAI(inputText.trim(), selectedTicker);
    setInputText('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 聊天對話區 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {chatHistory.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-3)', marginTop: 'var(--space-5)', fontSize: '14px' }}>
            有什麼我可以幫忙分析的嗎？
          </div>
        )}
        
        {chatHistory.map((msg, idx) => {
          const isUser = msg.role === 'user';
          return (
            <div 
              key={idx} 
              style={{ 
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                padding: '12px 16px',
                borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                backgroundColor: isUser ? 'rgba(255, 255, 255, 0.05)' : 'rgba(40, 40, 40, 0.4)',
                backdropFilter: 'blur(8px)',
                border: isUser ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(255, 255, 255, 0.05)',
                color: 'var(--text-2)',
                fontSize: '14px',
                lineHeight: 1.6,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            >
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          );
        })}
        
        {isAILoading && (
          <div style={{ 
            alignSelf: 'flex-start', 
            padding: '12px 16px', 
            borderRadius: '16px 16px 16px 4px',
            backgroundColor: 'rgba(40, 40, 40, 0.4)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            color: 'var(--text-3)', 
            fontSize: '14px' 
          }}>
            <span className="mono">思考中...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      
      {/* 底部輸入區 */}
      <div style={{ padding: 'var(--space-3) var(--space-4)', borderTop: '1px solid var(--border-subtle)', backgroundColor: 'var(--surface-1)' }}>
        
        {/* Context Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <div 
            onClick={() => setIncludeContext(!includeContext)}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '12px',
              backgroundColor: includeContext ? 'var(--surface-2)' : 'transparent',
              border: includeContext ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              backgroundColor: includeContext ? 'var(--accent)' : 'var(--text-3)' 
            }} />
            <span style={{ fontSize: '11px', color: includeContext ? 'var(--text-2)' : 'var(--text-3)' }}>
              附帶圖表脈絡 (四卡訊號)
            </span>
          </div>
        </div>

        <form onSubmit={handleSend} style={{ position: 'relative' }}>
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isAILoading ? "AI 思考中..." : `向 AI 詢問關於 ${selectedTicker} 的見解...`}
            disabled={isAILoading}
            style={{ 
              width: '100%', 
              padding: '10px 40px 10px 14px', 
              borderRadius: 'var(--radius-sm)', 
              border: '1px solid var(--border-subtle)', 
              backgroundColor: 'rgba(0,0,0,0.2)', 
              color: 'var(--text)', 
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
              opacity: isAILoading ? 0.6 : 1
            }} 
          />
          <button 
            type="submit"
            disabled={isAILoading || !inputText.trim()}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              color: inputText.trim() && !isAILoading ? 'var(--accent)' : 'var(--text-3)',
              cursor: inputText.trim() && !isAILoading ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-sm)',
              transition: 'all 0.2s'
            }}
          >
            {isAILoading ? (
               <div style={{
                  width: '14px', height: '14px', border: '2px solid var(--text-3)', 
                  borderTopColor: 'var(--accent)', borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
               }}>
                 <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
               </div>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5"></line>
                <polyline points="5 12 12 5 19 12"></polyline>
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
