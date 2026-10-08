import { describe, it, expect } from "vitest";
import { plateCost } from "@/components/KitchenExtras";
describe("plateCost", () => {
  it("sums qty × cost per unit, rounded", () => {
    expect(plateCost([{ qty: 0.2, cost_per_unit: 60 }, { qty: 0.05, cost_per_unit: 500 }])).toBe(37);
  });
});
