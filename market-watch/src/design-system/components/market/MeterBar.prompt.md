Labelled progress track for indicator readouts (RSI, %K/%D, composite scores). Use inside `SignalCard`. With `oscillator`, the fill auto-colors by zone (≥70 green/down, ≤30 red/up, else accent).

```jsx
<MeterBar label="RSI" value={74} display="74.2" oscillator />
<MeterBar label="%K" value={62} tone="up" />
<MeterBar value={80} tone="warn" />
```

Props: `label`, `value` (0–100), `display`, `tone`, `oscillator`.
