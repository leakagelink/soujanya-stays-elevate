import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/rooms";
import { FOLIO_CATEGORIES, folioTotals, type FolioTotals } from "@/lib/folio";

const btn = "border border-border px-3 py-1.5 text-xs tracking-widest uppercase";
const field = "border border-border bg-transparent px-2 py-1 text-sm";
const ist = (d: string) => new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

export const POLICY_VERSION = "2026-10";
export const POLICIES = [
  ["terms", "Terms & conditions"], ["privacy", "Privacy policy"], ["cancellation", "Cancellation policy (free till 48h before check-in)"],
  ["resort_rules", "Resort rules"], ["payment", "Payment policy (pay at hotel, 30% advance)"],
] as const;

/** Save one consent row per policy for a booking. */
export async function recordConsents(userId: string, bookingId: string, policies: string[]) {
  const { data: u } = await supabase.auth.getUser();
  const recorder = u.user;
  if (!recorder) return { error: new Error("Please sign in to record policy acceptance.") };
  return supabase.from("consents").insert(policies.map((p) => ({ user_id: userId, booking_id: bookingId, policy: p, version: POLICY_VERSION, recorded_by: recorder.id })));
}

export function FolioSummary({ bookingId, room, refreshKey }: { bookingId: string; room: number; refreshKey: number }) {
  const [t, setT] = useState<FolioTotals | null>(null);
  const [consents, setConsents] = useState<string[]>([]);
  useEffect(() => {
    Promise.all([
      supabase.from("folio_charges").select("description,amount").eq("booking_id", bookingId),
      supabase.from("payments").select("amount,kind").eq("booking_id", bookingId),
      supabase.from("deposits").select("amount,status,refunded_amount").eq("booking_id", bookingId).maybeSingle(),
      supabase.from("consents").select("policy").eq("booking_id", bookingId),
    ]).then(([f, p, d, c]) => {
      setT(folioTotals(room, f.data ?? [], p.data ?? [], d.data && d.data.status === "held" ? d.data.amount : 0));
      setConsents((c.data ?? []).map((x) => x.policy));
    });
  }, [bookingId, room, refreshKey]);
  if (!t) return null;
  const sub = Math.round(t.room / 1.18);
  return (
    <div className="mt-4 bg-secondary p-3 text-sm">
      <p className="text-xs tracking-widest text-muted-foreground">FOLIO SUMMARY</p>
      <ul className="mt-1 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        <li className="flex justify-between gap-3"><span>Room</span><span>{inr(sub)}</span></li>
        <li className="flex justify-between gap-3"><span>Room GST 18%</span><span>{inr(t.room - sub)}</span></li>
        {FOLIO_CATEGORIES.filter((c) => t.byCategory[c]).map((c) => <li key={c} className="flex justify-between gap-3"><span>{c}</span><span>{inr(t.byCategory[c]!)}</span></li>)}
      </ul>
      <div className="mt-2 grid grid-cols-2 gap-x-6 border-t border-border pt-2 md:grid-cols-4">
        <span>Total <b>{inr(t.charges)}</b></span><span>Paid <b>{inr(t.paid - t.refunded)}</b></span><span>Deposit held <b>{inr(t.deposit)}</b></span>
        <span className={t.outstanding > 0 ? "text-destructive" : "text-primary"}>Outstanding <b>{inr(t.outstanding)}</b></span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Policies accepted: {consents.length ? consents.join(", ") : "none recorded"}</p>
    </div>
  );
}

type Row = [string, string | number];
function download(name: string, rows: Row[]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = name; a.click();
}

export function DailyReport() {
  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }));
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    (async () => {
      const from = new Date(date + "T00:00:00+05:30").toISOString(); const to = new Date(new Date(from).getTime() + 864e5).toISOString();
      const [b, rm, oc, fo, to2, py, ex] = await Promise.all([
        supabase.from("bookings").select("check_in,check_out,status,subtotal,nights,guests").in("status", ["checked_in", "checked_out", "confirmed", "pending"]),
        supabase.from("rooms").select("hk_status"),
        supabase.from("orders").select("total,status").gte("created_at", from).lt("created_at", to).neq("status", "cancelled"),
        supabase.from("folio_charges").select("amount,description").gte("created_at", from).lt("created_at", to),
        supabase.from("table_orders").select("total").eq("paid", true).gte("created_at", from).lt("created_at", to),
        supabase.from("payments").select("amount,kind").gte("created_at", from).lt("created_at", to),
        supabase.from("expenses").select("amount").eq("date", date),
      ]);
      const bk = b.data ?? []; const rooms = rm.data ?? [];
      const inHouse = bk.filter((x) => ["checked_in", "checked_out"].includes(x.status) && x.check_in <= date && x.check_out > date);
      const roomRev = inHouse.reduce((s, x) => s + Math.round(x.subtotal / Math.max(1, x.nights)), 0);
      const food = (oc.data ?? []).reduce((s, x) => s + x.total, 0) + (to2.data ?? []).reduce((s, x) => s + x.total, 0);
      const extras = (fo.data ?? []).filter((x) => !x.description.startsWith("Food order")).reduce((s, x) => s + x.amount, 0);
      const pays = (py.data ?? []).filter((x) => x.kind !== "refund").reduce((s, x) => s + x.amount, 0);
      const refs = (py.data ?? []).filter((x) => x.kind === "refund").reduce((s, x) => s + x.amount, 0);
      const ooo = rooms.filter((r) => r.hk_status === "out_of_order").length;
      setRows([
        ["Date", date],
        ["Arrivals", bk.filter((x) => x.check_in === date).length],
        ["Departures", bk.filter((x) => x.check_out === date).length],
        ["Current guests", inHouse.reduce((s, x) => s + x.guests, 0)],
        ["Occupied rooms", inHouse.length],
        ["Available rooms", Math.max(0, rooms.length - inHouse.length - ooo)],
        ["Maintenance rooms", ooo],
        ["Room revenue (before GST)", roomRev],
        ["Food sales (rooms + restaurant)", food],
        ["Other extras", extras],
        ["Total revenue", roomRev + food + extras],
        ["Payments received", pays],
        ["Refunds", refs],
        ["Expenses", (ex.data ?? []).reduce((s, x) => s + x.amount, 0)],
      ]);
    })();
  }, [date]);
  const money = (k: string) => !["Date", "Arrivals", "Departures", "Current guests", "Occupied rooms", "Available rooms", "Maintenance rooms"].includes(k);
  return (
    <div className="mt-6">
      <div className="panel-form flex flex-wrap items-end gap-2 print:hidden">
        <label className="text-xs">Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`block ${field}`} /></label>
        <Button variant="panel" onClick={() => rows && download(`daily-report-${date}.csv`, rows)} className={btn}>Download CSV</Button>
        <Button variant="panel" onClick={() => window.print()} className={btn}>Print / PDF</Button>
      </div>
      <div className="panel-table-scroll" tabIndex={0}><table className="mt-4 w-full max-w-xl bg-background text-sm">
        <tbody>{(rows ?? []).map(([k, v]) => <tr key={k} className="border-t border-border"><td className="p-2">{k}</td><td className="p-2 text-right font-semibold">{typeof v === "number" && money(k) ? inr(v) : v}</td></tr>)}</tbody>
      </table></div>
    </div>
  );
}

export function SystemHealth() {
  const [checks, setChecks] = useState<{ label: string; ok: boolean; info: string }[]>([]);
  const [log, setLog] = useState<{ id: string; path: string; created_at: string; user_id: string }[]>([]);
  async function run() {
    const t0 = performance.now();
    const ping = await supabase.from("room_types").select("id", { count: "exact", head: true });
    const ms = Math.round(performance.now() - t0);
    const yest = ist(new Date(Date.now() - 864e5).toISOString());
    const [audit, stuck, unpaid, oldReq, low, cash, waiting] = await Promise.all([
      supabase.from("night_audits").select("audit_date,status").order("audit_date", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "checked_in").lt("check_out", ist(new Date().toISOString())),
      supabase.from("table_orders").select("id", { count: "exact", head: true }).eq("paid", false).neq("status", "cancelled"),
      supabase.from("service_requests").select("id", { count: "exact", head: true }).neq("status", "done").lt("created_at", new Date(Date.now() - 2 * 36e5).toISOString()),
      supabase.from("ingredients").select("stock,min_stock"),
      supabase.from("cash_sessions").select("opened_at").is("closed_at", null).maybeSingle(),
      supabase.rpc("waitlist_available"),
    ]);
    const lowN = (low.data ?? []).filter((i) => Number(i.stock) <= Number(i.min_stock)).length;
    setChecks([
      { label: "Database reachable", ok: !ping.error, info: ping.error ? "Error" : `${ms} ms` },
      { label: "Night audit up to date", ok: !!audit.data && audit.data.audit_date >= yest, info: audit.data ? `Last: ${audit.data.audit_date} (${audit.data.status})` : "Never run" },
      { label: "No overstaying guests", ok: !stuck.count, info: `${stuck.count ?? 0} past checkout still checked in` },
      { label: "Restaurant bills settled", ok: !unpaid.count, info: `${unpaid.count ?? 0} open` },
      { label: "Guest requests answered (2h)", ok: !oldReq.count, info: `${oldReq.count ?? 0} waiting over 2 hours` },
      { label: "Kitchen stock above minimum", ok: lowN === 0, info: `${lowN} low` },
      { label: "Cash drawer", ok: !cash.data || Date.now() - new Date(cash.data.opened_at).getTime() < 864e5, info: cash.data ? `Open since ${new Date(cash.data.opened_at).toLocaleString("en-IN")}` : "Closed" },
      { label: "Waitlist", ok: !(waiting.data ?? []).length, info: `${(waiting.data ?? []).length} guest(s) can be offered a room` },
    ]);
    const { data } = await supabase.from("document_access_log").select("*").order("created_at", { ascending: false }).limit(25);
    setLog(data ?? []);
  }
  useEffect(() => { run(); }, []);
  return (
    <div className="mt-6">
      <Button variant="panel" onClick={run} className={btn}>Re-check</Button>
      <ul className="mt-3 grid gap-2 md:grid-cols-2">{checks.map((c) => (
        <li key={c.label} className="panel-stack flex justify-between gap-2 bg-background p-3 text-sm"><span><span className={c.ok ? "text-primary" : "text-destructive"}>{c.ok ? "●" : "▲"}</span> {c.label}</span><span className="text-muted-foreground">{c.info}</span></li>
      ))}</ul>
      <p className="mt-6 text-xs tracking-widest text-muted-foreground">GUEST ID DOCUMENT ACCESS LOG</p>
      <ul className="text-xs">{log.map((l) => <li key={l.id} className="py-0.5">{new Date(l.created_at).toLocaleString("en-IN")} · staff {l.user_id.slice(0, 8)} viewed {l.path.split("/").pop()}</li>)}</ul>
    </div>
  );
}
