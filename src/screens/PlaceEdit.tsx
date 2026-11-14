import { useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { useSession } from "../session";
import { createPlace, findPlace, findTrip, updatePlace } from "../lib/trips";
import { isKakaoConfigured, searchKakaoPlaces, type KakaoPlaceResult } from "../lib/kakao";
import { linkStyle, stickyHeaderStyle } from "../lib/layout";
import { PLACE_CATEGORIES, type PlaceCategory } from "../types";

export function PlaceEdit({ id, tripId, onDone, onCancel }: { id: string | null; tripId?: string; onDone: (id: string) => void; onCancel: () => void }) {
  const { vault, update } = useSession();
  const existing = id && vault ? findPlace(vault, id) : undefined;
  const effectiveTripId = existing?.tripId ?? tripId;
  const trip = vault && effectiveTripId ? findTrip(vault, effectiveTripId) : undefined;

  const [name, setName] = useState(existing?.name ?? "");
  const [address, setAddress] = useState(existing?.address ?? "");
  const [lat, setLat] = useState(existing?.lat);
  const [lng, setLng] = useState(existing?.lng);
  const [kakaoPlaceUrl, setKakaoPlaceUrl] = useState(existing?.kakaoPlaceUrl);
  const [category, setCategory] = useState<PlaceCategory | undefined>(existing?.category);
  const [visitDate, setVisitDate] = useState(existing?.visitDate ?? "");
  const [openingHours, setOpeningHours] = useState(existing?.openingHours ?? "");
  const [amountSpent, setAmountSpent] = useState(existing?.amountSpent ? String(existing.amountSpent) : "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [tip, setTip] = useState(existing?.tip ?? "");

  const [searchResults, setSearchResults] = useState<KakaoPlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!name.trim() || !isKakaoConfigured() || !showResults) return;
    searchTimerRef.current = setTimeout(() => {
      setSearching(true);
      searchKakaoPlaces(name.trim())
        .then((results) => {
          setSearchResults(results);
          setSearchError(null);
        })
        .catch(() => setSearchError("장소 검색에 실패했어요. 주소를 직접 입력해주세요."))
        .finally(() => setSearching(false));
    }, 400);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [name, showResults]);

  const pickResult = (r: KakaoPlaceResult) => {
    setName(r.name);
    setAddress(r.address);
    setLat(r.lat);
    setLng(r.lng);
    setKakaoPlaceUrl(r.placeUrl);
    setShowResults(false);
    setSearchResults([]);
  };

  const save = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const amount = amountSpent.trim() ? Number(amountSpent.trim()) : undefined;
    const patch = {
      name: trimmedName,
      tripId: effectiveTripId,
      category,
      address: address.trim() || undefined,
      lat,
      lng,
      kakaoPlaceUrl,
      visitDate: visitDate || undefined,
      openingHours: openingHours.trim() || undefined,
      amountSpent: amount,
      note: note.trim() || undefined,
      tip: tip.trim() || undefined,
    };

    if (existing) {
      update((v) => updatePlace(v, existing.id, patch));
      onDone(existing.id);
      return;
    }
    const newId = nanoid();
    update((v) => createPlace(v, patch, newId));
    onDone(newId);
  };

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 16 }}>
      <div style={{ ...stickyHeaderStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button type="button" onClick={onCancel} style={linkStyle}>
          취소
        </button>
        <h1 style={{ fontSize: 18, margin: 0 }}>{existing ? "장소 수정" : "새 장소"}</h1>
        <button type="button" onClick={save} disabled={!name.trim()} style={{ ...linkStyle, color: "var(--accent)", fontWeight: 600 }}>
          저장
        </button>
      </div>

      {trip && <p style={{ color: "var(--muted)", fontSize: 12.5, margin: 0 }}>🧳 {trip.title}</p>}

      <div style={{ position: "relative" }}>
        <label style={fieldStyle}>
          <span>이름{isKakaoConfigured() ? " (카카오맵 검색)" : ""}</span>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setShowResults(true);
            }}
            placeholder="예: 민수네 라멘집"
            style={inputStyle}
            autoFocus
          />
        </label>
        {showResults && name.trim() && (searching || searchResults.length > 0 || searchError) && (
          <div style={dropdownStyle}>
            {searching && <p style={{ margin: 0, padding: 10, fontSize: 13, color: "var(--muted)" }}>검색 중…</p>}
            {searchError && <p style={{ margin: 0, padding: 10, fontSize: 13, color: "var(--warn)" }}>{searchError}</p>}
            {searchResults.map((r, i) => (
              <button key={i} type="button" onClick={() => pickResult(r)} style={dropdownItemStyle}>
                <b style={{ fontSize: 13.5 }}>{r.name}</b>
                <span style={{ color: "var(--muted)", fontSize: 11.5 }}>{r.address}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <label style={fieldStyle}>
        <span>주소 (선택)</span>
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="검색으로 자동 입력되거나 직접 입력" style={inputStyle} />
      </label>

      <div style={fieldStyle}>
        <span>분류 (선택)</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {PLACE_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory((prev) => (prev === c ? undefined : c))}
              aria-pressed={category === c}
              style={{
                fontSize: 12.5,
                padding: "6px 12px",
                borderRadius: 999,
                border: "1px solid var(--line)",
                background: category === c ? "var(--accent)" : "var(--field)",
                color: category === c ? "var(--accent-fg)" : "var(--fg2)",
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <label style={fieldStyle}>
        <span>다녀온 날 (선택)</span>
        <input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} style={inputStyle} />
      </label>

      <label style={fieldStyle}>
        <span>영업시간 (선택)</span>
        <input value={openingHours} onChange={(e) => setOpeningHours(e.target.value)} placeholder="예: 매일 11:00-22:00, 월요일 휴무" style={inputStyle} />
      </label>

      <label style={fieldStyle}>
        <span>쓴 돈 (선택, 원)</span>
        <input type="number" inputMode="numeric" value={amountSpent} onChange={(e) => setAmountSpent(e.target.value)} placeholder="예: 32000" style={inputStyle} />
      </label>

      <label style={fieldStyle}>
        <span>느낀 점·했던 일 (선택)</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="그때 느낀 것, 했던 일을 적어두세요" style={{ ...inputStyle, resize: "vertical" }} />
      </label>

      <label style={fieldStyle}>
        <span>꿀팁 (선택)</span>
        <textarea value={tip} onChange={(e) => setTip(e.target.value)} rows={2} placeholder="다음엔 이렇게 하면 좋겠다 싶은 것" style={{ ...inputStyle, resize: "vertical" }} />
      </label>
    </main>
  );
}

const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "var(--fg2)" };
const inputStyle: React.CSSProperties = { padding: "11px 14px", borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--card)", fontSize: 16, color: "var(--fg)" };
const dropdownStyle: React.CSSProperties = {
  position: "absolute",
  top: "100%",
  left: 0,
  right: 0,
  zIndex: 10,
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius)",
  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
  maxHeight: 260,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
};
const dropdownItemStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
  padding: "10px 12px",
  background: "none",
  border: "none",
  borderBottom: "1px solid var(--line)",
  textAlign: "left",
};
