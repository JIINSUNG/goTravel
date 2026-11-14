// 화면마다 반복되는 공용 스타일 — 맨 위 헤더를 스크롤해도 안 내려가게 고정하는 스타일과,
// 그 헤더의 "← 뒤로" 링크 버튼, 카드·입력칸·버튼.
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

/** 헤더 가운데 제목 — 길면 말줄임. */
export const headerTitleStyle: React.CSSProperties = {
  fontSize: 18,
  margin: 0,
  minWidth: 0,
  flex: 1,
  textAlign: "center",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

export const cardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  padding: 14,
  borderRadius: "var(--radius)",
  border: "1px solid var(--line)",
  background: "var(--card)",
};

export const rowButtonStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  padding: "12px 14px",
  borderRadius: "var(--radius)",
  border: "1px solid var(--line)",
  background: "var(--field)",
  textAlign: "left",
  width: "100%",
};

export const mutedTextStyle: React.CSSProperties = { color: "var(--muted)", fontSize: 12.5 };
