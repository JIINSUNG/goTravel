// 백업 파일(JSON) 내보내기·불러오기. 동기화를 안 켜면 기록이 이 기기 브라우저 안에만 있어서, 폰을 바꾸거나
// 브라우저 데이터가 지워지면 다 사라진다 — 그걸 대비해 파일로 빼두는 용도(남에게 보내는 공유 기능 아님).
import type { PlaceVisit, Trip, Vault } from "../types";
import { normalizeVault } from "./merge";

const FORMAT = "travel-log-backup";

export function serializeBackup(vault: Vault, now = Date.now()): string {
  return JSON.stringify({ format: FORMAT, exportedAt: now, vault }, null, 2);
}

function isItem(x: unknown): x is { id: string; createdAt: number; updatedAt: number } {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.createdAt === "number" && typeof o.updatedAt === "number";
}

/** 백업 파일 내용을 Vault로 읽는다. 이 앱이 만든 파일이 아니거나 깨졌으면 사용자에게 보여줄 문구로 throw. */
export function parseBackup(text: string): Vault {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("백업 파일을 읽지 못했어요. 파일이 손상됐을 수 있어요.");
  }
  const root = data as { format?: unknown; vault?: unknown };
  if (root?.format !== FORMAT || typeof root.vault !== "object" || root.vault === null) {
    throw new Error("여행기록 백업 파일이 아니에요.");
  }
  const v = root.vault as Partial<Vault>;
  const trips = Array.isArray(v.trips) ? v.trips.filter((t): t is Trip => isItem(t) && typeof (t as Trip).title === "string") : [];
  const places = Array.isArray(v.places) ? v.places.filter((p): p is PlaceVisit => isItem(p) && typeof (p as PlaceVisit).name === "string") : [];
  const deleted = typeof v.deleted === "object" && v.deleted !== null ? v.deleted : {};
  return normalizeVault({ version: typeof v.version === "number" ? v.version : 1, trips, places, deleted });
}

export function backupFileName(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `여행기록-백업-${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}.json`;
}
