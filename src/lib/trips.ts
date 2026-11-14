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
  return {
    ...vault,
    trips: vault.trips.filter((t) => t.id !== id),
    places: vault.places.map((p) => (p.tripId === id ? { ...p, tripId: undefined, updatedAt: Date.now() } : p)),
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
  return { ...vault, places: vault.places.filter((p) => p.id !== id) };
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
