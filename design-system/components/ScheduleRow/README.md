ScheduleRow is one line of 나의 영업 일정: a `selected` date/time block in `brand`, then kind tag, title and a muted context line. VisitRow is the plainer 직출 log line.

Source: `.sched-row`, `.sched-time`, `.visit-row` in `src/styles.css`; `src/pages/Dashboard.tsx`.

- **Consumer provides** date (`MM-DD`), time, kind (미팅 · 제안 · 통화 · 데모 · 기타), title and an optional linked sales case.
- Rows are divided by `border-row`; the text column needs `min-width: 0` so long titles ellipsize instead of widening the widget.
- Empty week: one `.muted` line, `이번 주 일정이 없습니다.`
