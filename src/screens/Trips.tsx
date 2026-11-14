import { useState } from "react";
import { nanoid } from "nanoid";
import { useSession } from "../session";
import { createTrip, findTrip, placesForTrip, searchPlaces, sortTrips, tripTotalSpent, unassignedPlaces } from "../lib/trips";
import { formatTripRange, formatWon } from "../lib/format";
import { cardStyle, linkStyle, rowButtonStyle, stickyHeaderStyle } from "../lib/layout";
import type { PlaceVisit, Trip, Vault } from "../types";

export function Trips({ onOpenTrip, onAddPlace, onOpenPlace }: { onOpenTrip: (id: string) => void; onAddPlace: () => void; onOpenPlace: (id: string) => void }) {
  const { vault, update } = useSession();
  const [adding, setAdding] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [query, setQuery] = useState("");

  const trips = vault ? sortTrips(vault.trips) : [];
  const unassigned = vault ? [...unassignedPlaces(vault)].sort((a, b) => b.createdAt - a.createdAt) : [];
  const searching = query.trim().length > 0;
  const results = vault && searching ? searchInVault(vault, query) : [];
  const isEmpty = trips.length === 0 && unassigned.length === 0;

  const confirmAdd = () => {
    const title = titleDraft.trim();
    setAdding(false);
    setTitleDraft("");
    if (!title || !vault) return;
    const newId = nanoid();
    update((v) => createTrip(v, title, newId));
    onOpenTrip(newId);
  };

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 16 }}>
      <div style={{ ...stickyHeaderStyle, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: 20, margin: 0 }}>여행기록</h1>
          <button type="button" onClick={onAddPlace} style={addPlaceBtnStyle}>
            + 장소 기록
          </button>
        </div>
        {!isEmpty && (
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="🔍 장소·메모·꿀팁·여행 이름으로 찾기"
            aria-label="기록 검색"
            style={{ ...inputStyle, background: "var(--card)" }}
          />
        )}
      </div>

      {searching ? (
        <div style={cardStyle}>
          <h2 style={headingStyle}>찾은 장소 {results.length}곳</h2>
          {results.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: 13.5, margin: 0 }}>"{query.trim()}"에 맞는 기록이 없어요.</p>
          ) : (
            results.map((p) => <PlaceRow key={p.id} place={p} tripTitle={vault && p.tripId ? findTrip(vault, p.tripId)?.title : undefined} onOpen={() => onOpenPlace(p.id)} />)
          )}
        </div>
      ) : (
        <>
          {isEmpty && !adding && (
            <div style={{ ...cardStyle, alignItems: "center", textAlign: "center", padding: "28px 20px", gap: 8 }}>
              <span style={{ fontSize: 36 }}>🧳</span>
              <b style={{ fontSize: 16 }}>첫 여행을 기록해볼까요?</b>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 13.5 }}>여행을 만들고 들른 곳을 하나씩 남기거나, 여행 없이 장소만 바로 기록해도 돼요.</p>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button type="button" onClick={() => setAdding(true)} style={{ ...primaryBtnStyle, padding: "10px 16px" }}>
                  새 여행 만들기
                </button>
                <button type="button" onClick={onAddPlace} style={{ ...primaryBtnStyle, padding: "10px 16px", background: "var(--field)", color: "var(--fg)" }}>
                  장소만 기록
                </button>
              </div>
            </div>
          )}

          {(!isEmpty || adding) && (
            <div style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={headingStyle}>여행 {trips.length > 0 && <span style={{ color: "var(--muted)", fontWeight: 400 }}>{trips.length}</span>}</h2>
                {!adding && (
                  <button type="button" onClick={() => setAdding(true)} style={{ ...linkStyle, color: "var(--accent)", fontSize: 13.5, fontWeight: 600 }}>
                    + 새 여행
                  </button>
                )}
              </div>
              {adding && (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    autoFocus
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    placeholder="예: 2026 오사카 여행"
                    enterKeyHint="done"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.nativeEvent.isComposing) confirmAdd();
                      if (e.key === "Escape") {
                        setAdding(false);
                        setTitleDraft("");
                      }
                    }}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button type="button" onClick={confirmAdd} disabled={!titleDraft.trim()} style={primaryBtnStyle}>
                    만들기
                  </button>
                </div>
              )}

              {trips.length === 0 && !adding ? (
                <p style={{ color: "var(--muted)", fontSize: 13.5, margin: 0 }}>아직 만든 여행이 없어요.</p>
              ) : (
                trips.map((t) => (
                  <TripRow key={t.id} trip={t} placeCount={vault ? placesForTrip(vault, t.id).length : 0} spent={vault ? tripTotalSpent(vault, t.id) : 0} onOpen={() => onOpenTrip(t.id)} />
                ))
              )}
            </div>
          )}

          {unassigned.length > 0 && (
            <div style={cardStyle}>
              <h2 style={headingStyle}>여행에 안 묶인 장소</h2>
              {unassigned.map((p) => (
                <PlaceRow key={p.id} place={p} onOpen={() => onOpenPlace(p.id)} />
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}

/** 장소 검색 — 장소 자체 필드에 더해, 그 장소가 속한 여행의 제목·여행지로도 찾는다. 최근 기록이 위. */
function searchInVault(vault: Vault, query: string): PlaceVisit[] {
  const q = query.trim().toLowerCase();
  const matchingTripIds = new Set(vault.trips.filter((t) => t.title.toLowerCase().includes(q) || (t.region ?? "").toLowerCase().includes(q)).map((t) => t.id));
  const direct = new Set(searchPlaces(vault, query).map((p) => p.id));
  return vault.places
    .filter((p) => direct.has(p.id) || (p.tripId && matchingTripIds.has(p.tripId)))
    .sort((a, b) => (b.visitDate ?? "").localeCompare(a.visitDate ?? "") || b.createdAt - a.createdAt);
}

function TripRow({ trip, placeCount, spent, onOpen }: { trip: Trip; placeCount: number; spent: number; onOpen: () => void }) {
  const sub = [trip.region, formatTripRange(trip.startDate, trip.endDate)].filter(Boolean).join(" · ");
  return (
    <button type="button" onClick={onOpen} style={{ ...rowButtonStyle, padding: "14px 16px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <b style={{ fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{trip.title}</b>
        {sub && <span style={{ color: "var(--muted)", fontSize: 12.5 }}>{sub}</span>}
      </div>
      <div style={{ textAlign: "right", color: "var(--muted)", fontSize: 12.5, flexShrink: 0 }}>
        <div>{placeCount}곳</div>
        {spent > 0 && <div>{formatWon(spent)}</div>}
      </div>
    </button>
  );
}

function PlaceRow({ place, tripTitle, onOpen }: { place: PlaceVisit; tripTitle?: string; onOpen: () => void }) {
  const sub = [place.category, tripTitle && `🧳 ${tripTitle}`, place.visitDate?.replaceAll("-", ".")].filter(Boolean).join(" · ");
  return (
    <button type="button" onClick={onOpen} style={rowButtonStyle}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{place.name}</span>
        {sub && <span style={{ color: "var(--muted)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</span>}
      </div>
      {place.amountSpent ? <span style={{ color: "var(--muted)", fontSize: 12.5, flexShrink: 0 }}>{formatWon(place.amountSpent)}</span> : null}
    </button>
  );
}

const headingStyle: React.CSSProperties = { fontSize: 15, margin: 0 };
const inputStyle: React.CSSProperties = { padding: "10px 12px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--field)", fontSize: 16, color: "var(--fg)", minWidth: 0 };
const primaryBtnStyle: React.CSSProperties = { padding: "0 14px", borderRadius: "var(--radius)", border: "none", background: "var(--accent)", color: "var(--accent-fg)", fontSize: 13.5, fontWeight: 600 };
const addPlaceBtnStyle: React.CSSProperties = { ...primaryBtnStyle, padding: "8px 14px", borderRadius: 999 };
