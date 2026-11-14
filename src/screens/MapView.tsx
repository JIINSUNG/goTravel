import { useEffect, useRef, useState } from "react";
import { useSession } from "../session";
import { isKakaoConfigured, loadKakaoMaps } from "../lib/kakao";
import { stickyHeaderStyle } from "../lib/layout";

export function MapView({ onOpenPlace }: { onOpenPlace: (id: string) => void }) {
  const { vault } = useSession();
  const mapRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  const places = (vault?.places ?? []).filter((p) => p.lat != null && p.lng != null);

  useEffect(() => {
    if (!isKakaoConfigured()) {
      setError("카카오맵 API 키가 설정되지 않았어요. 설정에서 안내를 확인해주세요.");
      return;
    }
    if (!mapRef.current) return;
    let cancelled = false;
    loadKakaoMaps()
      .then((kakao) => {
        if (cancelled || !mapRef.current) return;
        const center = places.length > 0 ? new kakao.maps.LatLng(places[0].lat!, places[0].lng!) : new kakao.maps.LatLng(37.5665, 126.978);
        const map = new kakao.maps.Map(mapRef.current, { center, level: 7 });
        for (const p of places) {
          if (p.lat == null || p.lng == null) continue;
          new kakao.maps.Marker({ position: new kakao.maps.LatLng(p.lat, p.lng), map });
        }
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "지도를 불러오지 못했어요."));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places.length]);

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 16, height: "100%" }}>
      <div style={stickyHeaderStyle}>
        <h1 style={{ fontSize: 20, margin: 0 }}>지도</h1>
      </div>

      {error ? (
        <p style={{ color: "var(--muted)", fontSize: 13.5, textAlign: "center", marginTop: 40, padding: "0 16px" }}>{error}</p>
      ) : (
        <div ref={mapRef} style={{ width: "100%", height: 320, borderRadius: "var(--radius)", background: "var(--field)" }} />
      )}

      {places.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: 13.5, textAlign: "center" }}>위치가 있는 장소가 없어요. 장소를 검색해서 추가하면 여기 표시돼요.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {places.map((p) => (
            <button key={p.id} type="button" onClick={() => onOpenPlace(p.id)} style={rowStyle}>
              <b style={{ fontSize: 14 }}>{p.name}</b>
              <span style={{ color: "var(--muted)", fontSize: 12 }}>{p.address ?? ""}</span>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
  padding: "10px 14px",
  borderRadius: "var(--radius)",
  border: "1px solid var(--line)",
  background: "var(--card)",
  textAlign: "left",
};
