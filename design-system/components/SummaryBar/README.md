SummaryBar is the totals strip above a list: label + bold figure pairs on `surface-tint`, wrapping, `space-18` apart.

Source: `.summary-bar` in `src/styles.css`, used above the sales, contract and receivable tables.

- **Consumer provides** the aggregates of the currently filtered rows (건수 · 매출 · 매입 · 이익 · 확도가중 · 수주잔고 …).
- Label in `ink-2`, figure in `<b>` `ink`; format with the money helpers.
- Recompute on every filter change; it describes what the table shows, not the whole database.
