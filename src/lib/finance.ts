export type FinBooking = { check_in: string; check_out: string; nights: number; subtotal: number; status: string; source?: string };

const day = (s: string) => new Date(s + "T00:00:00Z").getTime() / 864e5;

/** Nights of a stay that fall inside [from, to] (both inclusive dates). */
export function overlapNights(b: { check_in: string; check_out: string }, from: string, to: string): number {
  const s = Math.max(day(b.check_in), day(from));
  const e = Math.min(day(b.check_out), day(to) + 1);
  return Math.max(0, e - s);
}

/** Occupancy, ADR and RevPAR for a date range. Cancelled bookings are excluded. */
export function kpis(bookings: FinBooking[], totalRooms: number, from: string, to: string) {
  const days = day(to) - day(from) + 1;
  const available = Math.max(0, totalRooms * days);
  let sold = 0, revenue = 0;
  for (const b of bookings) {
    if (b.status === "cancelled" || b.status === "pending") continue;
    const n = overlapNights(b, from, to);
    if (!n || !b.nights) continue;
    sold += n;
    revenue += (b.subtotal / b.nights) * n;
  }
  revenue = Math.round(revenue);
  return {
    available, sold, revenue,
    occupancy: available ? Math.round((sold / available) * 1000) / 10 : 0,
    adr: sold ? Math.round(revenue / sold) : 0,
    revpar: available ? Math.round(revenue / available) : 0,
  };
}

export function toCsv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map((c) => { const s = String(c); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(",")).join("\n");
}
