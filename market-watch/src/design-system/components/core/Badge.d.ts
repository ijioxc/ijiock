import * as React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Color tone. @default "neutral" */
  tone?: 'up' | 'dn' | 'warn' | 'accent' | 'neutral';
  /** Show a leading status dot. */
  dot?: boolean;
  /** Animate the dot (blink) — e.g. a LIVE badge. */
  pulse?: boolean;
  children?: React.ReactNode;
}

/**
 * Small status pill. Tones follow the market palette — remember up = red,
 * dn = green. Used for LIVE, session state, alert counts, sentiment tags.
 */
export function Badge(props: BadgeProps): JSX.Element;
