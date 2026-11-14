// 두 Vault를 "항목(여행·장소)별로 updatedAt이 더 최신인 쪽을 남기며" 합친다. 동기화가 다른 기기의
// 내용을 받아왔을 때, 이 기기에서 그 사이에 바뀐 것까지 같이 살리려고 쓴다.
// 지운 항목은 deleted(id → 지운 시각)로 기억해서, 다른 기기에 남아 있던 옛 사본이 병합으로 되살아나지 않게 한다.
// 단, 지운 뒤에 다른 기기에서 그 항목을 고쳤다면(updatedAt이 더 최신) 고친 쪽을 살린다.
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

function mergeDeleted(a: Record<string, number> = {}, b: Record<string, number> = {}): Record<string, number> {
  const out = { ...a };
  for (const [id, at] of Object.entries(b)) out[id] = Math.max(out[id] ?? 0, at);
  return out;
}

export function mergeVaults(local: Vault, incoming: Vault): Vault {
  const deleted = mergeDeleted(local.deleted, incoming.deleted);
  const alive = <T extends { id: string; updatedAt: number }>(item: T) => !(item.id in deleted) || item.updatedAt > deleted[item.id];
  return {
    version: Math.max(local.version, incoming.version),
    trips: mergeById(local.trips ?? [], incoming.trips ?? [])
      .filter(alive)
      .sort((a, b) => a.createdAt - b.createdAt),
    places: mergeById(local.places ?? [], incoming.places ?? [])
      .filter(alive)
      .sort((a, b) => a.createdAt - b.createdAt),
    deleted,
  };
}

/** 예전 버전에서 저장된 Vault(deleted 없음 등)를 지금 모양으로 맞춘다. */
export function normalizeVault(v: Vault): Vault {
  return { version: v.version ?? 1, trips: v.trips ?? [], places: v.places ?? [], deleted: v.deleted ?? {} };
}
