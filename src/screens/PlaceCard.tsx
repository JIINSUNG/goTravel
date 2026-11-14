import { useSession } from "../session";
import { deletePlace, findPlace, findTrip } from "../lib/trips";
import { formatWon } from "../lib/format";
import { linkStyle, stickyHeaderStyle } from "../lib/layout";

export function PlaceCard({ id, onBack, onEdit }: { id: string; onBack: () => void; onEdit: (id: string) => void }) {
  const { vault, update } = useSession();
  const place = vault ? findPlace(vault, id) : undefined;
  const trip = vault && place?.tripId ? findTrip(vault, place.tripId) : undefined;

  if (!place) {
    return (
      <main style={{ paddingTop: 16 }}>
        <button type="button" onClick={onBack} style={linkStyle}>
          ← 목록
        </button>
        <p style={{ color: "var(--muted)" }}>이 장소는 이미 지워졌어요.</p>
      </main>
    );
  }

  const remove = () => {
    if (!confirm(`"${place.name}" 기록을 지울까요?`)) return;
    update((v) => deletePlace(v, id));
    onBack();
  };

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 16 }}>
      <div style={{ ...stickyHeaderStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button type="button" onClick={onBack} style={linkStyle}>
          ← 목록
        </button>
        <button type="button" onClick={() => onEdit(id)} style={{ ...linkStyle, color: "var(--accent)" }}>
          수정
        </button>
      </div>

      <div>
        <h1 style={{ fontSize: 20, margin: 0, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {place.name}
          {place.category && (
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--accent)", background: "var(--field)", borderRadius: 999, padding: "2px 8px" }}>{place.category}</span>
          )}
        </h1>
        {place.address && <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13 }}>{place.address}</p>}
        {trip && <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 12.5 }}>🧳 {trip.title}</p>}
        {place.kakaoPlaceUrl && (
          <a href={place.kakaoPlaceUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: "var(--accent)" }}>
            카카오맵에서 보기 →
          </a>
        )}
      </div>

      <div style={gridStyle}>
        {place.visitDate && <InfoRow label="다녀온 날" value={place.visitDate} />}
        {place.openingHours && <InfoRow label="영업시간" value={place.openingHours} />}
        {place.amountSpent != null && <InfoRow label="쓴 돈" value={formatWon(place.amountSpent)} />}
      </div>

      {place.note && (
        <section style={sectionStyle}>
          <h2 style={headingStyle}>느낀 점·했던 일</h2>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{place.note}</p>
        </section>
      )}

      {place.tip && (
        <section style={{ ...sectionStyle, background: "var(--accent)" }}>
          <h2 style={{ ...headingStyle, color: "var(--accent-fg)", opacity: 0.85 }}>💡 꿀팁</h2>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.5, color: "var(--accent-fg)", whiteSpace: "pre-wrap" }}>{place.tip}</p>
        </section>
      )}

      <button type="button" onClick={remove} style={{ background: "none", border: "none", color: "var(--warn)", fontSize: 12.5, alignSelf: "center", marginTop: 6 }}>
        이 장소 지우기
      </button>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ color: "var(--muted)", fontSize: 11.5 }}>{label}</span>
      <span style={{ fontSize: 13.5 }}>{value}</span>
    </div>
  );
}

const gridStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 10, padding: 14, borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--card)" };
const sectionStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: 14,
  borderRadius: "var(--radius)",
  border: "1px solid var(--line)",
  background: "var(--card)",
};
const headingStyle: React.CSSProperties = { fontSize: 14, margin: 0, color: "var(--fg2)" };
