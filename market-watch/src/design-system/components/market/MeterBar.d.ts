import * as React from 'react';

export interface MeterBarProps {
  /** Short leading label (e.g. "RSI", "%K"). */
  label?: string;
  /** Fill amount, 0–100. */
  value: number;
  /** Optional formatted value shown at the end (e.g. "74.2"). */
  display?: string | number;
  /** Fill color. @default "accent" */
  tone?: 'accent' | 'up' | 'dn' | 'warn';
  /** Auto-color by oscillator zone: ≥70 green-down, ≤30 red-up, else accent. */
  oscillator?: boolean;
}

/**
 * Labelled progress track for indicator readouts (RSI, %K/%D, composite
 * meters). Use inside `SignalCard`. With `oscillator`, the fill auto-colors by
 * overbought/oversold zone.
 */
export function MeterBar(props: MeterBarProps): JSX.Element;
