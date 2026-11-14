// 화면마다 반복되는 공용 스타일 — 맨 위 헤더를 스크롤해도 안 내려가게 고정하는 스타일과,
// 그 헤더의 "← 뒤로" 링크 버튼.
export const stickyHeaderStyle: React.CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 5,
  background: "var(--bg)",
  marginInline: -16,
  paddingInline: 16,
  paddingBlock: 10,
};

export const linkStyle: React.CSSProperties = { background: "none", border: "none", color: "var(--fg2)", fontSize: 14, padding: 4 };
