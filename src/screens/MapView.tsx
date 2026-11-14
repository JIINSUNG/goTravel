import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "../session";
import { isKakaoConfigured, loadKakaoMaps, type KakaoMap, type KakaoMarker, type KakaoNamespace } from "../lib/kakao";
import { sortTrips } from "../lib/trips";
import { cardStyle, rowButtonStyle, stickyHeaderStyle } from "../lib/layout";

const ALL = "__all__";
const NONE = "__none__";

export function MapView({ onOpenPlace }: { onOpenPlace: (id: string) => void }) {
  const { vault } = useSession();
  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<{ kakao: KakaoNamespace; map: KakaoMap } | null>(null);
  const markersRef = useRef<KakaoMarker[]>([]);
  const [error, setError] = useState<string | null>(isKakaoConfigured() ? null : "카카오맵 API 키가 설정되지 않았어요. 설정에서 안내를 확인해주세요.");
  const [ready, setReady] = useState(false);
  const [tripFilter, setTripFilter] = useState(ALL);

  const trips = useMemo(() => (vault ? sortTrips(vault.trips) : []), [vault]);
  const places = useMemo(
    () =>
      (vault?.places ?? []).filter(
        (p) => p.lat != null && p.lng != null && (tripFilter === ALL || (tripFilter === NONE ? !p.tripId : p.tripId === tripFilter))
      ),
    [vault, tripFilter]
  );
  // 마커를 다시 그려야 하는지 판단하는 키 — 장소가 늘거나 줄거나, 위치·이름이 바뀌었을 때만.
  const markersKey = places.map((p) => `${p.id}:${p.lat}:${p.lng}:${p.name}`).join("|");

  const onOpenRef = useRef(onOpenPlace);
  useEffect(() => {
    onOpenRef.current = onOpenPlace;
  }, [onOpenPlace]);

  // 지도는 한 번만 만든다.
  useEffect(() => {
    if (!isKakaoConfigured()) return;
    let cancelled = false;
    loadKakaoMaps()
      .then((kakao) => {
        if (cancelled || !mapElRef.current) return;
        const map = new kakao.maps.Map(mapElRef.current, { center: new kakao.maps.LatLng(37.5665, 126.978), level: 8 });
        mapRef.current = { kakao, map };
        setReady(true);
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "지도를 불러오지 못했어요."));
    return () => {
      cancelled = true;
    };
  }, []);

  // 장소가 바뀌면 마커를 새로 찍고, 전부 보이게 지도 범위를 맞춘다. 마커를 누르면 그 장소 카드로.
  useEffect(() => {
    const m = mapRef.current;
    if (!ready || !m) return;
    const { kakao, map } = m;
    for (const mk of markersRef.current) mk.setMap(null);
    markersRef.current = [];
    if (places.length === 0) return;
    const bounds = new kakao.maps.LatLngBounds();
    for (const p of places) {
      const pos = new kakao.maps.LatLng(p.lat!, p.lng!);
      const marker = new kakao.maps.Marker({ position: pos, map, title: p.name, clickable: true });
      kakao.maps.event.addListener(marker, "click", () => onOpenRef.current(p.id));
      markersRef.current.push(marker);
      bounds.extend(pos);
    }
    if (places.length === 1) {
      map.setCenter(new kakao.maps.LatLng(places[0].lat!, places[0].lng!));
      map.setLevel(4);
    } else {
      map.setBounds(bounds, 40, 40, 40, 40);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, markersKey]);

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 16 }}>
      <div style={{ ...stickyHeaderStyle, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>지도</h1>
        {trips.length > 0 && (
          <select value={tripFilter} onChange={(e) => setTripFilter(e.target.value)} aria-label="여행으로 거르기" style={selectStyle}>
            <option value={ALL}>전체 장소</option>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
            <option value={NONE}>여행에 안 묶인 장소</option>
          </select>
        )}
      </div>

      {error ? (
        <p style={{ ...cardStyle, color: "var(--muted)", fontSize: 13.5, textAlign: "center", margin: 0 }}>{error}</p>
      ) : (
        <div ref={mapElRef} style={{ width: "100%", height: "min(52dvh, 420px)", borderRadius: "var(--radius)", background: "var(--field)", overflow: "hidden" }} />
      )}

      {places.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: 13.5, textAlign: "center" }}>
          {tripFilter === ALL ? "위치가 있는 장소가 없어요. 장소를 이름으로 검색해서 추가하면 여기 표시돼요." : "이 여행엔 위치가 있는 장소가 없어요."}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {places.map((p) => (
            <button key={p.id} type="button" onClick={() => onOpenPlace(p.id)} style={{ ...rowButtonStyle, flexDirection: "column", alignItems: "flex-start", gap: 2, background: "var(--card)" }}>
              <b style={{ fontSize: 14 }}>
                {p.name}
                {p.category && <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 12 }}> · {p.category}</span>}
              </b>
              {p.address && <span style={{ color: "var(--muted)", fontSize: 12 }}>{p.address}</span>}
            </button>
          ))}
        </div>
      )}
    </main>
  );
}

const selectStyle: React.CSSProperties = {
  maxWidth: "60%",
  padding: "7px 10px",
  borderRadius: 999,
  border: "1px solid var(--line)",
  background: "var(--card)",
  color: "var(--fg)",
  fontSize: 16,
};
