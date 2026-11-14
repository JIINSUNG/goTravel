import { describe, expect, it } from "vitest";
import { emptyVault } from "../types";
import {
  createPlace,
  createTrip,
  deletePlace,
  deleteTrip,
  findPlace,
  findTrip,
  placesForTrip,
  searchPlaces,
  tripTotalSpent,
  unassignedPlaces,
  sortTrips,
  groupPlacesByDate,
  spentByCategory,
  placeCategoryFromKakao,
  updatePlace,
  updateTrip,
} from "./trips";

describe("trips", () => {
  it("createTrip으로 여행을 추가하면 목록에 하나 늘어난다", () => {
    const v = createTrip(emptyVault(), "오사카 여행");
    expect(v.trips).toHaveLength(1);
    expect(v.trips[0].title).toBe("오사카 여행");
  });

  it("updateTrip은 넘긴 필드만 바꾼다", () => {
    let v = createTrip(emptyVault(), "오사카 여행", "t1");
    v = updateTrip(v, "t1", { region: "일본", startDate: "2026-05-01" });
    expect(findTrip(v, "t1")?.region).toBe("일본");
    expect(findTrip(v, "t1")?.title).toBe("오사카 여행");
  });

  it("deleteTrip은 여행만 지우고, 묶인 장소는 tripId만 풀어서 남긴다", () => {
    let v = createTrip(emptyVault(), "오사카 여행", "t1");
    v = createPlace(v, { name: "라멘집", tripId: "t1" }, "p1");
    v = deleteTrip(v, "t1");
    expect(v.trips).toHaveLength(0);
    expect(findPlace(v, "p1")).toBeDefined();
    expect(findPlace(v, "p1")?.tripId).toBeUndefined();
  });

  it("createPlace·updatePlace·deletePlace가 기본 CRUD대로 동작한다", () => {
    let v = createPlace(emptyVault(), { name: "라멘집", category: "식당" }, "p1");
    expect(findPlace(v, "p1")?.name).toBe("라멘집");

    v = updatePlace(v, "p1", { amountSpent: 12000, note: "맛있었다" });
    expect(findPlace(v, "p1")?.amountSpent).toBe(12000);
    expect(findPlace(v, "p1")?.note).toBe("맛있었다");

    v = deletePlace(v, "p1");
    expect(findPlace(v, "p1")).toBeUndefined();
  });

  it("placesForTrip·unassignedPlaces가 tripId 기준으로 갈라서 보여준다", () => {
    let v = createTrip(emptyVault(), "오사카 여행", "t1");
    v = createPlace(v, { name: "라멘집", tripId: "t1" }, "p1");
    v = createPlace(v, { name: "동네카페" }, "p2");
    expect(placesForTrip(v, "t1").map((p) => p.id)).toEqual(["p1"]);
    expect(unassignedPlaces(v).map((p) => p.id)).toEqual(["p2"]);
  });

  it("tripTotalSpent는 그 여행에 속한 장소들의 amountSpent 합계", () => {
    let v = createTrip(emptyVault(), "오사카 여행", "t1");
    v = createPlace(v, { name: "라멘집", tripId: "t1" }, "p1");
    v = createPlace(v, { name: "카페", tripId: "t1" }, "p2");
    v = updatePlace(v, "p1", { amountSpent: 12000 });
    v = updatePlace(v, "p2", { amountSpent: 5000 });
    expect(tripTotalSpent(v, "t1")).toBe(17000);
  });

  it("searchPlaces는 이름·주소·메모·꿀팁·분류로 찾는다", () => {
    let v = createPlace(emptyVault(), { name: "민수네 라멘집", category: "식당" }, "p1");
    v = createPlace(v, { name: "동네카페", category: "카페" }, "p2");
    v = updatePlace(v, "p2", { tip: "창가 자리가 좋아요" });

    expect(searchPlaces(v, "라멘").map((p) => p.id)).toEqual(["p1"]);
    expect(searchPlaces(v, "창가").map((p) => p.id)).toEqual(["p2"]);
    expect(searchPlaces(v, "").map((p) => p.id)).toEqual(["p1", "p2"]);
  });
});

describe("삭제 기록", () => {
  it("deletePlace·deleteTrip은 deleted에 지운 시각을 남긴다", () => {
    let v = createTrip(emptyVault(), "오사카", "t1");
    v = createPlace(v, { name: "라멘집", tripId: "t1" }, "p1");
    v = deletePlace(v, "p1");
    v = deleteTrip(v, "t1");
    expect(Object.keys(v.deleted ?? {}).sort()).toEqual(["p1", "t1"]);
  });

  it("deleteTrip으로 풀린 장소에는 tripId 키 자체가 남지 않는다(동기화 때 undefined 방지)", () => {
    let v = createTrip(emptyVault(), "오사카", "t1");
    v = createPlace(v, { name: "라멘집", tripId: "t1" }, "p1");
    v = deleteTrip(v, "t1");
    expect("tripId" in findPlace(v, "p1")!).toBe(false);
  });
});

describe("목록 도우미", () => {
  it("sortTrips는 시작일 최근순, 시작일 없으면 뒤로", () => {
    let v = createTrip(emptyVault(), "A", "a");
    v = createTrip(v, "B", "b");
    v = createTrip(v, "C", "c");
    v = updateTrip(v, "a", { startDate: "2025-01-01" });
    v = updateTrip(v, "b", { startDate: "2026-01-01" });
    expect(sortTrips(v.trips).map((t) => t.id)).toEqual(["b", "a", "c"]);
  });

  it("groupPlacesByDate는 날짜순으로 묶고 날짜 없는 건 맨 뒤", () => {
    let v = createPlace(emptyVault(), { name: "x" }, "x");
    v = createPlace(v, { name: "y" }, "y");
    v = createPlace(v, { name: "z" }, "z");
    v = updatePlace(v, "y", { visitDate: "2026-05-02" });
    v = updatePlace(v, "z", { visitDate: "2026-05-01" });
    expect(groupPlacesByDate(v.places).map((g) => g.date)).toEqual(["2026-05-01", "2026-05-02", null]);
  });

  it("spentByCategory는 분류별 합계를 많이 쓴 순으로", () => {
    let v = createPlace(emptyVault(), { name: "a", category: "식당" }, "a");
    v = createPlace(v, { name: "b", category: "카페" }, "b");
    v = createPlace(v, { name: "c" }, "c");
    v = updatePlace(v, "a", { amountSpent: 10000 });
    v = updatePlace(v, "b", { amountSpent: 5000 });
    v = updatePlace(v, "c", { amountSpent: 20000 });
    expect(spentByCategory(v.places)).toEqual([
      { category: "기타", total: 20000 },
      { category: "식당", total: 10000 },
      { category: "카페", total: 5000 },
    ]);
  });

  it("placeCategoryFromKakao", () => {
    expect(placeCategoryFromKakao("음식점")).toBe("식당");
    expect(placeCategoryFromKakao("카페")).toBe("카페");
    expect(placeCategoryFromKakao("숙박")).toBe("숙소");
    expect(placeCategoryFromKakao("관광명소")).toBe("관광지");
    expect(placeCategoryFromKakao("병원")).toBeUndefined();
  });
});
