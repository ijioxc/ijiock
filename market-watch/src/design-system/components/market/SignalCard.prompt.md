Technical-indicator readout card (`.sig-card`) — left accent bar, geometric direction glyph (▲/▼/─) and tinted background. **bull = RED, bear = GREEN.** Drop `MeterBar` rows inside as children.

```jsx
<SignalCard label="MACD" signal="黃金交叉 · 偏多" dir="bull" />
<SignalCard label="RSI(14)" signal="超買 · 偏空" dir="bear">
  <MeterBar label="RSI" value={74} />
</SignalCard>
<SignalCard label="均線" signal="多空交戰" dir="neutral" />
```

Props: `label`, `signal`, `dir` (bull/bear/neutral), `children`.
