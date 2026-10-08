import { describe, it, expect } from "vitest";
import { categorize, folioTotals } from "./folio";

describe("folio", () => {
  it("files lines into categories", () => {
    expect(categorize("Food order #AB12CD (incl. 5% GST)", 500)).toBe("Food");
    expect(categorize("Chips × 2 (room inventory)", 120)).toBe("Minibar");
    expect(categorize("Early check-in (from 10:00)", 1000)).toBe("Early check-in");
    expect(categorize("Ayurvedic massage · 2026-10-10 10:00 (incl. 18% GST)", 2360)).toBe("Activities");
    expect(categorize("Goodwill", -500)).toBe("Discounts");
  });
  it("outstanding = charges − payments + refunds; deposit does not reduce it", () => {
    const t = folioTotals(10000, [{ description: "Laundry", amount: 300 }], [{ amount: 3000, kind: "payment" }, { amount: 500, kind: "refund" }], 2000);
    expect(t.charges).toBe(10300);
    expect(t.outstanding).toBe(7800);
    expect(t.deposit).toBe(2000);
  });
});
