import * as React from 'react';

export interface TagProps extends React.HTMLAttributes<HTMLElement> {
  /** Selected state. */
  active?: boolean;
  /** When active, use the accent tint instead of the neutral surface. */
  accent?: boolean;
  /** Render as a colored circular watchlist tag dot instead of a chip. */
  dot?: boolean;
  /** Dot color (use a --tag-* token). */
  color?: string;
  children?: React.ReactNode;
}

/**
 * Segmented filter chip (`.cat-tab`) for category / range tabs, and — with
 * `dot` — the colored watchlist tag markers.
 */
export function Tag(props: TagProps): JSX.Element;
