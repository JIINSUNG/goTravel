export function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export function timeAgo(ts: number): string {
  const diffMin = Math.floor((Date.now() - ts) / 60000);
  if (diffMin < 1) return "방금";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}시간 전`;
  return `${Math.floor(diffH / 24)}일 전`;
}

export function formatWon(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function parseDay(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

/** "2026-05-01" → "2026.05.01 (금)". 형식이 다르면 그대로 돌려준다. */
export function formatDay(ymd: string): string {
  const d = parseDay(ymd);
  if (!d) return ymd;
  return `${ymd.replaceAll("-", ".")} (${WEEKDAYS[d.getDay()]})`;
}

/** 여행 기간 표시 — 같은 해면 끝 날짜의 연도는 뺀다. "2026.05.01 ~ 05.03 · 2박 3일" */
export function formatTripRange(start?: string, end?: string): string {
  if (!start) return "";
  const s = start.replaceAll("-", ".");
  if (!end || end === start) return s;
  const e = end.slice(0, 4) === start.slice(0, 4) ? end.slice(5).replaceAll("-", ".") : end.replaceAll("-", ".");
  const ds = parseDay(start);
  const de = parseDay(end);
  const nights = ds && de ? Math.round((de.getTime() - ds.getTime()) / 86400000) : NaN;
  return nights > 0 ? `${s} ~ ${e} · ${nights}박 ${nights + 1}일` : `${s} ~ ${e}`;
}

/** 여행 시작일 기준 며칠째인지 — "1일차". 범위 밖이거나 시작일이 없으면 null. */
export function dayNumber(tripStart: string | undefined, ymd: string): number | null {
  if (!tripStart) return null;
  const a = parseDay(tripStart);
  const b = parseDay(ymd);
  if (!a || !b) return null;
  const n = Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
  return n >= 1 ? n : null;
}

/** 오늘 날짜 "YYYY-MM-DD"(기기 시간대 기준). */
export function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
