import React from 'react';

/**
 * MarketWatch SignalCard — a technical-indicator readout (`.sig-card`).
 * `dir` of bull/bear/neutral sets the left accent, geometric glyph and tint.
 * Remember: bull = RED, bear = GREEN.
 */
export function SignalCard({
  label,
  signal,
  dir = 'neutral', // 'bull' | 'bear' | 'neutral'
  children,
  style = {},
}) {
  const map = {
    bull: { color: 'var(--up)', soft: 'var(--up-soft)', glyph: '▲' },
    bear: { color: 'var(--dn)', soft: 'var(--dn-soft)', glyph: '▼' },
    neutral: { color: 'var(--text-3)', soft: 'var(--surface-3)', glyph: '─' },
  };
  const t = map[dir] || map.neutral;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '10px 11px',
        background: dir === 'neutral' ? 'var(--surface-2)' : t.soft,
        borderRadius: 'var(--r-sm)',
        borderLeft: `3px solid ${dir === 'neutral' ? 'var(--text-3)' : t.color}`,
        boxShadow: 'var(--sh)',
        fontFamily: 'var(--font-sans)',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 900,
            flexShrink: 0,
            color: t.color,
            background: dir === 'neutral' ? 'var(--surface-3)' : t.soft,
            boxShadow: dir === 'neutral' ? 'none' : `0 0 10px ${t.soft}`,
          }}
        >
          {t.glyph}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.4px' }}>
            {label}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, marginTop: 2, color: dir === 'bull' ? 'var(--up)' : dir === 'bear' ? 'var(--dn)' : 'var(--text)' }}>
            {signal}
          </div>
        </div>
      </div>
      {children && <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{children}</div>}
    </div>
  );
}
