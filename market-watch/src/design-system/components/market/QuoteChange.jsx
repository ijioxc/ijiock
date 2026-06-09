import React from 'react';

/**
 * MarketWatch QuoteChange — a price + directional change, colored by the
 * Taiwan convention (RED = up, GREEN = down). Renders ▲/▼ and tabular mono
 * numerics. `flash` briefly tints the background on a tick.
 */
export function QuoteChange({
  price,
  changePct,
  change,
  size = 'md',
  align = 'right',
  showPrice = true,
  flash = null, // 'up' | 'dn' | null
  style = {},
}) {
  const up = (change ?? changePct ?? 0) >= 0;
  const color = up ? 'var(--up)' : 'var(--dn)';
  const arrow = up ? '▲' : '▼';

  const priceSize = size === 'lg' ? 22 : size === 'sm' ? 12 : 15;
  const chgSize = size === 'lg' ? 13 : size === 'sm' ? 10 : 11;

  const flashBg = flash === 'up' ? 'var(--up-soft)' : flash === 'dn' ? 'var(--dn-soft)' : 'transparent';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: align === 'right' ? 'flex-end' : 'flex-start',
        fontFamily: 'var(--font-mono)',
        fontVariantNumeric: 'tabular-nums',
        ...style,
      }}
    >
      {showPrice && price != null && (
        <span
          style={{
            fontSize: priceSize,
            fontWeight: 800,
            color,
            letterSpacing: '-.3px',
            padding: '1px 4px',
            borderRadius: 4,
            background: flashBg,
            transition: 'background .65s ease-out',
          }}
        >
          {typeof price === 'number' ? price.toFixed(2) : price}
        </span>
      )}
      {changePct != null && (
        <span style={{ fontSize: chgSize, fontWeight: 700, color }}>
          {arrow}{Math.abs(changePct).toFixed(2)}%
        </span>
      )}
    </div>
  );
}
