export const FOLIO_CATEGORIES = ["Food", "Restaurant", "Minibar", "Laundry", "Activities", "Services", "Early check-in", "Late checkout", "Discounts", "Other"] as const;
export type FolioCategory = (typeof FOLIO_CATEGORIES)[number];

/** Map a folio line description to a guest-folio category. */
export function categorize(description: string, amount: number): FolioCategory {
  const d = description.toLowerCase();
  if (amount < 0 || d.includes("discount")) return "Discounts";
  if (d.startsWith("food order")) return "Food";
  if (d.includes("table") || d.includes("restaurant")) return "Restaurant";
  if (d.includes("room inventory") || d.includes("minibar")) return "Minibar";
  if (d.includes("laundry")) return "Laundry";
  if (d.startsWith("early check-in")) return "Early check-in";
  if (d.startsWith("late checkout")) return "Late checkout";
  if (d.includes("(incl. 18% gst)")) return "Activities";
  if (d.includes("service") || d.includes("spa") || d.includes("transfer")) return "Services";
  return "Other";
}

export type FolioTotals = { room: number; byCategory: Partial<Record<FolioCategory, number>>; charges: number; paid: number; refunded: number; deposit: number; outstanding: number };

/** Outstanding = room total + extras − (payments − refunds). Deposit is shown separately and never offsets the bill. */
export function folioTotals(room: number, lines: { description: string; amount: number }[], pays: { amount: number; kind: string }[], depositHeld: number): FolioTotals {
  const byCategory: FolioTotals["byCategory"] = {};
  for (const l of lines) { const c = categorize(l.description, l.amount); byCategory[c] = (byCategory[c] ?? 0) + l.amount; }
  const charges = room + lines.reduce((s, l) => s + l.amount, 0);
  const paid = pays.filter((p) => p.kind !== "refund").reduce((s, p) => s + p.amount, 0);
  const refunded = pays.filter((p) => p.kind === "refund").reduce((s, p) => s + p.amount, 0);
  return { room, byCategory, charges, paid, refunded, deposit: depositHeld, outstanding: charges - paid + refunded };
}
