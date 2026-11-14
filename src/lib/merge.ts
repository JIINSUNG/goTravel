// 두 Vault를 "항목(여행·장소)별로 updatedAt이 더 최신인 쪽을 남기며" 합친다. 동기화가 다른 기기의
// 내용을 받아왔을 때, 이 기기에서 그 사이에 바뀐 것까지 같이 살리려고 쓴다.
import type { Vault } from "../types";

function mergeById<T extends { id: string; updatedAt: number }>(a: T[], b: T[]): T[] {
  const byId = new Map<string, T>();
  for (const item of a) byId.set(item.id, item);
  for (const item of b) {
    const existing = byId.get(item.id);
    if (!existing || item.updatedAt > existing.updatedAt) byId.set(item.id, item);
  }
  return [...byId.values()];
}

export function mergeVaults(local: Vault, incoming: Vault): Vault {
  return {
    version: Math.max(local.version, incoming.version),
    trips: mergeById(local.trips, incoming.trips).sort((a, b) => a.createdAt - b.createdAt),
    places: mergeById(local.places, incoming.places).sort((a, b) => a.createdAt - b.createdAt),
  };
}
