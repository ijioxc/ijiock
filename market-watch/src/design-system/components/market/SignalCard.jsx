import React from 'react';

/**
 * MarketWatch SignalCard — technical-indicator readout.
 * Uses the .tcard glass system: backdrop-filter + card-fill + card-highlight.
 * dir=bull tints up-soft; dir=bear tints dn-soft; neutral stays pure glass.
 * Remember: bull = RED (漲), bear = GREEN (跌).
 */
export function SignalCard({
  label,
  signal,
  dir = 'neutral',
  children,
  style = {},
}) {
  const [hover, setHover] = React.useState(false);

  const map = {
    bull:    { color: 'var(--up)',     bg: 'var(--up-soft)',  border: 'rgba(239,68,68,.30)',   glyph: '▲' },
    bear:    { color: 'var(--dn)',     bg: 'var(--dn-soft)',  border: 'rgba(34,197,94,.30)',   glyph: '▼' },
    neutral: { color: 'var(--text-3)', bg: 'var(--card-fill)',border: null,                    glyph: '─' },
  };
  const t = map[dir] || map.neutral;

  const geoStyle = {
    bull:    { background: 'rgba(239,68,68,.15)',  color: 'var(--up)' },
    bear:    { background: 'rgba(34,197,94,.15)',  color: 'var(--dn)' },
    neutral: { background: 'var(--surface-3)',      color: 'var(--text-3)' },
  }[dir];

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '12px 14px',
        /* glass card base */
        background: dir === 'neutral' ? 'var(--card-fill)' : t.bg,
        backdropFilter: 'var(--card-blur)',
        WebkitBackdropFilter: 'var(--card-blur)',
        border: t.border ? `0.5px solid ${t.border}` : 'var(--card-border)',
        borderRadius: 'var(--radius-card)',
        /* highlight + shadow — card-highlight stacks above shadow */
        boxShadow: hover
          ? 'var(--card-highlight), var(--card-shadow-hover)'
          : 'var(--card-highlight), var(--card-shadow)',
        transform: hover ? 'translateY(var(--hover-lift))' : 'translateY(0)',
        transition: 'transform .42s var(--ease-back), box-shadow .3s var(--ease-out)',
        fontFamily: 'var(--font-sans)',
        ...style,
      }}
    >
      {/* top row: geo glyph + label + signal */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 6, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 900,
          ...geoStyle,
        }}>
          {t.glyph}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: 'var(--text-3)',
            textTransform: 'uppercase', letterSpacing: '.4px',
          }}>
            {label}
          </div>
          <div style={{
            fontSize: 11, fontWeight: 700, marginTop: 2,
            color: dir === 'bull' ? 'var(--up)' : dir === 'bear' ? 'var(--dn)' : 'var(--text)',
          }}>
            {signal}
          </div>
        </div>
      </div>

      {/* optional meter children */}
      {children && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {children}
        </div>
      )}
    </div>
  );
}
