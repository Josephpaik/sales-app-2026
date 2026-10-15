StepStrip shows a sales case's lifecycle across the top of its full-screen detail: one cell per stage with a label and the stage's current fact.

Source: `.step-strip` in `src/styles.css`; `src/pages/sales/SalesDetail.tsx`.

- **Consumer provides** ordered stages with a label, a short value (date, status or `-`) and a state: none, `ok` (`success` on `success-bg`), `warn` (`warning` on `warning-bg`), plus `cur` (2px `brand` outline) on the current stage.
- Cells share the width and stop at `step-min`; past that the strip scrolls sideways instead of wrapping.
- The value always states the fact in words; colour alone never says a stage is blocked.
