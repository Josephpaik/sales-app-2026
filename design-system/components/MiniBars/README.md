MiniBars is the inline bar chart used in statistics widgets: `brand` bars with `radius-3` tops on an `axis` baseline, `micro` labels underneath.

Source: `.mini-bars` in `src/styles.css`; `src/pages/biz/StatsPage.tsx`.

- **Consumer provides** one item per period: a height as a percentage of the series max, a short label (`9월`, `2025`) and a `title` tooltip with the exact figures (`9월 수주 1.2억 / 확도가중 8,400만원`).
- Default height `mini-bars-height`; set a smaller inline height for secondary charts.
- One series, one colour. For anything that needs axes, legends or comparison, use a real chart.
