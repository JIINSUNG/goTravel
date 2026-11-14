// Firebase 구글 로그인 + Firestore로, 로그인한 사람의 Vault를 계정별로 동기화한다.
// firestore.rules가 "자기 uid 문서만" 읽고 쓸 수 있게 막아서, 다른 사람 Vault는 아예 안 보인다.
// 관계노트와 달리 암호화는 안 한다 — 여행 기록은 신원 정보보다 민감도가 낮다고 보고 사용자가 선택한
// 트레이드오프(CLAUDE.md 참고). 2단계 전용 — VITE_FIREBASE_* 환경변수가 없으면 아무 것도 안 한다.
import { initializeApp, type FirebaseApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, signInWithPopup, signInWithRedirect, type Auth } from "firebase/auth";
import {
  doc,
  getDoc,
  getFirestore,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentSingleTabManager,
  setDoc,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore";
import { markSyncRedirectPending } from "./sync-pending";
import type { Vault } from "../types";

export interface CloudVault extends Vault {
  updatedAt: number;
}

export { isSyncConfigured } from "./sync-env";

const VAULTS_COLLECTION = "vaults";

function readEnv(key: string): string | undefined {
  return (import.meta.env as Record<string, string | undefined>)[key];
}

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

function getApp(): FirebaseApp {
  if (!app) {
    app = initializeApp({
      apiKey: readEnv("VITE_FIREBASE_API_KEY"),
      authDomain: readEnv("VITE_FIREBASE_AUTH_DOMAIN"),
      projectId: readEnv("VITE_FIREBASE_PROJECT_ID"),
      storageBucket: readEnv("VITE_FIREBASE_STORAGE_BUCKET"),
      messagingSenderId: readEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
      appId: readEnv("VITE_FIREBASE_APP_ID"),
    });
  }
  return app;
}

function getAuthInstance(): Auth {
  if (!authInstance) authInstance = getAuth(getApp());
  return authInstance;
}

function getDb(): Firestore {
  if (!dbInstance) {
    try {
      dbInstance = initializeFirestore(getApp(), {
        localCache: persistentLocalCache({ tabManager: persistentSingleTabManager({}) }),
        ignoreUndefinedProperties: true,
      });
    } catch {
      dbInstance = getFirestore(getApp());
    }
  }
  return dbInstance;
}

/** 홈 화면에 설치해서 standalone으로 떠 있는 중인지 — 일부 PWA 환경은 signInWithPopup이 제대로
 * 안 이어져서, 팝업이 막힌 경우에만 리다이렉트로 대체한다. */
function isStandalonePwa(): boolean {
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function errorCode(err: unknown): string | null {
  return typeof err === "object" && err !== null && "code" in err ? String((err as { code: unknown }).code) : null;
}

export async function signInOwner(allowRedirect = true): Promise<string> {
  const auth = getAuthInstance();
  await auth.authStateReady();
  if (auth.currentUser) return auth.currentUser.uid;

  try {
    const { user } = await signInWithPopup(auth, new GoogleAuthProvider());
    return user.uid;
  } catch (err) {
    const code = errorCode(err);
    const popupBlocked = code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment";
    if (!popupBlocked || !isStandalonePwa()) throw err;
    if (!allowRedirect) throw { code: "auth/redirect-failed" };
    markSyncRedirectPending();
    await signInWithRedirect(auth, new GoogleAuthProvider());
    throw { code: "auth/redirect-in-progress" };
  }
}

export async function isSignedIn(): Promise<boolean> {
  const auth = getAuthInstance();
  await auth.authStateReady();
  return !!auth.currentUser;
}

export async function getCurrentUid(): Promise<string | null> {
  const auth = getAuthInstance();
  await auth.authStateReady();
  return auth.currentUser?.uid ?? null;
}

export async function pullStoredVault(uid: string): Promise<CloudVault | null> {
  const snap = await getDoc(doc(getDb(), VAULTS_COLLECTION, uid));
  if (!snap.exists()) return null;
  return snap.data() as CloudVault;
}

export async function pushStoredVault(uid: string, cloud: CloudVault): Promise<void> {
  // Firestore는 값이 undefined인 필드를 (중첩된 장소 안에 있어도) 거부한다. 장소를 고치면 비운 칸이
  // undefined로 남기 때문에, JSON 왕복으로 깊은 곳까지 싹 걸러낸다 — 안 그러면 자동 올리기가 조용히 실패한다.
  const clean = JSON.parse(JSON.stringify(cloud)) as CloudVault;
  await setDoc(doc(getDb(), VAULTS_COLLECTION, uid), clean);
}

export function subscribeStoredVault(uid: string, onChange: (cloud: CloudVault | null) => void): Unsubscribe {
  return onSnapshot(doc(getDb(), VAULTS_COLLECTION, uid), (snap) => {
    onChange(snap.exists() ? (snap.data() as CloudVault) : null);
  });
}
