The SOMANSA sales workspace is an internal tool for two kinds of work: field sales on a phone or tablet, where entry has to be fast, and back-office sales management on a PC, where people review a lot of data at once. It is one responsive web app. The PC uses **Ant Design 6** and the phone and tablet use **Ant Design Mobile 5**. Both run on the same navy brand, the same Korean UI copy and the same business rules. Build on what antd already provides, theme it with these tokens, and add only the few workspace patterns described here.

## Content fundamentals

- **Language.** UI copy is Korean. Keep the company's own business terms exactly as they are: 서티 (approval certificate), 직출 (field visit), 포케스팅, 수주, 검수, 매출채권, 추심, HyBoost, TQS, custcd. Write English only for product names and section labels that the source writes in English, such as `WORKSPACE`, `SALES WORKSPACE` and `KPI`.
- **Tone.** Plain and operational. Labels are nouns (`내가 처리할 업무`, `실적 KPI`, `나의 영업 일정`). Empty states are one statement of fact (`이번 주 일정이 없습니다.`, `직출 기록이 없습니다.`). Hints say what an action does (`숫자를 누르면 해당 업무로 이동`). No emoji, no exclamation marks.
- **Separators.** Join related items with a middle dot and spaces, ` · ` (`영업 · 계약 · 납품 · 실적 통합관리`, `SP-2026-0142 · 김영업 · 한빛은행`). Show a path with ` / ` (`SOMANSA / 사업관리 / 매출채권`).
- **Money.** Use the `utils/format` helpers and nothing else: `won` → `38,500,000원`, `eok` → `12.4억`, `manwon` → `4,820만원`, `compact` (억 at 1억 and above, otherwise 만원), `pct` → `75%`. Write counts with `건` (`3건`).
- **Personal data.** Mask by default: phone `010-****-1234`, email `ab***@…`, names `김**`. Unmasking is a logged view. Every data screen says `시연 데이터 · 실데이터 아님` while the data is demo data.
- **Later-phase items.** Label anything outside the current scope `(후속)` and do not accept input for it.

## Visual foundations

**Colour.** There is one hue. `brand` navy marks everything interactive or selected: the primary button, the selected menu item, the active hub tab, chart bars, and the hover border on clickable cards. `brand-dark` is the Sider and the drawer band, and `brand-deeper` sits under sub-menus and code. The page ground is `bg`. Content sits on `surface` panes edged with a 1px `border`. Quiet groupings, such as the summary bar, chips and step cells, use `surface-tint`. A selected table row uses `selected`.

**Text.** Set text in `ink` and secondary text in `ink-2`. Labels above figures use `ink-muted`. `ink-faint` is the source's `.muted` helper colour. It fails AA at 12px, so use it only for hints a user can skip and set real labels in `ink-muted`.

**States** follow the sales pipeline. Done and paid states use `success`, and `success-bg` fills a completed step. Work in progress that needs attention uses `warning` on `warning-bg`. `danger` marks counts that demand action, such as collection targets or unresolved exceptions. `caution` and `neutral` are only for progress-bar strokes. Notices take a 4px `notice` left rule on `notice-bg`. Every state also carries its word (`검수중`, `추심대상`), so colour is never the only signal.

**Type.** Use one family, `sans`, which is Pretendard with Apple SD Gothic Neo, Malgun Gothic and Noto Sans KR as fallbacks. Hierarchy comes from weight and size. Figures are 700 (`kpi-value` 22px, `task-value` 20px, `kpi-value-m` 18px). Titles are 700 (`pane-title` 14px, `section-title-m` 13px, `sheet-title` 15px). Body text is `body` 14/22. Labels step down through `caption` 12, `label-xs` 11 and `micro` 10. The wordmark is the only place that uses weight 800 with tracking.

**Spacing** runs on 2px steps from `space-2` to `space-24`, and most of it falls between 6 and 14px. A pane uses `space-14` padding. Cards use `space-10` vertical and `space-12` horizontal padding. Grids use a `space-10` or `space-12` gap. The desktop content area uses `space-20` padding and mobile gutters use `space-16`.

**Radii** grow with the size of the object. Bars use `radius-3`. Mobile tags use `radius-6`. Buttons, inputs, chips, tabs and step cells use `radius-8`, which is the antd `borderRadius` token. Panes and cards use `radius-10`. Mobile sections use `radius-12`. The top corners of a bottom sheet use `radius-14`.

**Depth.** Surfaces are flat. Panes and cards are separated by a `border` hairline on the `bg` ground, not by shadow. The only shadows come from antd's own overlays (Modal, Popover, Popup).

**Interaction.** A clickable card shows a `brand` border on hover. A clickable table row uses `cursor: pointer`, and the selected row is filled with `selected`. Selecting a row changes the URL (`/sales/:id`), so the back button and shared links keep working.

**Layout per device.** The breakpoints are `bp-tablet` 768px and `bp-desktop` 1200px. A phone shows one column and switches between list and detail. A tablet splits into a list of at least `list-pane-min` and a detail column. A desktop shows three or more columns: a Sider of `sider-width`, a list or dashboard, and a filter or detail panel in an antd Splitter. A mobile screen stacks a NavBar of `navbar-height`, the scrolling body and a five-item TabBar: 대시보드, 영업 현황, 사업관리, 고객사, 더보기. Use a bottom sheet for filters, quick entry and activity logging, and a left drawer of `drawer-width` for the full menu. The 사업관리 hub keeps the same tab set on every device so that moving between its menus never changes the screen structure.

**Charts** stay small and inline. Use mini bars in `brand` on an `axis` baseline with `micro` labels, and an antd Progress whose stroke follows the probability thresholds (see `Prob`).

## Iconography

On desktop, use `@ant-design/icons` Outlined icons (`DashboardOutlined`, `FundProjectionScreenOutlined`, `ProjectOutlined`, `TeamOutlined`, `BellOutlined` …). On mobile, use `antd-mobile-icons` Outline icons (`PieOutline`, `UnorderedListOutline`, `AppstoreOutline`, `TeamOutline`, `MoreOutline`). Mobile chrome also uses `MenuOutlined` and `UserOutlined` from the antd set. Use icons at the library's default size, or 18px in bars. Never use emoji as icons.

## Logo

The repository has no logo file. The brand appears as the word **SOMANSA** set in `wordmark` (800, 1px tracking) in `on-dark` on `brand-dark`, with a `wordmark-sub` line beneath it in `on-dark-muted`. When the Sider is collapsed, it shrinks to the letter `S`. Do not draw a mark.

## Not synced

No font files are included, because the app relies on the font installed on the viewer's machine. Previews therefore render in whatever font that machine has. The repository has no logo or icon files. `StatusTag`, `CertTag`, `TaxTag`, `Prob`, `DesktopShell` and `MobileShell` are live: `window.SomansaSales`, built from the app's own source with `npm run build:ds` and run on React 18 in previews. The other components are CSS patterns from `src/styles.css` (`components/bundle.css`). The source has a single light theme.
