FavChip is a shortcut to a menu the user pinned in the 즐겨찾기 widget.

Source: `.fav-row`, `.fav-chip` in `src/styles.css`; options in `FAVORITE_OPTIONS` (`src/nav.tsx`).

- **Consumer provides** a label from `FAVORITE_OPTIONS` and its route; the app appends a 10px `RightOutlined`.
- `surface-tint` with a `border-chip` edge, weight 600; hover `surface-tint-hover`.
- Only for navigation. Filters and selections use antd `Tag.CheckableTag` or antd-mobile `Selector`.
