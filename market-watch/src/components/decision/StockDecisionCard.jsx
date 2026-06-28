import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { API_BASE } from '../../config/apiConfig';

function SignalHero({ signal }) {
  const isStrong = signal.state.includes("STRONG") || signal.state.includes("VERY_STRONG");
  const isWeak = signal.state.includes("WEAK");
  
  const color = isStrong ? "var(--up)" : isWeak ? "var(--dn)" : "var(--warn)";
  const bgSoft = isStrong ? "var(--up-soft)" : isWeak ? "var(--dn-soft)" : "var(--warn-soft)";
  const icon = isStrong ? "🚀" : isWeak ? "📉" : "⚖️";

  return (
    <div style={{ 
      background: `linear-gradient(135deg, ${bgSoft} 0%, var(--surface-1) 100%)`,
      border: `1px solid ${bgSoft}`,
      borderLeft: `4px solid ${color}`,
      padding: '12px 16px', 
      borderRadius: '12px', 
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
    }}>
      <div>
        <div style={{ color: 'var(--text-3)', fontSize: '10px', fontWeight: 800, letterSpacing: '1px', marginBottom: '4px' }}>AI 決策訊號</div>
        <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: color, display: 'flex', alignItems: 'center', gap: '8px' }}>
          {icon} {signal.state.replace('_', ' ')}
        </h2>
      </div>
      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text)', lineHeight: 1 }}>{signal.score}</span>
          <span style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 600 }}>/ 100</span>
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-2)', fontWeight: 600, marginTop: '4px', backgroundColor: 'var(--surface-2)', padding: '2px 6px', borderRadius: '4px' }}>
          AI 信心水準: {(signal.confidence * 100).toFixed(0)}%
        </div>
      </div>
    </div>
  );
}

function FactorGauge({ title, value, icon, gradient, bgSoft }) {
  const pct = value * 100;
  return (
    <div style={{ 
      backgroundColor: bgSoft || 'var(--surface-2)', 
      borderRadius: '8px', 
      padding: '10px 12px',
      position: 'relative',
      overflow: 'hidden',
      border: '1px solid var(--border)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '14px' }}>{icon}</span>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-2)' }}>{title}</span>
        </div>
        <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text)' }}>{pct.toFixed(0)}</span>
      </div>
      <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--surface-3)', borderRadius: '3px' }}>
        <div style={{ 
          width: `${pct}%`, 
          height: '100%', 
          background: gradient, 
          borderRadius: '3px',
          transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)'
        }} />
      </div>
    </div>
  );
}

function RiskPanel({ risks, riskScore }) {
  if (!risks || risks.length === 0) return null;
  return (
    <div style={{ 
      backgroundColor: 'var(--dn-soft)', 
      border: '1px solid var(--dn)', 
      padding: '12px', 
      borderRadius: '8px', 
      marginTop: '12px' 
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ color: 'var(--dn)', fontWeight: 800, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>🚨</span> 風險與失效條件
        </div>
        {riskScore > 0 && (
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--dn)', backgroundColor: 'rgba(255,59,48,0.15)', padding: '2px 6px', borderRadius: '4px' }}>
            風險扣分: -{(riskScore * 100).toFixed(0)}
          </div>
        )}
      </div>
      <ul style={{ color: 'var(--text)', fontSize: '12px', margin: 0, paddingLeft: '20px', lineHeight: 1.4 }}>
        {risks.map((risk, idx) => (
          <li key={idx} style={{ marginBottom: idx === risks.length - 1 ? 0 : '4px' }}>{risk}</li>
        ))}
      </ul>
    </div>
  );
}

function NewsCardItem({ item }) {
  const [imageUrl, setImageUrl] = useState(null);
  
  useEffect(() => {
    if (item.link) {
      fetch(`${API_BASE}/api/news-image?url=${encodeURIComponent(item.link)}`)
        .then(res => res.json())
        .then(data => {
          if (data.imageUrl) setImageUrl(data.imageUrl);
        })
        .catch(() => {});
    }
  }, [item.link]);

  let publisher = "即時新聞";
  let titleStr = item.title;
  const splitIdx = item.title.lastIndexOf(' - ');
  if (splitIdx > 0) {
     titleStr = item.title.substring(0, splitIdx);
     publisher = item.title.substring(splitIdx + 3);
  }
  let dateStr = "";
  if (item.pubDate) {
    const d = new Date(item.pubDate);
    if (!isNaN(d.getTime())) {
      dateStr = d.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  }

  return (
    <a href={item.link} target="_blank" rel="noopener noreferrer" style={{
      display: 'flex', gap: '16px', padding: '16px',
      backgroundColor: 'var(--surface-1)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      textDecoration: 'none',
      transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      cursor: 'pointer',
      boxShadow: 'var(--sh)',
      alignItems: 'center'
    }}
    onMouseOver={e => {
      e.currentTarget.style.backgroundColor = 'var(--surface-2)';
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = 'var(--sh-md)';
      e.currentTarget.style.borderColor = 'var(--border-md)';
    }}
    onMouseOut={e => {
      e.currentTarget.style.backgroundColor = 'var(--surface-1)';
      e.currentTarget.style.transform = 'none';
      e.currentTarget.style.boxShadow = 'var(--sh)';
      e.currentTarget.style.borderColor = 'var(--border)';
    }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)', lineHeight: 1.5, marginBottom: '12px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {titleStr}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-3)', fontWeight: 600 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '18px', height: '18px', borderRadius: '4px', backgroundColor: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
              🗞️
            </div>
            <span style={{ color: 'var(--text-2)' }}>{publisher}</span>
          </div>
          <span>{dateStr}</span>
        </div>
      </div>
      {imageUrl && (
        <div style={{ width: '90px', height: '90px', flexShrink: 0, borderRadius: '10px', overflow: 'hidden', backgroundColor: 'var(--surface-3)', border: '1px solid var(--border)' }}>
          <img src={imageUrl} alt="News Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}
    </a>
  );
}

function NewsPanel({ news }) {
  const [page, setPage] = useState(0);
  if (!news || news.length === 0) return null;
  
  const itemsPerPage = 5;
  const maxPage = Math.ceil(news.length / itemsPerPage) - 1;
  const currentNews = news.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

  return (
    <div style={{ marginTop: '24px' }}>
      <div style={{ color: 'var(--text)', fontWeight: 800, fontSize: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>📰</span> 最新中文即時新聞
        </div>
        {news.length > itemsPerPage && (
          <button 
            onClick={() => setPage(p => (p < maxPage ? p + 1 : 0))}
            style={{
              background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)',
              fontSize: '11px', padding: '6px 12px', borderRadius: '16px', cursor: 'pointer',
              fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.background = 'var(--surface-3)'}
            onMouseOut={e => e.currentTarget.style.background = 'var(--surface-2)'}
          >
            ⟳ 換一批 ({page + 1}/{maxPage + 1})
          </button>
        )}
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {currentNews.map((item, idx) => (
          <NewsCardItem key={idx} item={item} />
        ))}
      </div>
    </div>
  );
}

export function StockDecisionCard({ data }) {
  if (!data) return (
    <div style={{ color: 'var(--text-3)', padding: '40px', textAlign: 'center', backgroundColor: 'var(--surface-1)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
      載入 AI 決策大腦中...
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* 頂部標題 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px', padding: '0 4px' }}>
        <div style={{ fontSize: '10px', fontWeight: 800, padding: '4px 8px', backgroundColor: 'var(--surface-2)', color: 'var(--text-2)', borderRadius: '4px', letterSpacing: '1px', border: '1px solid var(--border)', marginLeft: 'auto' }}>
          決策風格: {data.style}
        </div>
      </div>

      {/* 核心訊號 */}
      <SignalHero signal={data.signal} />

      {/* 特徵模組 Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
        <FactorGauge 
          title="趨勢與價格結構" 
          value={data.factors.trend} 
          icon="📈" 
          gradient="linear-gradient(90deg, #32D74B 0%, #30B0C7 100%)"
          bgSoft="var(--surface-1)"
        />
        <FactorGauge 
          title="基本面與成長" 
          value={data.factors.quality} 
          icon="💎" 
          gradient="linear-gradient(90deg, #5E5CE6 0%, #BF5AF2 100%)"
          bgSoft="var(--surface-1)"
        />
        <FactorGauge 
          title="資金與籌碼" 
          value={data.factors.flow} 
          icon="🌊" 
          gradient="linear-gradient(90deg, #0A84FF 0%, #5AC8FA 100%)"
          bgSoft="var(--surface-1)"
        />
        <FactorGauge 
          title="估值水位" 
          value={data.factors.valuation} 
          icon="⚖️" 
          gradient="linear-gradient(90deg, #FF9F0A 0%, #FFD60A 100%)"
          bgSoft="var(--surface-1)"
        />
      </div>

      {/* 風險扣分區 */}
      <RiskPanel risks={data.risk} riskScore={data.factors.risk} />
      
      {/* 新聞區 */}
      <NewsPanel news={data.latestNews} />
    </div>
  );
}
