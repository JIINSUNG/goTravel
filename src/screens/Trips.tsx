import { useState } from "react";
import { nanoid } from "nanoid";
import { useSession } from "../session";
import { createTrip, placesForTrip, tripTotalSpent, unassignedPlaces } from "../lib/trips";
import { formatWon } from "../lib/format";
import { linkStyle, stickyHeaderStyle } from "../lib/layout";
import type { Trip } from "../types";

export function Trips({ onOpenTrip, onAddPlace, onOpenPlace }: { onOpenTrip: (id: string) => void; onAddPlace: () => void; onOpenPlace: (id: string) => void }) {
  const { vault, update } = useSession();
  const [adding, setAdding] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  const trips = vault ? [...vault.trips].sort((a, b) => b.createdAt - a.createdAt) : [];
  const unassigned = vault ? unassignedPlaces(vault) : [];

  const confirmAdd = () => {
    const title = titleDraft.trim();
    setAdding(false);
    if (!title || !vault) {
      setTitleDraft("");
      return;
    }
    const newId = nanoid();
    update((v) => createTrip(v, title, newId));
    setTitleDraft("");
    onOpenTrip(newId);
  };

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 16 }}>
      <div style={{ ...stickyHeaderStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>여행기록</h1>
        <button type="button" onClick={onAddPlace} style={{ ...linkStyle, color: "var(--accent)", fontWeight: 600 }}>
          + 장소
        </button>
      </div>

      <div style={sectionStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={headingStyle}>여행</h2>
          {!adding && (
            <button type="button" onClick={() => setAdding(true)} style={{ ...linkStyle, color: "var(--accent)", padding: 0, fontSize: 13 }}>
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
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmAdd();
                if (e.key === "Escape") {
                  setAdding(false);
                  setTitleDraft("");
                }
              }}
              style={inputStyle}
            />
            <button type="button" onClick={confirmAdd} disabled={!titleDraft.trim()} style={primaryBtnStyle}>
              만들기
            </button>
          </div>
        )}

        {trips.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: 13.5, margin: 0 }}>아직 만든 여행이 없어요.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {trips.map((t) => (
              <TripRow key={t.id} trip={t} placeCount={vault ? placesForTrip(vault, t.id).length : 0} spent={vault ? tripTotalSpent(vault, t.id) : 0} onOpen={() => onOpenTrip(t.id)} />
            ))}
          </div>
        )}
      </div>

      {unassigned.length > 0 && (
        <div style={sectionStyle}>
          <h2 style={headingStyle}>여행에 안 묶인 장소</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {unassigned.map((p) => (
              <button key={p.id} type="button" onClick={() => onOpenPlace(p.id)} style={placeRowStyle}>
                <span>{p.name}</span>
                <span style={{ color: "var(--muted)", fontSize: 12.5 }}>{p.category ?? ""}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

function TripRow({ trip, placeCount, spent, onOpen }: { trip: Trip; placeCount: number; spent: number; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} style={tripRowStyle}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <b style={{ fontSize: 15 }}>{trip.title}</b>
        <span style={{ color: "var(--muted)", fontSize: 12.5 }}>
          {[trip.region, trip.startDate && trip.endDate ? `${trip.startDate} ~ ${trip.endDate}` : trip.startDate].filter(Boolean).join(" · ")}
        </span>
      </div>
      <div style={{ textAlign: "right", color: "var(--muted)", fontSize: 12.5 }}>
        <div>{placeCount}곳</div>
        {spent > 0 && <div>{formatWon(spent)}</div>}
      </div>
    </button>
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
const headingStyle: React.CSSProperties = { fontSize: 15, margin: 0 };
const inputStyle: React.CSSProperties = { flex: 1, padding: "10px 12px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--field)", fontSize: 16, color: "var(--fg)" };
const primaryBtnStyle: React.CSSProperties = { padding: "0 14px", borderRadius: "var(--radius)", border: "none", background: "var(--accent)", color: "var(--accent-fg)", fontSize: 13.5, fontWeight: 600 };
const tripRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "14px 16px",
  borderRadius: 16,
  border: "1px solid var(--line)",
  background: "var(--field)",
  textAlign: "left",
};
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
