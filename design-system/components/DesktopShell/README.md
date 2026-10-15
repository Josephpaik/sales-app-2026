DesktopShell is the PC frame (≥ `bp-desktop`): a collapsible `brand-dark` Sider of `sider-width`, a white `header-height` header, and `space-20`-padded content split into three or more panes.

Source: `src/layouts/DesktopLayout.tsx`; theme in `src/main.tsx` (Layout `siderBg` brand-dark, Menu dark items `brand-dark`, sub-items `brand-deeper`, selected `brand`). The preview is `window.SomansaSales.DesktopShell`: the same antd Layout, Sider and Menu, built from `NAV_SECTIONS`, but without the router, the store or the role filter.

- **Consumer provides** the route content (`<Outlet/>`); the menu comes from `navForRole(role)`, grouped WORKSPACE · 기준정보 · 관리자.
- Header left: `SOMANSA / <page title>` in `page-title` and the demo-data caption. Right: notification bell (antd `Badge` + `Popover` list) and the user/role switcher.
- Content columns are antd `Splitter` panels (resizable, collapsible): `[조회 조건 | 목록·집계 | 세부내용]` for sales, `[조회 조건 | 마스터 | 360° 뷰]` for customers.
