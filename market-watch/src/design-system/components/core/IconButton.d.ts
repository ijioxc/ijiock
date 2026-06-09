import * as React from 'react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** @default "md" — md = 30px, sm = 22px */
  size?: 'sm' | 'md';
  /** Paint with the accent tint (toggled-on state). */
  active?: boolean;
  /** Tooltip + accessible label. */
  title?: string;
  /** Glyph or inline SVG. */
  children?: React.ReactNode;
}

/**
 * Square rounded icon button (`.ibtn`). Holds a single SVG/glyph; used in nav
 * bars, panel headers and watchlist rows.
 */
export function IconButton(props: IconButtonProps): JSX.Element;
