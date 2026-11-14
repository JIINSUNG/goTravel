import { useEffect, useMemo, useState } from "react";
import { nanoid } from "nanoid";
import { useSession } from "../session";
import { createPlace, findPlace, placeCategoryFromKakao, sortTrips, updatePlace } from "../lib/trips";
import { isKakaoConfigured, searchKakaoPlaces, type KakaoPlaceResult } from "../lib/kakao";
import { headerTitleStyle, linkStyle, stickyHeaderStyle } from "../lib/layout";
import { todayYmd } from "../lib/format";
import { PLACE_CATEGORIES, type PlaceCategory } from "../types";

export function PlaceEdit({ id, tripId, onDone, onCancel }: { id: string | null; tripId?: string; onDone: (id: string) => void; onCancel: () => void }) {
  const { vault, update } = useSession();
  const existing = id && vault ? findPlace(vault, id) : undefined;
  const trips = useMemo(() => (vault ? sortTrips(vault.trips) : []), [vault]);

  // 처음 화면을 열었을 때 값 — "저장 안 한 변경이 있는지" 비교용.
  const [initial] = useState(() => ({
    name: existing?.name ?? "",
    address: existing?.address ?? "",
    tripId: existing ? (existing.tripId ?? "") : (tripId ?? ""),
    category: existing?.category,
    // 새 장소는 대개 지금 막 다녀온 곳이라 오늘 날짜를 기본으로 채워둔다.
    visitDate: existing ? (existing.visitDate ?? "") : todayYmd(),
    openingHours: existing?.openingHours ?? "",
    amountSpent: existing?.amountSpent != null ? String(existing.amountSpent) : "",
    note: existing?.note ?? "",
    tip: existing?.tip ?? "",
  }));

  const [name, setName] = useState(initial.name);
  const [address, setAddress] = useState(initial.address);
  const [lat, setLat] = useState(existing?.lat);
  const [lng, setLng] = useState(existing?.lng);
  const [kakaoPlaceUrl, setKakaoPlaceUrl] = useState(existing?.kakaoPlaceUrl);
  const [placeTripId, setPlaceTripId] = useState(initial.tripId);
  const [category, setCategory] = useState<PlaceCategory | undefined>(initial.category);
  const [visitDate, setVisitDate] = useState(initial.visitDate);
  const [openingHours, setOpeningHours] = useState(initial.openingHours);
  const [amountSpent, setAmountSpent] = useState(initial.amountSpent);
  const [note, setNote] = useState(initial.note);
  const [tip, setTip] = useState(initial.tip);

  const [searchResults, setSearchResults] = useState<KakaoPlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const q = name.trim();
    if (!q || !isKakaoConfigured() || !showResults) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setSearching(true);
      searchKakaoPlaces(q)
        .then((results) => {
          if (cancelled) return;
          setSearchResults(results);
          setSearchError(null);
        })
        .catch(() => !cancelled && setSearchError("장소 검색에 실패했어요. 주소를 직접 입력해주세요."))
        .finally(() => !cancelled && setSearching(false));
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [name, showResults]);

  const closeResults = () => {
    setShowResults(false);
    setSearchResults([]);
    setSearchError(null);
  };

  const pickResult = (r: KakaoPlaceResult) => {
    setName(r.name);
    setAddress(r.address);
    setLat(r.lat);
    setLng(r.lng);
    setKakaoPlaceUrl(r.placeUrl);
    if (!category) setCategory(placeCategoryFromKakao(r.category));
    closeResults();
  };

  const amountNumber = amountSpent.trim() ? Number(amountSpent.replaceAll(",", "").trim()) : undefined;
  const amountInvalid = amountNumber !== undefined && (!Number.isFinite(amountNumber) || amountNumber < 0);
  const canSave = !!name.trim() && !amountInvalid;

  const dirty =
    name !== initial.name ||
    address !== initial.address ||
    placeTripId !== initial.tripId ||
    category !== initial.category ||
    visitDate !== initial.visitDate ||
    openingHours !== initial.openingHours ||
    amountSpent !== initial.amountSpent ||
    note !== initial.note ||
    tip !== initial.tip;

  const cancel = () => {
    if (dirty && !confirm("저장하지 않은 내용이 있어요. 그래도 나갈까요?")) return;
    onCancel();
  };

  const save = () => {
    if (!canSave) return;
    const patch = {
      name: name.trim(),
      tripId: placeTripId || undefined,
      category,
      address: address.trim() || undefined,
      lat,
      lng,
      kakaoPlaceUrl,
      visitDate: visitDate || undefined,
      openingHours: openingHours.trim() || undefined,
      amountSpent: amountNumber,
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
      <div style={{ ...stickyHeaderStyle, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <button type="button" onClick={cancel} style={linkStyle}>
          취소
        </button>
        <h1 style={headerTitleStyle}>{existing ? "장소 수정" : "새 장소"}</h1>
        <button type="button" onClick={save} disabled={!canSave} style={{ ...linkStyle, color: canSave ? "var(--accent)" : "var(--muted)", fontWeight: 600 }}>
          저장
        </button>
      </div>

      <div style={{ position: "relative" }}>
        <label style={fieldStyle}>
          <span>이름{isKakaoConfigured() ? " (카카오맵 검색)" : ""}</span>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setShowResults(true);
            }}
            onKeyDown={(e) => e.key === "Escape" && closeResults()}
            placeholder="예: 민수네 라멘집"
            style={inputStyle}
            autoFocus={!existing}
            enterKeyHint="search"
          />
        </label>
        {showResults && name.trim() && (searching || searchResults.length > 0 || searchError) && (
          <div style={dropdownStyle}>
            {searching && searchResults.length === 0 && <p style={{ margin: 0, padding: 10, fontSize: 13, color: "var(--muted)" }}>검색 중…</p>}
            {searchError && <p style={{ margin: 0, padding: 10, fontSize: 13, color: "var(--warn)" }}>{searchError}</p>}
            {searchResults.map((r, i) => (
              <button key={`${r.placeUrl ?? r.name}-${i}`} type="button" onClick={() => pickResult(r)} style={dropdownItemStyle}>
                <b style={{ fontSize: 13.5 }}>
                  {r.name}
                  {r.category && <span style={{ fontWeight: 400, color: "var(--muted)", fontSize: 11.5 }}> · {r.category}</span>}
                </b>
                <span style={{ color: "var(--muted)", fontSize: 11.5 }}>{r.address}</span>
              </button>
            ))}
            <button type="button" onClick={closeResults} style={{ ...dropdownItemStyle, color: "var(--fg2)", fontSize: 13, borderBottom: "none", alignItems: "center" }}>
              검색 결과 닫고 직접 입력할게요
            </button>
          </div>
        )}
      </div>

      <label style={fieldStyle}>
        <span>주소 (선택)</span>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="검색으로 자동 입력되거나 직접 입력"
          style={inputStyle}
        />
        {lat != null && lng != null && <span style={{ fontSize: 11.5, color: "var(--accent)" }}>📍 지도에 표시돼요</span>}
      </label>

      <label style={fieldStyle}>
        <span>여행</span>
        <select value={placeTripId} onChange={(e) => setPlaceTripId(e.target.value)} style={inputStyle}>
          <option value="">어느 여행에도 안 묶음</option>
          {trips.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
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
                fontSize: 13,
                padding: "8px 14px",
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

      <div style={{ display: "flex", gap: 8 }}>
        <label style={{ ...fieldStyle, flex: 1, minWidth: 0 }}>
          <span>다녀온 날</span>
          <input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ ...fieldStyle, flex: 1, minWidth: 0 }}>
          <span>쓴 돈 (원)</span>
          <input
            inputMode="numeric"
            value={amountSpent}
            onChange={(e) => setAmountSpent(e.target.value.replace(/[^\d,]/g, ""))}
            placeholder="예: 32000"
            style={{ ...inputStyle, borderColor: amountInvalid ? "var(--warn)" : "var(--line)" }}
          />
        </label>
      </div>

      <label style={fieldStyle}>
        <span>영업시간 (선택)</span>
        <input value={openingHours} onChange={(e) => setOpeningHours(e.target.value)} placeholder="예: 매일 11:00-22:00, 월요일 휴무" style={inputStyle} />
      </label>

      <label style={fieldStyle}>
        <span>느낀 점·했던 일 (선택)</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="그때 느낀 것, 했던 일을 적어두세요" style={{ ...inputStyle, resize: "vertical" }} />
      </label>

      <label style={fieldStyle}>
        <span>꿀팁 (선택)</span>
        <textarea value={tip} onChange={(e) => setTip(e.target.value)} rows={2} placeholder="다음엔 이렇게 하면 좋겠다 싶은 것" style={{ ...inputStyle, resize: "vertical" }} />
      </label>

      <button type="button" onClick={save} disabled={!canSave} style={{ ...saveBtnStyle, opacity: canSave ? 1 : 0.5 }}>
        저장
      </button>
    </main>
  );
}

const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "var(--fg2)" };
const inputStyle: React.CSSProperties = {
  padding: "11px 14px",
  borderRadius: "var(--radius)",
  border: "1px solid var(--line)",
  background: "var(--card)",
  fontSize: 16,
  color: "var(--fg)",
  width: "100%",
  minWidth: 0,
};
const saveBtnStyle: React.CSSProperties = {
  padding: "14px 16px",
  borderRadius: "var(--radius)",
  border: "none",
  background: "var(--accent)",
  color: "var(--accent-fg)",
  fontSize: 15,
  fontWeight: 700,
  marginTop: 4,
};
const dropdownStyle: React.CSSProperties = {
  position: "absolute",
  top: "100%",
  left: 0,
  right: 0,
  zIndex: 10,
  marginTop: 4,
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius)",
  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
  maxHeight: 300,
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
