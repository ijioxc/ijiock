import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useWatchlistStore } from '../../store/watchlistStore';
import { askGemini } from '../../api/gemini';

export default function IntelligenceTab() {
  const selectedTicker = useWatchlistStore((s) => s.selected);
  const [infoText, setInfoText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deduction, setDeduction] = useState(null);

  const handleAnalyze = async () => {
    if (!infoText.trim()) return;
    setIsLoading(true);
    
    const { geminiKey } = useWatchlistStore.getState();
    if (!geminiKey) {
       setDeduction('⚠️ 尚未設定 Gemini API Key，請先在左下角設定中輸入。');
       setIsLoading(false);
       return;
    }

    try {
      const systemPrompt = `你是一位專業的台灣股市與全球金融市場投資顧問。使用者會提供一則市場情報，請你推演這則情報對標的 ${selectedTicker} 的潛在連動影響。請用「紅軍關聯推演」的角度，點出可能的風險、利空或利多，並給出一個「證偽條件」。`;
      
      const reply = await askGemini({
        apiKey: geminiKey,
        messages: [{ role: 'user', text: `情報內容：「${infoText}」` }],
        system: systemPrompt
      });
      
      setDeduction(reply);
      setInfoText('');
    } catch (err) {
      setDeduction(`❌ 推演失敗: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 'var(--space-4)' }}>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <h3 style={{ fontSize: '15px', color: 'var(--text)', marginBottom: '8px' }}>情報輸入與關聯推演</h3>
        <p style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '16px' }}>貼上市場新聞或財報片段，讓 AI 推演對 {selectedTicker} 的潛在連動影響。</p>
        
        <textarea 
          value={infoText}
          onChange={(e) => setInfoText(e.target.value)}
          placeholder="例如：晶圓代工龍頭傳出調漲代工價格 10%..."
          style={{
            width: '100%',
            height: '100px',
            padding: '12px',
            borderRadius: '8px',
            background: 'var(--surface-2)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text)',
            fontSize: '14px',
            resize: 'none',
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
        
        <div style={{ textAlign: 'right', marginTop: '8px' }}>
          <button 
            onClick={handleAnalyze}
            disabled={!infoText.trim() || isLoading}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              background: 'var(--text)',
              color: 'var(--bg)',
              fontWeight: 600,
              border: 'none',
              cursor: !infoText.trim() || isLoading ? 'default' : 'pointer',
              opacity: !infoText.trim() || isLoading ? 0.5 : 1
            }}
          >
            {isLoading ? '推演中...' : '進行推演'}
          </button>
        </div>
      </div>
      
      {deduction && (
        <div style={{
          flex: 1,
          overflowY: 'auto',
          background: 'rgba(40, 40, 40, 0.4)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          padding: '16px',
          color: 'var(--text-2)',
          fontSize: '14px',
          lineHeight: 1.6
        }}>
          <ReactMarkdown>{deduction}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
