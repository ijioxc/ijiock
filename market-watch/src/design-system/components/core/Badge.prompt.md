Small status pill. Tones map to the market palette (up=red, dn=green, warn=amber, accent=indigo, neutral=grey). Optional leading `dot`, with `pulse` for a live indicator.

```jsx
<Badge tone="dn" dot pulse>LIVE</Badge>
<Badge tone="warn">⚠ 3 個警示</Badge>
<Badge tone="up" dot>正盤</Badge>
<Badge tone="accent">盤前</Badge>
```

Keep copy to 1–4 chars / one short word. For directional change values use `QuoteChange` instead.
