Square rounded icon button (`.ibtn`) for toolbars and panel headers. Hover lifts it 2px; `active` paints the accent tint for toggled tools (dark-mode, heatmap view, etc).

```jsx
<IconButton title="設定" onClick={open}>⚙</IconButton>
<IconButton active title="熱力圖">⬛</IconButton>
<IconButton size="sm" title="新增">＋</IconButton>
```

Sizes: `md` (30px), `sm` (22px). Pass an inline SVG or glyph as the child.
