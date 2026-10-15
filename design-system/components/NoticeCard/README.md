NoticeCard lists notices (공지, `notice` rule on `notice-bg`) or library files (자료실, `.r`: `brand` rule on `bg`) in the dashboard.

Source: `.notice-grid`, `.notice-card` in `src/styles.css`; `src/pages/Dashboard.tsx`.

- **Consumer provides** an icon (`NotificationOutlined` / `FolderOpenOutlined`), a bold count line and up to three `.muted` item lines `title · date`.
- Urgent notices get a red `긴급` tag in front of the title.
- This is the one place the source uses a coloured left rule; don't spread it to other cards.
