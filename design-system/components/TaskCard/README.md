TaskCard is a clickable count in the 내가 처리할 업무 widget; non-zero counts turn `hot` (`warning`), and clicking jumps to the filtered work.

Source: `.task-grid`, `.task-card` in `src/styles.css`; `src/pages/Dashboard.tsx`, `src/pages/biz/BizHome.tsx`.

- **Consumer provides** label, count and a route. Render as a `<button>` so it's keyboard reachable.
- Add `hot` only when the count is above zero and the item needs action.
- Hover shows a `brand` border. Grid auto-fits columns of at least `task-min`; two columns inside a mobile section.
