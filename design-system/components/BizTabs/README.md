BizTabs is the single tab set of the 사업관리 hub, identical on every device so moving between its menus never changes the screen structure.

Source: `.biz-tabs`, `.biz-tab`, `.m-biz-tabs` in `src/styles.css`; tab list `BIZ_TABS` in `src/nav.tsx`.

- **Consumer provides** nothing but the current route; tabs come from `BIZ_TABS` (`label` on PC, `short` on mobile).
- Active tab: `brand` fill, `on-dark` text. Inactive: `ink-2`, weight 600.
- Mobile: one scrolling row, sticky at the top of the body, inactive tabs on `surface-tint`.
- Don't add hub screens as separate menu items; add a tab.
