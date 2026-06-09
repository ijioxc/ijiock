Segmented filter chip for category/range/timeframe tabs. Quiet until `active`; pass `accent` for the indigo-tinted selected look (interval tabs). With `dot` it becomes a colored watchlist tag marker.

```jsx
<Tag active>ALL</Tag>
<Tag>美股</Tag>
<Tag accent active>日</Tag>
<Tag dot color="var(--tag-red)" />
```

Props: `active`, `accent`, `dot`, `color`.
