import React from 'react';

/**
 * MarketWatch Card — the surface container behind every panel and row.
 * `inset` uses surface-2 (sub-panels); `glass` blurs translucent chrome.
 * `interactive` adds the hover-lift used by list rows.
 */
export function Card({
  children,
  inset = false,
  glass = false,
  interactive = false,
  padding = 14,
  style = {},
  ...rest
}) {
  const [hover, setHover] = React.useState(false);

  const bg = glass ? 'var(--glass)' : inset ? 'var(--surface-2)' : 'var(--surface)';

  return (
    <div
      onMouseEnter={() => interactive && setHover(true)}
      onMouseLeave={() => interactive && setHover(false)}
      style={{
        background: bg,
        borderRadius: 'var(--r-sm)',
        border: `1px solid ${glass ? 'rgba(255,255,255,.5)' : 'var(--border)'}`,
        boxShadow: hover ? 'var(--sh-md)' : 'var(--sh)',
        padding,
        transform: hover ? 'translateY(-2px)' : 'none',
        transition: 'all var(--dur-base) var(--ease)',
        backdropFilter: glass ? 'blur(32px) saturate(200%)' : 'none',
        WebkitBackdropFilter: glass ? 'blur(32px) saturate(200%)' : 'none',
        cursor: interactive ? 'pointer' : 'default',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
