import React from 'react';

/**
 * MarketWatch Tag — segmented filter chip (`.cat-tab`). Quiet by default,
 * paints surface-3 (or the accent tint) when `active`. For the colored
 * watchlist tag dots pass `dot` with a `color`.
 */
export function Tag({
  children,
  active = false,
  accent = false,
  dot = false,
  color,
  style = {},
  ...rest
}) {
  const [hover, setHover] = React.useState(false);

  if (dot) {
    return (
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: color || 'var(--tag-blue)',
          border: active ? '2px solid #fff' : '2px solid transparent',
          boxShadow: active ? '0 0 0 1px currentColor' : 'none',
          display: 'inline-block',
          cursor: 'pointer',
          flexShrink: 0,
          ...style,
        }}
        {...rest}
      />
    );
  }

  const activeBg = accent ? 'var(--accent-soft)' : 'var(--surface-3)';
  const activeColor = accent ? 'var(--accent)' : 'var(--text)';

  return (
    <button
      type="button"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '3px 9px',
        border: 'none',
        borderRadius: 'var(--r-xs)',
        fontSize: 10,
        fontWeight: 600,
        fontFamily: 'var(--font-sans)',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        background: active ? activeBg : hover ? 'var(--surface-2)' : 'transparent',
        color: active ? activeColor : hover ? 'var(--text-2)' : 'var(--text-3)',
        boxShadow: active && !accent ? 'var(--sh)' : 'none',
        transition: 'all var(--dur-fast) var(--ease)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
