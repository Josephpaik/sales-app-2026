WorkflowCard is a stage in 업무 진행 현황: stage name and hint on the left, an outlined `brand` count on the right; clicking filters the sales list by that stage.

Source: `.wf-grid`, `.wf-card`, `.wf-count` in `src/styles.css`.

- **Consumer provides** label, hint, count and the `wf` query key (`/sales?wf=<key>`).
- Three columns on desktop, one inside a mobile section. Hover shows a `brand` border.
