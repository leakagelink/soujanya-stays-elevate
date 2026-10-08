import { describe, it, expect } from "vitest";
import { advanceDue, refundDue } from "./policy";

describe("booking policy", () => {
  it("advance is 30% of total", () => {
    expect(advanceDue(10000)).toBe(3000);
  });
  it("full refund when cancelled 48h or more before check-in", () => {
    expect(refundDue(3000, "2026-10-20", new Date("2026-10-18T14:00:00+05:30"))).toBe(3000);
  });
  it("no refund when cancelled less than 48h before check-in", () => {
    expect(refundDue(3000, "2026-10-20", new Date("2026-10-18T15:00:00+05:30"))).toBe(0);
  });
});
