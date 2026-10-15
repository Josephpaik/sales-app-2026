MSection is the mobile counterpart of a pane: a white `radius-12` block inset `space-10`/`space-12` on the `bg` ground, with an `m-section-title` row.

Source: `.m-section`, `.m-section-title`, `.m-kpis`, `.m-kpi` in `src/styles.css`.

- **Consumer provides** a title (plus optional right-side extra) and content; dashboard widgets placed in a section get `0 space-12 space-12` margins automatically and collapse to one or two columns.
- `m-kpis` sits above sections: 2 columns on a phone, 4 from `bp-tablet`.
- Lists inside use `m-list-item-sub` (`caption`, `ink-muted`) for the sub-line and `m-list-item-amt` (`amount`) for the right-hand figure.
