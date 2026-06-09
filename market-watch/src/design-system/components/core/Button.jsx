import React from 'react';

/**
 * MarketWatch Button — Apple-OS styled action button.
 * Variants: primary (indigo, glow), secondary (surface), ghost (transparent).
 * Sizes: sm | md. Supports leading icon and disabled state.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon = null,
  disabled = false,
  full = false,
  style = {},
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);

  const pad = size === 'sm' ? '6px 12px' : '9px 16px';
  const fontSize = size === 'sm' ? 12 : 13;

  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: full ? '100%' : 'auto',
    padding: pad,
    fontSize,
    fontWeight: 700,
    fontFamily: 'var(--font-sans)',
    borderRadius: 'var(--r-sm)',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    transition: 'all var(--dur-base) var(--ease)',
    transform: press && !disabled ? 'translateY(0) scale(.985)' : hover && !disabled ? 'translateY(-1px)' : 'none',
    whiteSpace: 'nowrap',
    lineHeight: 1.4,
  };

  const variants = {
    primary: {
      background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
      color: '#fff',
      boxShadow: hover && !disabled
        ? '0 4px 18px rgba(99,102,241,.5)'
        : '0 2px 10px rgba(99,102,241,.4)',
    },
    secondary: {
      background: hover && !disabled ? 'var(--surface-3)' : 'var(--surface-2)',
      color: 'var(--text)',
      boxShadow: 'var(--sh)',
    },
    ghost: {
      background: hover && !disabled ? 'var(--accent-soft)' : 'transparent',
      color: hover && !disabled ? 'var(--accent)' : 'var(--text-2)',
      boxShadow: 'none',
    },
  };

  return (
    <button
      type="button"
      disabled={disabled}
      style={{ ...base, ...variants[variant], ...style }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      {...rest}
    >
      {icon && <span style={{ display: 'inline-flex', fontSize: fontSize + 2 }}>{icon}</span>}
      {children}
    </button>
  );
}
