import { describe, it, expect } from "vitest";
import { kpis, overlapNights, toCsv } from "./finance";

describe("finance", () => {
  it("counts only nights inside the range", () => {
    expect(overlapNights({ check_in: "2026-10-30", check_out: "2026-11-03" }, "2026-11-01", "2026-11-30")).toBe(2);
  });
  it("computes occupancy, ADR and RevPAR excluding cancelled", () => {
    const k = kpis([
      { check_in: "2026-11-01", check_out: "2026-11-03", nights: 2, subtotal: 10000, status: "checked_out" },
      { check_in: "2026-11-01", check_out: "2026-11-05", nights: 4, subtotal: 40000, status: "cancelled" },
    ], 2, "2026-11-01", "2026-11-05");
    expect(k.available).toBe(10);
    expect(k.sold).toBe(2);
    expect(k.occupancy).toBe(20);
    expect(k.adr).toBe(5000);
    expect(k.revpar).toBe(1000);
  });
  it("escapes commas in CSV", () => {
    expect(toCsv([["a,b", 1]])).toBe('"a,b",1');
  });
});
