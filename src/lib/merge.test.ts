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
