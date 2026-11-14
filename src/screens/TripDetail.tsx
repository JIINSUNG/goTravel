import { useState } from "react";
import { useSession } from "../session";
import { deleteTrip, findTrip, placesForTrip, tripTotalSpent, updateTrip } from "../lib/trips";
import { formatWon } from "../lib/format";
import { linkStyle, stickyHeaderStyle } from "../lib/layout";

export function TripDetail({ id, onBack, onAddPlace, onOpenPlace }: { id: string; onBack: () => void; onAddPlace: (tripId: string) => void; onOpenPlace: (id: string) => void }) {
  const { vault, update } = useSession();
  const trip = vault ? findTrip(vault, id) : undefined;
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(trip?.title ?? "");
  const [region, setRegion] = useState(trip?.region ?? "");
  const [startDate, setStartDate] = useState(trip?.startDate ?? "");
  const [endDate, setEndDate] = useState(trip?.endDate ?? "");

  if (!trip) {
    return (
      <main style={{ paddingTop: 16 }}>
        <button type="button" onClick={onBack} style={linkStyle}>
          ← 목록
        </button>
        <p style={{ color: "var(--muted)" }}>이 여행은 이미 지워졌어요.</p>
      </main>
    );
  }

  const places = vault ? placesForTrip(vault, id) : [];
  const spent = vault ? tripTotalSpent(vault, id) : 0;

  const saveEdit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    update((v) => updateTrip(v, id, { title: trimmed, region: region.trim() || undefined, startDate: startDate || undefined, endDate: endDate || undefined }));
    setEditing(false);
  };

  const removeTrip = () => {
    if (!confirm(`"${trip.title}" 여행을 지울까요? 묶인 장소들은 그대로 남아요.`)) return;
    update((v) => deleteTrip(v, id));
    onBack();
  };

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 16 }}>
      <div style={{ ...stickyHeaderStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button type="button" onClick={onBack} style={linkStyle}>
          ← 목록
        </button>
        <h1 style={{ fontSize: 18, margin: 0 }}>{trip.title}</h1>
        <button type="button" onClick={() => setEditing((e) => !e)} style={{ ...linkStyle, color: "var(--accent)" }}>
          {editing ? "닫기" : "수정"}
        </button>
      </div>

      {editing && (
        <div style={sectionStyle}>
          <label style={fieldStyle}>
            <span>제목</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
          </label>
          <label style={fieldStyle}>
            <span>여행지 (선택)</span>
            <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="예: 일본 오사카" style={inputStyle} />
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <label style={{ ...fieldStyle, flex: 1 }}>
              <span>시작일</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
            </label>
            <label style={{ ...fieldStyle, flex: 1 }}>
              <span>종료일</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
            </label>
          </div>
          <button type="button" onClick={saveEdit} disabled={!title.trim()} style={primaryBtnStyle}>
            저장
          </button>
        </div>
      )}

      <div style={sectionStyle}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>{places.length}곳 기록</span>
          {spent > 0 && <span style={{ color: "var(--muted)", fontSize: 13 }}>총 {formatWon(spent)}</span>}
        </div>
        <button type="button" onClick={() => onAddPlace(id)} style={primaryBtnStyle}>
          + 이 여행에 장소 추가
        </button>
      </div>

      {places.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: 13.5, textAlign: "center", marginTop: 20 }}>아직 기록한 장소가 없어요.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[...places]
            .sort((a, b) => (a.visitDate ?? "").localeCompare(b.visitDate ?? ""))
            .map((p) => (
              <button key={p.id} type="button" onClick={() => onOpenPlace(p.id)} style={placeRowStyle}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <b style={{ fontSize: 14.5 }}>{p.name}</b>
                  <span style={{ color: "var(--muted)", fontSize: 12 }}>{[p.category, p.visitDate].filter(Boolean).join(" · ")}</span>
                </div>
                {p.amountSpent ? <span style={{ color: "var(--muted)", fontSize: 12.5 }}>{formatWon(p.amountSpent)}</span> : null}
              </button>
            ))}
        </div>
      )}

      <button type="button" onClick={removeTrip} style={{ background: "none", border: "none", color: "var(--warn)", fontSize: 12.5, alignSelf: "center", marginTop: 6 }}>
        이 여행 지우기
      </button>
    </main>
  );
}

const sectionStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  padding: 14,
  borderRadius: "var(--radius)",
  border: "1px solid var(--line)",
  background: "var(--card)",
};
const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "var(--fg2)" };
const inputStyle: React.CSSProperties = { padding: "10px 12px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--field)", fontSize: 16, color: "var(--fg)" };
const primaryBtnStyle: React.CSSProperties = { padding: "10px 16px", borderRadius: "var(--radius)", border: "none", background: "var(--accent)", color: "var(--accent-fg)", fontSize: 14, fontWeight: 600 };
const placeRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 14px",
  borderRadius: "var(--radius)",
  border: "1px solid var(--line)",
  background: "var(--field)",
  textAlign: "left",
};
