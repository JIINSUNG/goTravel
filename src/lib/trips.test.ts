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
