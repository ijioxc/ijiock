import * as React from 'react';

export interface QuoteChangeProps {
  /** Last price. */
  price?: number | string;
  /** Percent change (drives sign/color when `change` is absent). */
  changePct?: number;
  /** Absolute change (preferred sign source). */
  change?: number;
  /** @default "md" — lg for chart headers, sm for table rows */
  size?: 'sm' | 'md' | 'lg';
  /** @default "right" */
  align?: 'left' | 'right';
  /** Hide the price, show only the change %. */
  showPrice?: boolean;
  /** Tick flash tint. */
  flash?: 'up' | 'dn' | null;
}

/**
 * Price + change readout, colored RED for up / GREEN for down (Taiwan
 * convention) with ▲/▼ and tabular mono numerics. The workhorse of every
 * watchlist row, ticker and chart header.
 *
 * @startingPoint section="Market" subtitle="Price + change, RED=up GREEN=down" viewport="700x150"
 */
export function QuoteChange(props: QuoteChangeProps): JSX.Element;
