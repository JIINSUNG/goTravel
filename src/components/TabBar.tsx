// 하단 고정 탭바 — 안으로 들어간 화면(여행 상세·장소 편집 등)에서는 숨기고 최상위 화면에서만 보여준다.
export type TabKey = "trips" | "map" | "settings";

const TABS: [TabKey, string, string][] = [
  ["trips", "🧳", "여행"],
  ["map", "🗺️", "지도"],
  ["settings", "⚙️", "설정"],
];

export const TAB_BAR_HEIGHT = 58;

export function TabBar({ tab, onChange }: { tab: TabKey; onChange: (tab: TabKey) => void }) {
  return (
    <nav
      aria-label="메뉴"
      style={{
        flexShrink: 0,
        background: "var(--card)",
        borderTop: "1px solid var(--line)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div
        style={{
          maxWidth: 480,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: `repeat(${TABS.length}, 1fr)`,
          height: TAB_BAR_HEIGHT,
          paddingInline: 8,
        }}
      >
        {TABS.map(([key, icon, label]) => (
          <button
            key={key}
            type="button"
            aria-current={tab === key ? "page" : undefined}
            onClick={() => onChange(key)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              background: "none",
              border: "none",
              fontSize: 11,
              fontWeight: tab === key ? 700 : 500,
              color: tab === key ? "var(--accent)" : "var(--muted)",
            }}
          >
            <span style={{ fontSize: 19, lineHeight: 1 }}>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
