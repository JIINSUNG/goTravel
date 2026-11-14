import { useSession } from "../session";
import { deletePlace, findPlace, findTrip } from "../lib/trips";
import { formatDay, formatWon } from "../lib/format";
import { cardStyle, headerTitleStyle, linkStyle, stickyHeaderStyle } from "../lib/layout";

export function PlaceCard({ id, onBack, onEdit }: { id: string; onBack: () => void; onEdit: (id: string) => void }) {
  const { vault, update } = useSession();
  const place = vault ? findPlace(vault, id) : undefined;
  const trip = vault && place?.tripId ? findTrip(vault, place.tripId) : undefined;

  if (!place) {
    return (
      <main style={{ paddingTop: 16 }}>
        <button type="button" onClick={onBack} style={linkStyle}>
          ← 뒤로
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

  const hasCoords = place.lat != null && place.lng != null;
  // 카카오맵 공식 링크 형식(map.kakao.com/link/to) — 앱이 깔려 있으면 길찾기로 바로 이어진다.
  const directionsUrl = hasCoords ? `https://map.kakao.com/link/to/${encodeURIComponent(place.name)},${place.lat},${place.lng}` : null;
  const hasInfo = place.visitDate || place.openingHours || place.amountSpent != null;

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 16 }}>
      <div style={{ ...stickyHeaderStyle, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <button type="button" onClick={onBack} style={linkStyle}>
          ← 뒤로
        </button>
        <span style={headerTitleStyle} />
        <button type="button" onClick={() => onEdit(id)} style={{ ...linkStyle, color: "var(--accent)", fontWeight: 600 }}>
          수정
        </button>
      </div>

      <div>
        <h1 style={{ fontSize: 22, margin: 0, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", wordBreak: "keep-all" }}>
          {place.name}
          {place.category && (
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--accent)", background: "var(--field)", borderRadius: 999, padding: "2px 8px" }}>{place.category}</span>
          )}
        </h1>
        {place.address && <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13 }}>{place.address}</p>}
        {trip && <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 12.5 }}>🧳 {trip.title}</p>}
        {(place.kakaoPlaceUrl || directionsUrl) && (
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {place.kakaoPlaceUrl && (
              <a href={place.kakaoPlaceUrl} target="_blank" rel="noreferrer" style={chipLinkStyle}>
                카카오맵에서 보기
              </a>
            )}
            {directionsUrl && (
              <a href={directionsUrl} target="_blank" rel="noreferrer" style={chipLinkStyle}>
                길찾기
              </a>
            )}
          </div>
        )}
      </div>

      {hasInfo && (
        <div style={cardStyle}>
          {place.visitDate && <InfoRow label="다녀온 날" value={formatDay(place.visitDate)} />}
          {place.openingHours && <InfoRow label="영업시간" value={place.openingHours} />}
          {place.amountSpent != null && <InfoRow label="쓴 돈" value={formatWon(place.amountSpent)} />}
        </div>
      )}

      {place.note && (
        <section style={{ ...cardStyle, gap: 8 }}>
          <h2 style={headingStyle}>느낀 점·했던 일</h2>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{place.note}</p>
        </section>
      )}

      {place.tip && (
        <section style={{ ...cardStyle, gap: 8, background: "var(--accent)", border: "none" }}>
          <h2 style={{ ...headingStyle, color: "var(--accent-fg)", opacity: 0.85 }}>💡 꿀팁</h2>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: "var(--accent-fg)", whiteSpace: "pre-wrap" }}>{place.tip}</p>
        </section>
      )}

      {!hasInfo && !place.note && !place.tip && (
        <button type="button" onClick={() => onEdit(id)} style={{ ...cardStyle, alignItems: "center", color: "var(--muted)", fontSize: 13.5, borderStyle: "dashed" }}>
          아직 적어둔 게 없어요. 느낀 점이나 꿀팁을 남겨볼까요?
        </button>
      )}

      <button type="button" onClick={remove} style={{ background: "none", border: "none", color: "var(--warn)", fontSize: 12.5, alignSelf: "center", marginTop: 6, padding: 8 }}>
        이 장소 지우기
      </button>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ color: "var(--muted)", fontSize: 11.5 }}>{label}</span>
      <span style={{ fontSize: 14 }}>{value}</span>
    </div>
  );
}

const headingStyle: React.CSSProperties = { fontSize: 14, margin: 0, color: "var(--fg2)" };
const chipLinkStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--accent)",
  textDecoration: "none",
  padding: "7px 12px",
  borderRadius: 999,
  border: "1px solid var(--line)",
  background: "var(--card)",
};
