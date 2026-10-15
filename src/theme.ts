/** antd 테마 — 앱(main.tsx)과 디자인 시스템 번들(design-system/)이 함께 쓴다. 값은 design-system/tokens.json과 일치시킨다. */
export const theme = {
  token: {
    colorPrimary: '#1f3a8a',
    colorInfo: '#1f3a8a',
    borderRadius: 8,
    fontFamily: "'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', system-ui, sans-serif",
  },
  components: {
    Layout: { siderBg: '#141f3f', headerBg: '#ffffff' },
    Menu: { darkItemBg: '#141f3f', darkSubMenuItemBg: '#0f172f', darkItemSelectedBg: '#1f3a8a' },
  },
};
