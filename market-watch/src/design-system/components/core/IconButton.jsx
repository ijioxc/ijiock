import React from 'react';

/**
 * MarketWatch IconButton — the square, rounded `.ibtn` used across nav bars
 * and panel headers. Lifts on hover; `active` paints it with the accent tint.
 */
export function IconButton({
  children,
  size = 'md',
  active = false,
  title,
  style = {},
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const dim = size === 'sm' ? 22 : 30;
  const radius = size === 'sm' ? 7 : 9;

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: dim,
        height: dim,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        border: 'none',
        borderRadius: radius,
        cursor: 'pointer',
        fontSize: size === 'sm' ? 14 : 15,
        fontFamily: 'var(--font-sans)',
        background: active ? 'var(--accent-soft)' : hover ? 'var(--surface-3)' : 'var(--surface)',
        color: active ? 'var(--accent)' : hover ? 'var(--text)' : 'var(--text-2)',
        boxShadow: 'var(--sh)',
        transform: hover && !active ? 'translateY(-2px)' : 'none',
        transition: 'all var(--dur-base) var(--ease)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
