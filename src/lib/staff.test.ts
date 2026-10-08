import { describe, it, expect } from "vitest";
import { hoursWorked } from "./staff";

describe("attendance hours", () => {
  it("counts a closed shift", () => {
    expect(hoursWorked("2026-10-08T09:00:00Z", "2026-10-08T17:30:00Z")).toBe(8.5);
  });
  it("counts an open shift until now", () => {
    expect(hoursWorked("2026-10-08T09:00:00Z", null, new Date("2026-10-08T11:00:00Z"))).toBe(2);
  });
});
