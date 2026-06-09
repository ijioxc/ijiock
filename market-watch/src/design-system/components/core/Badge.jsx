import React from 'react';

/**
 * MarketWatch Badge — small pill label. Tones map to the market palette:
 * up (red), dn (green), warn (amber), accent (indigo), neutral (grey).
 * `dot` prepends a status dot; `pulse` animates it (e.g. LIVE).
 */
export function Badge({
  children,
  tone = 'neutral',
  dot = false,
  pulse = false,
  style = {},
  ...rest
}) {
  const tones = {
    up:      { color: 'var(--up)',     bg: 'var(--up-soft)' },
    dn:      { color: 'var(--dn)',     bg: 'var(--dn-soft)' },
    warn:    { color: 'var(--warn)',   bg: 'var(--warn-soft)' },
    accent:  { color: 'var(--accent)', bg: 'var(--accent-soft)' },
    neutral: { color: 'var(--text-2)', bg: 'var(--surface-3)' },
  };
  const t = tones[tone] || tones.neutral;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 9px',
        borderRadius: 'var(--r-pill)',
        fontSize: 10,
        fontWeight: 700,
        fontFamily: 'var(--font-sans)',
        lineHeight: 1.4,
        color: t.color,
        background: t.bg,
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...rest}
    >
      {dot && (
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: 'currentColor',
            flexShrink: 0,
            animation: pulse ? 'mw-blink 2s infinite' : 'none',
          }}
        />
      )}
      {children}
      <style>{`@keyframes mw-blink{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.7)}}`}</style>
    </span>
  );
}
