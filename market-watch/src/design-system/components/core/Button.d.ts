import * as React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style. @default "primary" */
  variant?: 'primary' | 'secondary' | 'ghost';
  /** Control height/padding. @default "md" */
  size?: 'sm' | 'md';
  /** Optional leading icon (SVG/glyph node). */
  icon?: React.ReactNode;
  /** Greyed-out, non-interactive. */
  disabled?: boolean;
  /** Stretch to fill the container width. */
  full?: boolean;
  children?: React.ReactNode;
}

/**
 * Primary action button in the MarketWatch system. Primary uses the indigo
 * gradient + glow (reserve for the single key action per view); secondary and
 * ghost are quieter.
 *
 * @startingPoint section="Core" subtitle="Indigo-gradient action button" viewport="700x150"
 */
export function Button(props: ButtonProps): JSX.Element;
