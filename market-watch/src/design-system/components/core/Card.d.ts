import * as React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Use the surface-2 inset tone (sub-panels, rows). */
  inset?: boolean;
  /** Translucent blurred chrome (nav, modal, toast). */
  glass?: boolean;
  /** Add the hover-lift used by interactive list rows. */
  interactive?: boolean;
  /** Inner padding in px. @default 14 */
  padding?: number;
  children?: React.ReactNode;
}

/**
 * Surface container behind panels, rows and modals. Resting `--sh`; lifts to
 * `--sh-md` when `interactive`. `glass` enables the signature blur.
 */
export function Card(props: CardProps): JSX.Element;
