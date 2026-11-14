import { useState } from "react";
import { useSession } from "../session";
import { deleteTrip, findTrip, groupPlacesByDate, placesForTrip, spentByCategory, tripTotalSpent, updateTrip } from "../lib/trips";
import { dayNumber, formatDay, formatTripRange, formatWon } from "../lib/format";
import { cardStyle, headerTitleStyle, linkStyle, mutedTextStyle, rowButtonStyle, stickyHeaderStyle } from "../lib/layout";
import type { PlaceVisit } from "../types";

export function TripDetail({ id, onBack, onAddPlace, onOpenPlace }: { id: string; onBack: () => void; onAddPlace: (tripId: string) => void; onOpenPlace: (id: string) => void }) {
  const { vault, update } = useSession();
  const trip = vault ? findTrip(vault, id) : undefined;
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [region, setRegion] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  if (!trip) {
    return (
      <main style={{ paddingTop: 16 }}>
        <button type="button" onClick={onBack} style={linkStyle}>
          ← 뒤로
        </button>
        <p style={{ color: "var(--muted)" }}>이 여행은 이미 지워졌어요.</p>
      </main>
    );
  }

  const places = vault ? placesForTrip(vault, id) : [];
  const spent = vault ? tripTotalSpent(vault, id) : 0;
  const byCategory = spentByCategory(places);
  const groups = groupPlacesByDate(places);
  const range = formatTripRange(trip.startDate, trip.endDate);
  const dateInvalid = !!startDate && !!endDate && endDate < startDate;

  // 수정 폼을 열 때마다 지금 값으로 채운다 — 다른 기기에서 동기화로 바뀐 값이 있어도 옛 값으로 덮어쓰지 않게.
  const openEdit = () => {
    setTitle(trip.title);
    setRegion(trip.region ?? "");
    setStartDate(trip.startDate ?? "");
    setEndDate(trip.endDate ?? "");
    setEditing(true);
  };

  const saveEdit = () => {
    const trimmed = title.trim();
    if (!trimmed || dateInvalid) return;
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
      <div style={{ ...stickyHeaderStyle, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <button type="button" onClick={onBack} style={linkStyle}>
          ← 뒤로
        </button>
        <h1 style={headerTitleStyle}>{trip.title}</h1>
        <button type="button" onClick={() => (editing ? setEditing(false) : openEdit())} style={{ ...linkStyle, color: "var(--accent)", fontWeight: 600 }}>
          {editing ? "닫기" : "수정"}
        </button>
      </div>

      {editing ? (
        <div style={cardStyle}>
          <label style={fieldStyle}>
            <span>제목</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
          </label>
          <label style={fieldStyle}>
            <span>여행지 (선택)</span>
            <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="예: 일본 오사카" style={inputStyle} />
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <label style={{ ...fieldStyle, flex: 1, minWidth: 0 }}>
              <span>시작일</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
            </label>
            <label style={{ ...fieldStyle, flex: 1, minWidth: 0 }}>
              <span>종료일</span>
              <input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
            </label>
          </div>
          {dateInvalid && <p style={{ margin: 0, fontSize: 12.5, color: "var(--warn)" }}>종료일이 시작일보다 빨라요.</p>}
          <button type="button" onClick={saveEdit} disabled={!title.trim() || dateInvalid} style={primaryBtnStyle}>
            저장
          </button>
          <button type="button" onClick={removeTrip} style={{ background: "none", border: "none", color: "var(--warn)", fontSize: 12.5, alignSelf: "center", padding: 8 }}>
            이 여행 지우기
          </button>
        </div>
      ) : (
        (trip.region || range) && (
          <p style={{ ...mutedTextStyle, margin: "-8px 0 0", textAlign: "center" }}>{[trip.region, range].filter(Boolean).join(" · ")}</p>
        )
      )}

      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>{places.length}곳 기록</span>
          {spent > 0 && <b style={{ fontSize: 16 }}>총 {formatWon(spent)}</b>}
        </div>
        {byCategory.length > 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {byCategory.map(({ category, total }) => (
              <div key={category} style={{ display: "grid", gridTemplateColumns: "48px 1fr auto", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                <span style={{ color: "var(--fg2)" }}>{category}</span>
                <div style={{ height: 6, borderRadius: 3, background: "var(--field)", overflow: "hidden" }}>
                  <div style={{ width: `${Math.max(4, (total / spent) * 100)}%`, height: "100%", background: "var(--accent)", borderRadius: 3 }} />
                </div>
                <span style={{ color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{formatWon(total)}</span>
              </div>
            ))}
          </div>
        )}
        <button type="button" onClick={() => onAddPlace(id)} style={primaryBtnStyle}>
          + 이 여행에 장소 추가
        </button>
      </div>

      {places.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: 13.5, textAlign: "center", marginTop: 20 }}>아직 기록한 장소가 없어요.</p>
      ) : (
        groups.map((g) => {
          const day = g.date ? dayNumber(trip.startDate, g.date) : null;
          const daySpent = g.places.reduce((sum, p) => sum + (p.amountSpent ?? 0), 0);
          return (
            <section key={g.date ?? "none"} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingInline: 4 }}>
                <h2 style={{ fontSize: 14, margin: 0 }}>
                  {g.date ? (
                    <>
                      {day && <span style={{ color: "var(--accent)", marginRight: 6 }}>{day}일차</span>}
                      {formatDay(g.date)}
                    </>
                  ) : (
                    "날짜 없음"
                  )}
                </h2>
                {daySpent > 0 && <span style={mutedTextStyle}>{formatWon(daySpent)}</span>}
              </div>
              {g.places.map((p) => (
                <PlaceRow key={p.id} place={p} onOpen={() => onOpenPlace(p.id)} />
              ))}
            </section>
          );
        })
      )}
    </main>
  );
}

function PlaceRow({ place, onOpen }: { place: PlaceVisit; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} style={rowButtonStyle}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <b style={{ fontSize: 14.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{place.name}</b>
        {(place.category || place.tip) && (
          <span style={{ color: "var(--muted)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {[place.category, place.tip && `💡 ${place.tip}`].filter(Boolean).join(" · ")}
          </span>
        )}
      </div>
      {place.amountSpent ? <span style={{ color: "var(--muted)", fontSize: 12.5, flexShrink: 0 }}>{formatWon(place.amountSpent)}</span> : null}
    </button>
  );
}

const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "var(--fg2)" };
const inputStyle: React.CSSProperties = { padding: "10px 12px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--field)", fontSize: 16, color: "var(--fg)", width: "100%", minWidth: 0 };
const primaryBtnStyle: React.CSSProperties = { padding: "12px 16px", borderRadius: "var(--radius)", border: "none", background: "var(--accent)", color: "var(--accent-fg)", fontSize: 14, fontWeight: 600 };
