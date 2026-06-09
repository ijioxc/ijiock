Compact action button with the MarketWatch indigo-gradient primary, plus quiet secondary/ghost variants. Use the primary for the one key action on a view (分析, 儲存); ghost for toolbar-level actions.

```jsx
<Button onClick={analyze}>全面分析</Button>
<Button variant="secondary" size="sm">取消</Button>
<Button variant="ghost" icon={<span>＋</span>}>新增標的</Button>
<Button disabled>處理中…</Button>
```

Variants: `primary` (gradient + glow), `secondary` (surface), `ghost` (transparent → accent on hover). Sizes: `sm`, `md`. Props: `icon`, `full`, `disabled`. Lifts 1px on hover, settles on press.
