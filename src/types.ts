export type PlaceCategory = "식당" | "카페" | "숙소" | "관광지" | "쇼핑" | "기타";

export const PLACE_CATEGORIES: PlaceCategory[] = ["식당", "카페", "숙소", "관광지", "쇼핑", "기타"];

/** 여행 중 들른 장소 하나 — 식당·카페·숙소 등. tripId가 없으면 어느 여행에도 안 묶인 장소. */
export interface PlaceVisit {
  id: string;
  tripId?: string;
  name: string;
  category?: PlaceCategory;
  /** 카카오맵 장소 검색으로 채워지거나, 직접 입력. */
  address?: string;
  lat?: number;
  lng?: number;
  /** 카카오맵 상세 페이지 링크(장소 검색으로 추가했을 때만). */
  kakaoPlaceUrl?: string;
  /** "YYYY-MM-DD" */
  visitDate?: string;
  /** 영업시간 — 자유 입력(예: "매일 11:00-22:00, 월요일 휴무"). */
  openingHours?: string;
  /** 쓴 돈(원). */
  amountSpent?: number;
  /** 그때 느낀 점·했던 일. */
  note?: string;
  /** 꿀팁 — 다음엔 이렇게 하면 좋겠다 같은 것. */
  tip?: string;
  createdAt: number;
  updatedAt: number;
}

/** 여행 하나 — 장소들을 묶는 단위(선택 사항, 묶지 않고 장소만 적어도 된다). */
export interface Trip {
  id: string;
  title: string;
  /** "YYYY-MM-DD" */
  startDate?: string;
  endDate?: string;
  /** 여행지(나라/도시 등), 자유 입력. */
  region?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Vault {
  version: number;
  trips: Trip[];
  places: PlaceVisit[];
  /** 지운 여행·장소의 id → 지운 시각. 동기화 병합 때 다른 기기에 남아 있던 옛 사본이 되살아나지 않게 막는다. */
  deleted?: Record<string, number>;
}

export function emptyVault(): Vault {
  return { version: 1, trips: [], places: [], deleted: {} };
}
