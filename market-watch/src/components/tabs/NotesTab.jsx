import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useNotesStore } from '../../store/researchStore';
import { useWatchlistStore } from '../../store/watchlistStore';

export default function NotesTab() {
  const selectedTicker = useWatchlistStore((s) => s.selected) || '未選擇標的';
  const notes = useNotesStore((s) => s.notes);
  const setNote = useNotesStore((s) => s.setNote);
  
  const currentNote = notes[selectedTicker]?.text || '';
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(currentNote);

  // 當切換標的時，重設草稿
  useEffect(() => {
    setDraft(notes[selectedTicker]?.text || '');
    setIsEditing(false);
  }, [selectedTicker, notes]);

  const handleSave = () => {
    setNote(selectedTicker, draft);
    setIsEditing(false);
  };

  // 將 #tag 轉換為可以點擊的 span (這裡用簡單的正則表示式在 ReactMarkdown 之外處理，或使用 custom components)
  // 為保持輕量，我們可以直接在 markdown 內文裡加上強調，但若要可點擊，最好自訂渲染。
  // ReactMarkdown 的 components 屬性可以複寫某些標籤
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: 'var(--space-3) var(--space-4)', fontSize: '14px', color: 'var(--text)', borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-2)', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>研究筆記 ({selectedTicker})</span>
        <button 
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          style={{
            background: isEditing ? 'var(--accent)' : 'transparent',
            color: isEditing ? '#000' : 'var(--text-2)',
            border: isEditing ? 'none' : '1px solid var(--border)',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {isEditing ? '儲存' : '編輯'}
        </button>
      </div>
      
      <div style={{ flex: 1, padding: 'var(--space-4)', overflowY: 'auto' }}>
        {isEditing ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`在此輸入關於 ${selectedTicker} 的研究筆記...\n支援 Markdown 語法 (例如：# 大標題, **粗體**, - 列表)\n輸入 #hashtag 來標註重點`}
            style={{
              width: '100%',
              height: '100%',
              resize: 'none',
              background: 'var(--surface-1)',
              color: 'var(--text)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--space-3)',
              fontSize: '14px',
              fontFamily: 'inherit',
              lineHeight: 1.6,
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        ) : (
          <div className="markdown-prose">
            {currentNote ? (
              <ReactMarkdown>{currentNote}</ReactMarkdown>
            ) : (
              <div style={{ color: 'var(--text-3)', fontSize: '14px', textAlign: 'center', marginTop: 'var(--space-5)' }}>
                點擊編輯新增筆記。
              </div>
            )}
          </div>
        )}
      </div>

      {/* 筆記列表視圖 (所有有筆記的標的) */}
      <div style={{ height: '35%', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--surface-1)' }}>
        <div style={{ padding: '8px 16px', fontSize: '12px', color: 'var(--text-3)', background: 'var(--surface-2)', borderBottom: '1px solid var(--border-subtle)' }}>
          所有筆記
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {Object.keys(notes).length > 0 ? (
            Object.keys(notes).map(sym => (
              <div 
                key={sym} 
                className="hoverable"
                style={{ 
                  padding: '8px 12px', 
                  borderRadius: 'var(--radius-sm)', 
                  marginBottom: '4px',
                  display: 'flex', 
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }}
              >
                <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '13px' }}>{sym}</span>
                <span style={{ color: 'var(--text-3)', fontSize: '11px' }}>
                  {new Date(notes[sym].lastEdited).toLocaleDateString()}
                </span>
              </div>
            ))
          ) : (
            <div style={{ color: 'var(--text-3)', fontSize: '12px', textAlign: 'center', marginTop: '16px' }}>
              尚無任何筆記
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
