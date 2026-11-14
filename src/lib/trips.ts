// Vault 안의 Trip/PlaceVisit을 다루는 순수 함수들. 전부 "새 Vault를 돌려주는" 불변 업데이트 방식이라
// session.tsx의 update(fn)에 그대로 넘겨 쓸 수 있다.
import { nanoid } from "nanoid";
import type { PlaceCategory, PlaceVisit, Trip, Vault } from "../types";

export function createTrip(vault: Vault, title: string, id: string = nanoid()): Vault {
  const now = Date.now();
  const trip: Trip = { id, title, createdAt: now, updatedAt: now };
  return { ...vault, trips: [...vault.trips, trip] };
}

export function updateTrip(vault: Vault, id: string, patch: Partial<Pick<Trip, "title" | "startDate" | "endDate" | "region">>): Vault {
  return { ...vault, trips: vault.trips.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t)) };
}

/** 여행을 지운다 — 그 여행에 묶인 장소들은 안 지우고, 묶음만 풀어서(tripId 제거) 그대로 남긴다. */
export function deleteTrip(vault: Vault, id: string): Vault {
  const now = Date.now();
  return {
    ...vault,
    trips: vault.trips.filter((t) => t.id !== id),
    places: vault.places.map((p) => {
      if (p.tripId !== id) return p;
      const { tripId: _drop, ...rest } = p;
      return { ...rest, updatedAt: now };
    }),
    deleted: { ...vault.deleted, [id]: now },
  };
}

export function findTrip(vault: Vault, id: string): Trip | undefined {
  return vault.trips.find((t) => t.id === id);
}

export interface NewPlaceInput {
  name: string;
  tripId?: string;
  category?: PlaceCategory;
  address?: string;
  lat?: number;
  lng?: number;
  kakaoPlaceUrl?: string;
}

export function createPlace(vault: Vault, input: NewPlaceInput, id: string = nanoid()): Vault {
  const now = Date.now();
  const place: PlaceVisit = { id, createdAt: now, updatedAt: now, ...input };
  return { ...vault, places: [...vault.places, place] };
}

export function updatePlace(
  vault: Vault,
  id: string,
  patch: Partial<
    Pick<
      PlaceVisit,
      "name" | "tripId" | "category" | "address" | "lat" | "lng" | "kakaoPlaceUrl" | "visitDate" | "openingHours" | "amountSpent" | "note" | "tip"
    >
  >
): Vault {
  return { ...vault, places: vault.places.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p)) };
}

export function deletePlace(vault: Vault, id: string): Vault {
  return { ...vault, places: vault.places.filter((p) => p.id !== id), deleted: { ...vault.deleted, [id]: Date.now() } };
}

export function findPlace(vault: Vault, id: string): PlaceVisit | undefined {
  return vault.places.find((p) => p.id === id);
}

export function placesForTrip(vault: Vault, tripId: string): PlaceVisit[] {
  return vault.places.filter((p) => p.tripId === tripId);
}

/** 어느 여행에도 안 묶인 장소들. */
export function unassignedPlaces(vault: Vault): PlaceVisit[] {
  return vault.places.filter((p) => !p.tripId);
}

export function searchPlaces(vault: Vault, query: string): PlaceVisit[] {
  const q = query.trim().toLowerCase();
  if (!q) return vault.places;
  const has = (t: string | undefined) => (t ?? "").toLowerCase().includes(q);
  return vault.places.filter((p) => has(p.name) || has(p.address) || has(p.note) || has(p.tip) || has(p.category));
}

/** 이 여행에서 쓴 돈 합계(amountSpent 있는 장소만). */
export function tripTotalSpent(vault: Vault, tripId: string): number {
  return placesForTrip(vault, tripId).reduce((sum, p) => sum + (p.amountSpent ?? 0), 0);
}

/** 여행 목록 정렬 — 시작일이 있으면 최근 여행이 위로, 없으면 만든 순서(최근이 위). */
export function sortTrips(trips: Trip[]): Trip[] {
  return [...trips].sort((a, b) => {
    const ka = a.startDate ?? "";
    const kb = b.startDate ?? "";
    if (ka !== kb) return kb.localeCompare(ka);
    return b.createdAt - a.createdAt;
  });
}

/** 장소들을 다녀온 날짜별로 묶는다 — 날짜 오름차순, 날짜 없는 장소는 맨 뒤 한 묶음(date: null). */
export function groupPlacesByDate(places: PlaceVisit[]): { date: string | null; places: PlaceVisit[] }[] {
  const byDate = new Map<string, PlaceVisit[]>();
  const undated: PlaceVisit[] = [];
  for (const p of [...places].sort((a, b) => a.createdAt - b.createdAt)) {
    if (!p.visitDate) undated.push(p);
    else byDate.set(p.visitDate, [...(byDate.get(p.visitDate) ?? []), p]);
  }
  const groups: { date: string | null; places: PlaceVisit[] }[] = [...byDate.keys()].sort().map((date) => ({ date, places: byDate.get(date)! }));
  if (undated.length > 0) groups.push({ date: null, places: undated });
  return groups;
}

/** 분류별로 쓴 돈 합계 — 금액이 있는 분류만, 많이 쓴 순. 분류 없는 장소는 "기타"로 친다. */
export function spentByCategory(places: PlaceVisit[]): { category: PlaceCategory; total: number }[] {
  const totals = new Map<PlaceCategory, number>();
  for (const p of places) {
    if (!p.amountSpent) continue;
    const c = p.category ?? "기타";
    totals.set(c, (totals.get(c) ?? 0) + p.amountSpent);
  }
  return [...totals.entries()].map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);
}

/** 카카오맵 장소 검색 결과의 category_group_name을 이 앱의 분류로 옮긴다. 모르는 건 undefined. */
export function placeCategoryFromKakao(group: string | undefined): PlaceCategory | undefined {
  if (!group) return undefined;
  if (group.includes("음식점")) return "식당";
  if (group.includes("카페")) return "카페";
  if (group.includes("숙박")) return "숙소";
  if (group.includes("관광") || group.includes("문화시설")) return "관광지";
  if (group.includes("마트") || group.includes("편의점") || group.includes("백화점")) return "쇼핑";
  return undefined;
}
