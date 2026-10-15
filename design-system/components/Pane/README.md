Pane is the white panel every desktop column, widget and detail sits on: `surface`, 1px `border`, `radius-10`, `space-14` padding.

Source: `.pane`, `.pane-title` in `src/styles.css`; `Box` in `src/pages/Dashboard.tsx`.

- **Consumer provides** a `pane-title` row (title left, optional `.muted` hint or small buttons right) and content.
- Inside an antd `Splitter.Panel` a pane fills the panel height (`.ant-splitter-panel > .pane { height: 100% }`) and scrolls its own content.
- Stack panes with `space-14` between them; don't nest a pane in a pane.
- `.pane.hl` (`highlight` on `highlight-border`) is reserved for the summary block at the top of a sales detail.
- On mobile the same content goes in an `MSection` instead.
