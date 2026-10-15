MobileShell is the phone/tablet frame (< `bp-desktop`): a white NavBar of `navbar-height`, the scrolling body on `bg`, and a five-item TabBar; the full menu opens as a left drawer.

Source: `src/layouts/MobileLayout.tsx` (antd-mobile `NavBar`, `TabBar safeArea`, `Popup`). The preview is `window.SomansaSales.MobileShell`: the real antd-mobile NavBar and TabBar with `antd-mobile-icons`. It has no drawer and no router.

- **Consumer provides** the route content. NavBar left: menu icon, or a back arrow on a detail route; right: user icon opening the role-switch bottom sheet.
- Tabs: 대시보드 · 영업 현황 · 사업관리 · 고객사 · 더보기 (opens the drawer). Active tab in `brand`.
- Drawer: `drawer-width`, a `brand-dark` band with the wordmark (`SALES WORKSPACE · 현장용`), then the role's menu sections as lists.
- Bottom sheets (filters, quick entry, activity log): `radius-14` top corners, `sheet-title` then `sheet-body` with `space-16` gutters, max 70dvh.
- Tablet (≥ `bp-tablet`): body splits into a list column `minmax(list-pane-min, 38%)` on `surface` and a detail column on `bg`.
- Phone fields: essentials only, big touch targets (`Selector` chips, `Stepper`), `tel:` links on masked numbers.
