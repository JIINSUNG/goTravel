import { describe, expect, it } from "vitest";
import { emptyVault, type Vault } from "../types";
import { mergeVaults } from "./merge";

describe("mergeVaults", () => {
  it("한쪽에만 있는 여행·장소는 그대로 들어간다", () => {
    const local: Vault = { ...emptyVault(), trips: [{ id: "t1", title: "오사카", createdAt: 1, updatedAt: 1 }] };
    const incoming: Vault = { ...emptyVault(), places: [{ id: "p1", name: "라멘집", createdAt: 1, updatedAt: 1 }] };
    const merged = mergeVaults(local, incoming);
    expect(merged.trips.map((t) => t.id)).toEqual(["t1"]);
    expect(merged.places.map((p) => p.id)).toEqual(["p1"]);
  });

  it("같은 id가 양쪽에 있으면 updatedAt이 더 최신인 쪽을 쓴다", () => {
    const local: Vault = { ...emptyVault(), places: [{ id: "p1", name: "로컬이름", createdAt: 1, updatedAt: 10 }] };
    const incoming: Vault = { ...emptyVault(), places: [{ id: "p1", name: "원격이름", createdAt: 1, updatedAt: 20 }] };
    const merged = mergeVaults(local, incoming);
    expect(merged.places[0].name).toBe("원격이름");
  });

  it("version은 더 큰 쪽을 쓴다", () => {
    const local: Vault = { ...emptyVault(), version: 1 };
    const incoming: Vault = { ...emptyVault(), version: 2 };
    expect(mergeVaults(local, incoming).version).toBe(2);
  });
});

describe("mergeVaults — 지운 항목", () => {
  it("한쪽에서 지운 장소는 다른 쪽 옛 사본이 있어도 되살아나지 않는다", () => {
    const local: Vault = { ...emptyVault(), deleted: { p1: 50 } };
    const incoming: Vault = { ...emptyVault(), places: [{ id: "p1", name: "라멘집", createdAt: 1, updatedAt: 10 }] };
    const merged = mergeVaults(local, incoming);
    expect(merged.places).toHaveLength(0);
    expect(merged.deleted).toEqual({ p1: 50 });
  });

  it("지운 뒤에 다른 기기에서 고쳤다면 고친 쪽을 살린다", () => {
    const local: Vault = { ...emptyVault(), deleted: { p1: 50 } };
    const incoming: Vault = { ...emptyVault(), places: [{ id: "p1", name: "라멘집", createdAt: 1, updatedAt: 60 }] };
    expect(mergeVaults(local, incoming).places.map((p) => p.id)).toEqual(["p1"]);
  });

  it("deleted가 없는 옛 Vault와도 합쳐진다", () => {
    const old = { version: 1, trips: [], places: [] } as Vault;
    expect(mergeVaults(old, { ...emptyVault(), deleted: { t1: 5 } }).deleted).toEqual({ t1: 5 });
  });
});
