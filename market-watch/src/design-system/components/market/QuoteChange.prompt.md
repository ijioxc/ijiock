Price + change readout colored by the **Taiwan convention — RED = up, GREEN = down** — with ▲/▼ arrows and tabular mono numerics. Used in watchlist rows, the ticker, chart headers and command palette.

```jsx
<QuoteChange price={1085.0} changePct={2.36} />
<QuoteChange price={178.42} changePct={-1.14} size="lg" />
<QuoteChange changePct={0.8} showPrice={false} align="left" />
<QuoteChange price={612.5} changePct={1.2} flash="up" />
```

Props: `price`, `changePct`, `change`, `size` (sm/md/lg), `align`, `showPrice`, `flash`. Sign comes from `change` if given, else `changePct`.
