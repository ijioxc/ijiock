import React from 'react';

/**
 * MarketWatch Sparkline — the tiny area+line trend used in watchlist rows.
 * Colored by direction (RED up / GREEN down). Pass an array of prices.
 */
export function Sparkline({
  data = [],
  up = true,
  width = 68,
  height = 36,
  style = {},
}) {
  const P = 3;
  if (!data || data.length < 2) {
    return <svg width={width} height={height} style={style} />;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => [
    P + (i / (data.length - 1)) * (width - P * 2),
    P + (1 - (v - min) / range) * (height - P * 2),
  ]);
  const poly = pts.map(([x, y]) => `${x},${y}`).join(' ');
  const areaD = `M ${pts[0][0]},${height} ${pts.map(([x, y]) => `L ${x},${y}`).join(' ')} L ${pts[pts.length - 1][0]},${height} Z`;
  const color = up ? 'var(--up)' : 'var(--dn)';
  const fill = up ? 'rgba(255,59,48,.13)' : 'rgba(52,199,89,.13)';
  const [lx, ly] = pts[pts.length - 1];

  return (
    <svg width={width} height={height} style={{ display: 'block', borderRadius: 4, ...style }}>
      <path d={areaD} fill={fill} />
      <polyline points={poly} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="2.5" fill={color} />
    </svg>
  );
}
