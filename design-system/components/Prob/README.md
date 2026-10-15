Prob shows a sales case's win probability (확도) as a 90px progress bar whose stroke steps with the value.

Source: `Prob` in `src/components/common.tsx` (antd `Progress size="small"`, width 90). Rendered live from the app's code (`window.SomansaSales.Prob`).

- **Consumer provides** `value` (0–100).
- Stroke: ≥ 90 `success`, ≥ 50 `brand`, else `neutral`.
- The same threshold idea is used for TQS/Goldmine quality bars: mapping rate ≥ 80 `success` else `caution`; similarity ≥ 90 `success`, ≥ 70 `caution`, else `danger`.
- Always show the number beside the bar; `caution` and `neutral` are too light to be the only signal.
