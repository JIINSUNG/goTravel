import { describe, expect, it } from "vitest";
import { dayNumber, formatDay, formatTripRange } from "./format";

describe("format", () => {
  it("formatDay는 요일을 붙인다", () => {
    expect(formatDay("2026-05-01")).toBe("2026.05.01 (금)");
    expect(formatDay("엉망")).toBe("엉망");
  });

  it("formatTripRange는 같은 해면 끝 연도를 빼고 몇 박인지 붙인다", () => {
    expect(formatTripRange("2026-05-01", "2026-05-03")).toBe("2026.05.01 ~ 05.03 · 2박 3일");
    expect(formatTripRange("2026-12-30", "2027-01-02")).toBe("2026.12.30 ~ 2027.01.02 · 3박 4일");
    expect(formatTripRange("2026-05-01")).toBe("2026.05.01");
    expect(formatTripRange(undefined, "2026-05-01")).toBe("");
  });

  it("dayNumber는 시작일을 1일차로 센다", () => {
    expect(dayNumber("2026-05-01", "2026-05-01")).toBe(1);
    expect(dayNumber("2026-05-01", "2026-05-03")).toBe(3);
    expect(dayNumber("2026-05-01", "2026-04-30")).toBeNull();
    expect(dayNumber(undefined, "2026-05-01")).toBeNull();
  });
});
