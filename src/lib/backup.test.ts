import { describe, expect, it } from "vitest";
import { emptyVault } from "../types";
import { createPlace, createTrip } from "./trips";
import { parseBackup, serializeBackup } from "./backup";

describe("backup", () => {
  it("내보낸 걸 다시 읽으면 같은 내용이 나온다", () => {
    let v = createTrip(emptyVault(), "오사카", "t1");
    v = createPlace(v, { name: "라멘집", tripId: "t1" }, "p1");
    const back = parseBackup(serializeBackup(v));
    expect(back.trips.map((t) => t.id)).toEqual(["t1"]);
    expect(back.places.map((p) => p.id)).toEqual(["p1"]);
  });

  it("다른 JSON이나 깨진 파일은 알아들을 수 있는 문구로 거절한다", () => {
    expect(() => parseBackup("{")).toThrow("손상");
    expect(() => parseBackup(JSON.stringify({ hello: 1 }))).toThrow("백업 파일이 아니에요");
  });

  it("모양이 이상한 항목은 걸러낸다", () => {
    const text = JSON.stringify({ format: "travel-log-backup", vault: { trips: [{ id: 1 }], places: [{ id: "p1", name: "a", createdAt: 1, updatedAt: 1 }] } });
    const v = parseBackup(text);
    expect(v.trips).toHaveLength(0);
    expect(v.places).toHaveLength(1);
  });
});
