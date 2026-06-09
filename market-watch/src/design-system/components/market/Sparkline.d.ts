import * as React from 'react';

export interface SparklineProps {
  /** Series of prices (oldest → newest). Needs ≥ 2 points. */
  data: number[];
  /** Direction → color. RED up / GREEN down. @default true */
  up?: boolean;
  /** @default 68 */
  width?: number;
  /** @default 36 */
  height?: number;
}

/**
 * Tiny filled trend line for watchlist rows and inline trend cues. Directional
 * color follows the market convention (RED up / GREEN down) and a dot marks
 * the latest point.
 */
export function Sparkline(props: SparklineProps): JSX.Element;
