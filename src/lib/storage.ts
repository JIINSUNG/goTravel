// IndexedDB에 Vault를 그대로(평문) 저장한다. 여행 기록은 관계노트와 달리 암호화하지 않기로 했다 —
// 신원 정보보다 민감도가 낮고, 구조를 훨씬 단순하게 유지할 수 있어서(CLAUDE.md 참고).
import { openDB, type IDBPDatabase } from "idb";
import type { Vault } from "../types";

const DB_NAME = "travel-log";
const DB_VERSION = 1;
const STORE = "vault";
const RECORD_KEY = "main";

export interface StoredVault extends Vault {
  updatedAt: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      },
    });
  }
  return dbPromise;
}

export async function loadStoredVault(): Promise<StoredVault | undefined> {
  const db = await getDb();
  return db.get(STORE, RECORD_KEY);
}

export async function saveStoredVault(v: StoredVault): Promise<void> {
  const db = await getDb();
  await db.put(STORE, v, RECORD_KEY);
}

export async function clearStoredVault(): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, RECORD_KEY);
}

/** 브라우저가 기기 정리 중에 이 데이터를 지우지 않도록 "영구 저장"을 요청한다. 안 되는 브라우저면 조용히 무시. */
export async function requestPersistence(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
