import { useRef, useState } from "react";
import { useSession } from "../session";
import { isKakaoConfigured } from "../lib/kakao";
import { timeAgo } from "../lib/format";
import { stickyHeaderStyle } from "../lib/layout";
import { backupFileName, parseBackup, serializeBackup } from "../lib/backup";
import { mergeVaults } from "../lib/merge";

export function Settings() {
  const { vault, update, syncConfigured, syncNow, syncStatus, lastSyncedAt, error: syncError, resetDevice } = useSession();
  const [message, setMessage] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    if (!vault) return;
    const blob = new Blob([serializeBackup(vault)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = backupFileName();
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setBackupError(null);
    setMessage("백업 파일을 저장했어요.");
  };

  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const imported = parseBackup(await file.text());
      // 덮어쓰지 않고 합친다 — 같은 기록은 더 최근에 고친 쪽이 남고, 이 기기에만 있던 기록도 그대로 남는다.
      update((v) => mergeVaults(v, imported));
      setBackupError(null);
      setMessage(`백업을 불러왔어요. (여행 ${imported.trips.length}개 · 장소 ${imported.places.length}곳)`);
    } catch (err) {
      setBackupError(err instanceof Error ? err.message : "백업을 불러오지 못했어요.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSync = async () => {
    const ok = await syncNow();
    if (ok) setMessage("동기화했어요.");
  };

  const handleReset = async () => {
    if (!confirm("이 기기에 저장된 여행 기록을 전부 지울까요? 동기화를 켜둔 적이 있다면 '지금 동기화'로 클라우드 내용을 다시 받아올 수 있어요.")) return;
    await resetDevice();
    setMessage("이 기기 기록을 지웠어요.");
  };

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: 20, paddingTop: 16 }}>
      <div style={stickyHeaderStyle}>
        <h1 style={{ fontSize: 20, margin: 0 }}>설정</h1>
      </div>

      {message && <p style={{ margin: 0, fontSize: 13, color: "var(--ok)" }}>{message}</p>}

      {syncConfigured ? (
        <section style={sectionStyle}>
          <h2 style={headingStyle}>동기화</h2>
          <p style={hintStyle}>구글 계정으로 다른 기기와 맞춰요. 암호화는 하지 않아요 — 접근 제어(로그인한 본인만)가 유일한 방어선이에요.</p>
          <button type="button" onClick={handleSync} disabled={syncStatus === "syncing"} style={primaryBtnStyle}>
            {syncStatus === "syncing" ? "동기화 중…" : "지금 동기화"}
          </button>
          {syncStatus === "error" && syncError ? (
            <p style={{ ...hintStyle, color: "var(--warn)" }}>⚠️ {syncError}</p>
          ) : lastSyncedAt ? (
            <p style={hintStyle}>✓ 마지막 동기화: {timeAgo(lastSyncedAt)} · 여행 {vault?.trips.length ?? 0}개 · 장소 {vault?.places.length ?? 0}곳</p>
          ) : (
            <p style={hintStyle}>아직 동기화한 적 없어요.</p>
          )}
        </section>
      ) : (
        <section style={sectionStyle}>
          <h2 style={headingStyle}>동기화</h2>
          <p style={hintStyle}>
            아직 설정 안 됨 — .env.local에 VITE_FIREBASE_* 값을 채우면 다른 기기와 맞출 수 있어요.
          </p>
        </section>
      )}

      <section style={sectionStyle}>
        <h2 style={headingStyle}>지도</h2>
        <p style={hintStyle}>
          {isKakaoConfigured()
            ? "카카오맵 연동이 켜져 있어요 — 장소 추가 시 이름으로 검색할 수 있어요."
            : "아직 설정 안 됨 — .env.local에 VITE_KAKAO_APP_KEY를 채우면 장소를 이름으로 검색할 수 있어요. 지금은 주소를 직접 입력해야 해요."}
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>백업</h2>
        <p style={hintStyle}>
          {syncConfigured ? "" : "동기화를 안 쓰면 기록이 이 기기 브라우저 안에만 있어요. 폰을 바꾸거나 브라우저 데이터를 지우기 전에 파일로 빼두세요. "}
          불러오면 지금 기록을 덮어쓰지 않고 합쳐요.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={handleExport} style={primaryBtnStyle}>
            백업 파일 저장
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} style={secondaryBtnStyle}>
            백업 불러오기
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => void handleImport(e.target.files?.[0])} />
        </div>
        {backupError && <p style={{ ...hintStyle, color: "var(--warn)" }}>⚠️ {backupError}</p>}
      </section>

      <section style={sectionStyle}>
        <h2 style={headingStyle}>이 기기 기록 초기화</h2>
        <p style={hintStyle}>기록이 꼬였거나 처음부터 다시 시작하고 싶을 때 쓰세요.</p>
        <button type="button" onClick={handleReset} style={warnBtnStyle}>
          이 기기 기록 지우고 다시 시작하기
        </button>
      </section>
    </main>
  );
}

const sectionStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 10, padding: 14, borderRadius: "var(--radius)", border: "1px solid var(--line)", background: "var(--card)" };
const headingStyle: React.CSSProperties = { fontSize: 15, margin: 0 };
const hintStyle: React.CSSProperties = { color: "var(--muted)", fontSize: 12.5, margin: 0 };
const primaryBtnStyle: React.CSSProperties = {
  alignSelf: "flex-start",
  padding: "10px 16px",
  borderRadius: "var(--radius)",
  border: "none",
  background: "var(--accent)",
  color: "var(--accent-fg)",
  fontSize: 14,
  fontWeight: 600,
};
const secondaryBtnStyle: React.CSSProperties = {
  alignSelf: "flex-start",
  padding: "10px 16px",
  borderRadius: "var(--radius)",
  border: "1px solid var(--line)",
  background: "var(--field)",
  color: "var(--fg)",
  fontSize: 14,
  fontWeight: 600,
};
const warnBtnStyle: React.CSSProperties = {
  alignSelf: "flex-start",
  padding: "10px 16px",
  borderRadius: "var(--radius)",
  border: "1px solid var(--warn)",
  background: "none",
  color: "var(--warn)",
  fontSize: 13.5,
};
