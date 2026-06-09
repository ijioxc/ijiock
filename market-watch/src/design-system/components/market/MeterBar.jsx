import React from 'react';

/**
 * MarketWatch MeterBar — a labelled progress track used inside signal cards
 * and gauges. `zones` paints overbought/oversold bands; `tone` colors the fill
 * (auto: red high / green low when `oscillator`).
 */
export function MeterBar({
  label,
  value,        // 0–100
  display,      // optional formatted value text
  tone = 'accent',
  oscillator = false, // color by zone (>=70 red, <=30 green)
  style = {},
}) {
  const pct = Math.min(100, Math.max(0, value ?? 0));

  let fill = {
    accent: 'var(--accent)',
    up: 'var(--up)',
    dn: 'var(--dn)',
    warn: 'var(--warn)',
  }[tone] || 'var(--accent)';

  if (oscillator) {
    fill = pct >= 70 ? 'var(--dn)' : pct <= 30 ? 'var(--up)' : 'var(--accent)';
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-sans)', ...style }}>
      {label && (
        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)', width: 28, flexShrink: 0, textTransform: 'uppercase' }}>
          {label}
        </span>
      )}
      <div style={{ flex: 1, height: 4, background: 'var(--border-md)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: fill, borderRadius: 4, transition: 'width .4s var(--ease)' }} />
      </div>
      {display != null && (
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-2)', flexShrink: 0, fontFamily: 'var(--font-mono)' }}>
          {display}
        </span>
      )}
    </div>
  );
}
