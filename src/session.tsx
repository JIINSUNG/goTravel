// 앱 전체의 데이터 상태 관리. 관계노트와 달리 잠금·암호화가 없어서 구조가 훨씬 단순하다 —
// 기기에 저장된 Vault를 불러오고(없으면 빈 Vault로 시작), 화면은 update(fn)으로 바꾸고,
// 선택적으로 구글 로그인 기반 Firebase 동기화를 켤 수 있다.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { clearStoredVault, loadStoredVault, requestPersistence, saveStoredVault } from "./lib/storage";
import type { CloudVault } from "./lib/sync";
import { mergeVaults, normalizeVault } from "./lib/merge";
import { isSyncConfigured } from "./lib/sync-env";
import { consumeSyncRedirectPending } from "./lib/sync-pending";
import { emptyVault, type Vault } from "./types";

// lib/sync.ts는 Firebase SDK 전체를 끌어오므로, 동기화를 실제로 쓸 때만 동적으로 불러온다.
const loadSync = () => import("./lib/sync");

type SyncStatus = "idle" | "syncing" | "success" | "error";

const LAST_SYNCED_KEY = "travel-last-synced-at";

interface SessionValue {
  vault: Vault | null;
  error: string | null;
  syncConfigured: boolean;
  syncStatus: SyncStatus;
  lastSyncedAt: number | null;
  update: (fn: (v: Vault) => Vault) => void;
  resetDevice: () => Promise<void>;
  syncNow: (auto?: boolean) => Promise<boolean>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [vault, setVault] = useState<Vault | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem(LAST_SYNCED_KEY);
      return saved ? Number(saved) : null;
    } catch {
      return null;
    }
  });
  const lastSyncedUpdatedAtRef = useRef<number | null>(null);
  // 이 기기에서 사용자가 직접 뭔가 바꿨을 때만 true — 실시간 구독이 받아온 걸 합친 것뿐이면 안
  // 켜서, "받기 → 다시 올리기 → 상대가 또 받아서 또 올리기"로 핑퐁 치는 걸 막는다.
  const dirtyRef = useRef(false);
  // 처음 로그인(지금 동기화)에 성공하면 올려서, 새로고침 없이도 실시간 구독이 바로 시작되게 한다.
  const [subscribeKey, setSubscribeKey] = useState(0);

  useEffect(() => {
    loadStoredVault().then(async (stored) => {
      if (stored) {
        setVault(normalizeVault(stored));
      } else {
        const fresh = emptyVault();
        await saveStoredVault({ ...fresh, updatedAt: Date.now() });
        await requestPersistence();
        setVault(fresh);
      }
    });
    if (isSyncConfigured()) {
      try {
        if (localStorage.getItem(LAST_SYNCED_KEY)) void loadSync();
      } catch {
        // localStorage를 못 읽는 환경 — 미리 받아두기만 못 할 뿐 기능엔 지장 없다
      }
    }
  }, []);

  const update = useCallback((fn: (v: Vault) => Vault) => {
    setVault((prev) => {
      if (!prev) return prev;
      const next = fn(prev);
      dirtyRef.current = true;
      void saveStoredVault({ ...next, updatedAt: Date.now() });
      return next;
    });
  }, []);

  const resetDevice = useCallback(async () => {
    await clearStoredVault();
    const fresh = emptyVault();
    await saveStoredVault({ ...fresh, updatedAt: Date.now() });
    setVault(fresh);
    setError(null);
  }, []);

  function syncFailureReason(err: unknown): string {
    const code = typeof err === "object" && err !== null && "code" in err ? String((err as { code: unknown }).code) : null;
    if (code === "auth/unauthorized-domain") return "이 주소(도메인)가 파이어베이스에 허용돼 있지 않아요.";
    if (code === "auth/popup-blocked") return "로그인 팝업이 브라우저에 막혔어요. 팝업 차단을 풀고 다시 시도해주세요.";
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "로그인 창을 닫아서 취소됐어요.";
    if (code === "permission-denied") return "권한이 없어요. (다른 계정으로 로그인했을 수 있어요)";
    if (code === "auth/redirect-in-progress") return "구글 로그인 화면으로 이동할게요. 로그인하고 돌아오면 다시 '지금 동기화'를 눌러주세요.";
    if (code === "auth/redirect-failed") return "이 앱 화면에서는 구글 로그인이 잘 안 되는 것 같아요. 브라우저로 열어서 동기화해보세요.";
    if (typeof navigator !== "undefined" && navigator.onLine === false) return "인터넷 연결이 끊겨 있어요. 연결을 확인하고 다시 시도해주세요.";
    const detail =
      typeof err === "object" && err !== null && "message" in err && typeof (err as { message: unknown }).message === "string"
        ? (err as { message: string }).message
        : code;
    return detail ? `동기화에 실패했어요. (${detail})` : "동기화에 실패했어요.";
  }

  const syncNow = useCallback(
    async (auto = false): Promise<boolean> => {
      if (!vault) return false;
      setSyncStatus("syncing");
      try {
        const { signInOwner, pullStoredVault, pushStoredVault } = await loadSync();
        const uid = await Promise.race([
          signInOwner(!auto),
          new Promise<never>((_, reject) => setTimeout(() => reject({ code: "auth/timeout" }), 45000)),
        ]);
        const cloud = await pullStoredVault(uid);
        const finalVault = cloud ? mergeVaults(vault, cloud) : vault;
        await saveStoredVault({ ...finalVault, updatedAt: Date.now() });
        setVault(finalVault);
        const now = Date.now();
        lastSyncedUpdatedAtRef.current = now;
        await pushStoredVault(uid, { ...finalVault, updatedAt: now });
        dirtyRef.current = false;
        setError(null);
        setSyncStatus("success");
        setLastSyncedAt(now);
        setSubscribeKey((k) => k + 1);
        try {
          localStorage.setItem(LAST_SYNCED_KEY, String(now));
        } catch {
          // 시크릿 모드 등 — 다음 동기화까지만 메모리에 남아도 괜찮다
        }
        return true;
      } catch (err) {
        setError(syncFailureReason(err));
        setSyncStatus("error");
        return false;
      }
    },
    [vault]
  );

  const syncNowRef = useRef(syncNow);
  useEffect(() => {
    syncNowRef.current = syncNow;
  }, [syncNow]);
  useEffect(() => {
    if (!vault || !isSyncConfigured() || !consumeSyncRedirectPending()) return;
    const timer = setTimeout(() => void syncNowRef.current(true), 0);
    return () => clearTimeout(timer);
  }, [vault]);

  // 로그인된 상태로 쓰는 동안은 클라우드 문서를 실시간 구독해서, 다른 기기가 올린 내용이 거의
  // 바로 반영되게 한다.
  useEffect(() => {
    if (!vault || !isSyncConfigured()) return;
    const unsubRef: { current: (() => void) | undefined } = { current: undefined };
    const cancelledRef = { current: false };
    void (async () => {
      const { getCurrentUid, subscribeStoredVault } = await loadSync();
      const uid = await getCurrentUid();
      if (!uid || cancelledRef.current) return;
      unsubRef.current = subscribeStoredVault(uid, (cloud: CloudVault | null) => {
        if (!cloud || cloud.updatedAt === lastSyncedUpdatedAtRef.current) return;
        lastSyncedUpdatedAtRef.current = cloud.updatedAt;
        setVault((prev) => {
          if (!prev) return prev;
          const merged = mergeVaults(prev, cloud);
          void saveStoredVault({ ...merged, updatedAt: Date.now() });
          return merged;
        });
        setLastSyncedAt(Date.now());
      });
    })();
    return () => {
      cancelledRef.current = true;
      unsubRef.current?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!vault, subscribeKey]);

  // 이 기기에서 바뀐 내용은 잠깐(0.8초) 더 안 바뀌면 자동으로 올린다.
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!vault || !isSyncConfigured()) return;
    if (!dirtyRef.current) return;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      void (async () => {
        const { getCurrentUid, pushStoredVault } = await loadSync();
        const uid = await getCurrentUid();
        if (!uid) return;
        const updatedAt = Date.now();
        lastSyncedUpdatedAtRef.current = updatedAt;
        try {
          await pushStoredVault(uid, { ...vault, updatedAt });
          dirtyRef.current = false;
          setLastSyncedAt(updatedAt);
          try {
            localStorage.setItem(LAST_SYNCED_KEY, String(updatedAt));
          } catch {
            // 시크릿 모드 등 — 다음 동기화까지만 메모리에 남아도 괜찮다
          }
        } catch {
          // 조용한 백그라운드 자동 올리기라 실패해도 화면에 에러를 안 띄운다
        }
      })();
    }, 800);
    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, [vault]);

  const value = useMemo<SessionValue>(
    () => ({ vault, error, syncConfigured: isSyncConfigured(), syncStatus, lastSyncedAt, update, resetDevice, syncNow }),
    [vault, error, syncStatus, lastSyncedAt, update, resetDevice, syncNow]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession은 SessionProvider 안에서만 쓸 수 있어요.");
  return ctx;
}
