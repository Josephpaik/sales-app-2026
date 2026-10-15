KpiCard shows one headline figure with a label above and a `brand` sub-line below; a row of them auto-fits columns of at least `kpi-min`.

Source: `.kpi-row`, `.kpi .l/.v/.s` in `src/styles.css`. Pages that need a red count use antd `Statistic` with `danger` instead.

- **Consumer provides** label, formatted value (`compact`/`eok`/`won`, or `N건`) and an optional sub-line.
- Value is `kpi-value` (22px), reduced to 18px inside dashboard widgets.
- Use only for the few figures the screen is about; long lists of numbers belong in the `SummaryBar` or a table's summary row.
