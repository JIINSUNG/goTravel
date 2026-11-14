// 카카오맵 JS SDK 로더 + 장소 검색(keywordSearch) 감싸기. REST API 대신 SDK에 내장된
// services.Places를 쓰는 이유: 브라우저에서 바로 호출해도 CORS 문제가 없고, 키도 이미 로드한
// JavaScript 키 하나로 충분하다(REST 키 별도 발급·숨김 불필요).
export function isKakaoConfigured(): boolean {
  const env = import.meta.env as Record<string, string | undefined>;
  return !!env.VITE_KAKAO_APP_KEY;
}

interface KakaoLatLng {
  getLat(): number;
  getLng(): number;
}

interface KakaoMap {
  setCenter(latlng: KakaoLatLng): void;
  setLevel(level: number): void;
}

interface KakaoMarker {
  setMap(map: KakaoMap | null): void;
}

interface KakaoPlaceSearchResult {
  place_name: string;
  address_name: string;
  road_address_name: string;
  x: string; // lng
  y: string; // lat
  place_url: string;
  category_group_name: string;
}

interface KakaoNamespace {
  maps: {
    load: (cb: () => void) => void;
    LatLng: new (lat: number, lng: number) => KakaoLatLng;
    Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number }) => KakaoMap;
    Marker: new (options: { position: KakaoLatLng; map?: KakaoMap }) => KakaoMarker;
    services: {
      Places: new () => {
        keywordSearch: (keyword: string, callback: (data: KakaoPlaceSearchResult[], status: string) => void) => void;
      };
      Status: { OK: string; ZERO_RESULT: string; ERROR: string };
    };
  };
}

declare global {
  interface Window {
    kakao?: KakaoNamespace;
  }
}

let loadPromise: Promise<KakaoNamespace> | null = null;

export function loadKakaoMaps(): Promise<KakaoNamespace> {
  if (loadPromise) return loadPromise;
  const env = import.meta.env as Record<string, string | undefined>;
  const appKey = env.VITE_KAKAO_APP_KEY;
  if (!appKey) return Promise.reject(new Error("카카오맵 API 키가 설정되지 않았어요."));

  loadPromise = new Promise((resolve, reject) => {
    if (window.kakao?.maps) {
      resolve(window.kakao);
      return;
    }
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&libraries=services&autoload=false`;
    script.onload = () => {
      window.kakao!.maps.load(() => resolve(window.kakao!));
    };
    script.onerror = () => reject(new Error("카카오맵을 불러오지 못했어요."));
    document.head.appendChild(script);
  });
  return loadPromise;
}

export interface KakaoPlaceResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeUrl?: string;
  category?: string;
}

export async function searchKakaoPlaces(keyword: string): Promise<KakaoPlaceResult[]> {
  const kakao = await loadKakaoMaps();
  return new Promise((resolve, reject) => {
    const places = new kakao.maps.services.Places();
    places.keywordSearch(keyword, (data, status) => {
      if (status === kakao.maps.services.Status.OK) {
        resolve(
          data.map((d) => ({
            name: d.place_name,
            address: d.road_address_name || d.address_name,
            lat: Number(d.y),
            lng: Number(d.x),
            placeUrl: d.place_url,
            category: d.category_group_name,
          }))
        );
      } else if (status === kakao.maps.services.Status.ZERO_RESULT) {
        resolve([]);
      } else {
        reject(new Error("장소 검색에 실패했어요."));
      }
    });
  });
}

export type { KakaoNamespace, KakaoMap, KakaoLatLng };
