import * as React from 'react';

export interface SignalCardProps {
  /** Indicator name, e.g. "MACD", "RSI(14)", "均線". */
  label: string;
  /** The reading, e.g. "黃金交叉 · 偏多". */
  signal: string;
  /** Direction → accent + glyph + tint. bull = RED, bear = GREEN. @default "neutral" */
  dir?: 'bull' | 'bear' | 'neutral';
  /** Optional meters/bars beneath (e.g. MeterBar rows). */
  children?: React.ReactNode;
}

/**
 * Technical-indicator readout card (`.sig-card`) with a left accent, geometric
 * direction glyph and tinted background. Compose `MeterBar` children for the
 * %K/%D, MACD or progress rows.
 *
 * @startingPoint section="Market" subtitle="Technical signal readout card" viewport="700x200"
 */
export function SignalCard(props: SignalCardProps): JSX.Element;
