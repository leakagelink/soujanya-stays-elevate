import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/rooms";

type RoomOpt = { id: string; name: string; max_guests: number };
const btn = "border border-border px-3 py-1.5 text-xs tracking-widest uppercase";
const field = "border border-border bg-transparent px-2 py-1 text-sm";

/** Change dates, guests or room type. The server re-checks availability and reprices. */
export function ModifyBooking({ booking, onDone }: {
  booking: { id: string; check_in: string; check_out: string; guests: number; room_type_id: string; total: number; status: string };
  onDone: () => void;
}) {
  const [rooms, setRooms] = useState<RoomOpt[]>([]);
  const [ci, setCi] = useState(booking.check_in);
  const [co, setCo] = useState(booking.check_out);
  const [g, setG] = useState(booking.guests);
  const [rt, setRt] = useState(booking.room_type_id);
  const [msg, setMsg] = useState("");
  const [free, setFree] = useState<number | null>(null);
  useEffect(() => { supabase.from("room_types").select("id,name,max_guests").order("sort_order").then(({ data }) => setRooms(data ?? [])); }, []);
  useEffect(() => {
    if (!ci || !co || co <= ci) return setFree(null);
    supabase.rpc("rooms_free", { _room_type_id: rt, _in: ci, _out: co, _exclude: booking.id }).then(({ data }) => setFree(data ?? 0));
  }, [ci, co, rt, booking.id]);
  async function save() {
    setMsg("");
    const { data, error } = await supabase.rpc("modify_booking", { _id: booking.id, _check_in: ci, _check_out: co, _guests: g, _room_type_id: rt });
    if (error) return setMsg(error.message);
    const d = data ?? 0;
    setMsg(d === 0 ? "Updated. No price change." : d > 0 ? `Updated. Guest owes ${inr(d)} more.` : `Updated. ${inr(-d)} less than before — refund or adjust if already paid.`);
    onDone();
  }
  const locked = booking.status === "checked_in";
  return (
    <div className="panel-form mt-3 flex flex-wrap items-end gap-3 bg-secondary p-3 text-xs">
      <label>Check-in<input type="date" disabled={locked} value={ci} onChange={(e) => setCi(e.target.value)} className={`block ${field}`} /></label>
      <label>Check-out<input type="date" min={ci} value={co} onChange={(e) => setCo(e.target.value)} className={`block ${field}`} /></label>
      <label>Guests<input type="number" min={1} value={g} onChange={(e) => setG(+e.target.value)} className={`block w-16 ${field}`} /></label>
      <label>Room<select disabled={locked} value={rt} onChange={(e) => setRt(e.target.value)} className={`block ${field}`}>{rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
      {free !== null && <span className={free > 0 ? "text-primary" : "text-destructive"}>{free > 0 ? `${free} free` : "Not available"}</span>}
      <Button variant="panel" onClick={save} disabled={free === 0} className={`${btn} bg-gold text-primary disabled:opacity-40`}>Save change</Button>
      {msg && <p className="w-full text-gold">{msg}</p>}
    </div>
  );
}

export function BookingHistory({ bookingId }: { bookingId: string }) {
  const [rows, setRows] = useState<{ id: string; action: string; details: string; created_at: string }[]>([]);
  useEffect(() => { supabase.from("booking_history").select("id,action,details,created_at").eq("booking_id", bookingId).order("created_at").then(({ data }) => setRows(data ?? [])); }, [bookingId]);
  if (!rows.length) return null;
  return (
    <div className="mt-4">
      <p className="text-xs tracking-widest text-muted-foreground">BOOKING HISTORY</p>
      <ul className="mt-1 text-xs">{rows.map((r) => <li key={r.id} className="py-0.5"><span className="text-muted-foreground">{new Date(r.created_at).toLocaleString("en-IN")}</span> · <b className="uppercase">{r.action.replace("_", " ")}</b> · {r.details}</li>)}</ul>
    </div>
  );
}

type Dep = { id: string; amount: number; method: string; received_at: string; status: string; deduction: number; deduction_reason: string; refunded_amount: number; refund_method: string; refunded_at: string | null };

export function DepositAndExtras({ bookingId, onCharged }: { bookingId: string; onCharged: () => void }) {
  const [dep, setDep] = useState<Dep | null>(null);
  const [def, setDef] = useState(0);
  const [settings, setSettings] = useState<{ early_checkin_fee: number; late_checkout_fee: number; early_checkin_from: string; late_checkout_until: string } | null>(null);
  const [amt, setAmt] = useState("");
  const [method, setMethod] = useState("cash");
  const [ded, setDed] = useState("0");
  const [reason, setReason] = useState("");
  const [items, setItems] = useState<{ id: string; name: string; price: number; category: string }[]>([]);
  const [qty, setQty] = useState<Record<string, number>>({});
  async function load() {
    const { data } = await supabase.from("deposits").select("*").eq("booking_id", bookingId).maybeSingle();
    setDep(data as Dep | null);
  }
  useEffect(() => {
    load();
    supabase.from("resort_settings").select("*").eq("id", 1).single().then(({ data }) => { if (data) { setSettings(data); setDef(data.security_deposit); setAmt(String(data.security_deposit)); } });
    supabase.from("minibar_items").select("id,name,price,category").eq("active", true).order("category").then(({ data }) => setItems(data ?? []));
  }, [bookingId]);
  async function receive() {
    const n = parseInt(amt, 10); if (isNaN(n) || n < 0) return;
    const { error } = await supabase.from("deposits").insert({ booking_id: bookingId, amount: n, method });
    if (error) alert(error.message); load();
  }
  async function refund() {
    if (!dep) return;
    const d = Math.min(dep.amount, Math.max(0, parseInt(ded, 10) || 0));
    if (d > 0 && !reason.trim()) return alert("Please write the reason for the deduction.");
    const { error } = await supabase.from("deposits").update({ status: "refunded", deduction: d, deduction_reason: reason.trim(), refunded_amount: dep.amount - d, refund_method: method, refunded_at: new Date().toISOString() }).eq("id", dep.id);
    if (error) alert(error.message); load();
  }
  async function fee(kind: "early" | "late") {
    const { error } = await supabase.rpc("apply_time_fee", { _booking_id: bookingId, _kind: kind });
    if (error) alert(error.message); onCharged();
  }
  async function minibar() {
    const rows = items.filter((i) => qty[i.id]).map((i) => ({ booking_id: bookingId, description: `${i.name} × ${qty[i.id]} (room inventory)`, amount: i.price * qty[i.id]! }));
    if (!rows.length) return;
    const { error } = await supabase.from("folio_charges").insert(rows);
    if (error) alert(error.message); setQty({}); onCharged();
  }
  return (
    <div className="mt-4 grid gap-4 border-t border-border pt-4 md:grid-cols-3">
      <div>
        <p className="text-xs tracking-widest text-muted-foreground">SECURITY DEPOSIT</p>
        {!dep ? (
          <div className="panel-form mt-2 flex flex-wrap gap-2 text-sm">
            <input value={amt} onChange={(e) => setAmt(e.target.value)} className={`w-24 ${field}`} placeholder={String(def)} />
            <select value={method} onChange={(e) => setMethod(e.target.value)} className={field}><option>cash</option><option>upi</option><option>card</option></select>
            <Button variant="panel" onClick={receive} className={btn}>Received</Button>
          </div>
        ) : (
          <div className="mt-2 text-sm">
            <p>{inr(dep.amount)} by {dep.method} · {new Date(dep.received_at).toLocaleDateString("en-IN")}</p>
            {dep.status === "refunded" ? (
              <p className="text-muted-foreground">Refunded {inr(dep.refunded_amount)} by {dep.refund_method} on {dep.refunded_at && new Date(dep.refunded_at).toLocaleDateString("en-IN")}{dep.deduction > 0 && ` · deducted ${inr(dep.deduction)} (${dep.deduction_reason})`}</p>
            ) : (
              <div className="panel-form mt-2 flex flex-wrap gap-2">
                <input value={ded} onChange={(e) => setDed(e.target.value)} className={`w-20 ${field}`} placeholder="Deduct ₹" />
                <input value={reason} onChange={(e) => setReason(e.target.value)} className={`flex-1 ${field}`} placeholder="Reason (damage…)" />
                <select value={method} onChange={(e) => setMethod(e.target.value)} className={field}><option>cash</option><option>upi</option><option>card</option></select>
                <Button variant="panel" onClick={refund} className={btn}>Refund</Button>
              </div>
            )}
          </div>
        )}
      </div>
      <div>
        <p className="text-xs tracking-widest text-muted-foreground">EARLY / LATE</p>
        {settings && <div className="mt-2 flex flex-wrap gap-2">
          <Button variant="panel" onClick={() => fee("early")} className={btn}>Early check-in {inr(settings.early_checkin_fee)}</Button>
          <Button variant="panel" onClick={() => fee("late")} className={btn}>Late checkout {inr(settings.late_checkout_fee)}</Button>
        </div>}
      </div>
      <div>
        <p className="text-xs tracking-widest text-muted-foreground">MINIBAR / ROOM ITEMS USED</p>
        <ul className="mt-2 text-sm">{items.map((i) => (
          <li key={i.id} className="flex items-center justify-between py-0.5"><span>{i.name} · {inr(i.price)}</span>
            <input type="number" min={0} value={qty[i.id] ?? ""} onChange={(e) => setQty({ ...qty, [i.id]: Math.max(0, +e.target.value) })} className={`w-14 ${field}`} /></li>
        ))}</ul>
        <Button variant="panel" onClick={minibar} className={`mt-2 ${btn}`}>Add to bill</Button>
      </div>
    </div>
  );
}

export function WaitlistPanel() {
  const [rows, setRows] = useState<{ id: string; guest_name: string; phone: string; email: string; check_in: string; check_out: string; guests: number; status: string; room_types: { name: string } | null }[]>([]);
  const [avail, setAvail] = useState<Set<string>>(new Set());
  async function load() {
    const [w, a] = await Promise.all([
      supabase.from("waitlist").select("*,room_types(name)").in("status", ["waiting", "notified"]).order("check_in"),
      supabase.rpc("waitlist_available"),
    ]);
    setRows((w.data as typeof rows) ?? []);
    setAvail(new Set((a.data ?? []).map((r) => r.id)));
  }
  useEffect(() => { load(); }, []);
  async function set(id: string, status: string) { await supabase.from("waitlist").update({ status }).eq("id", id); load(); }
  return (
    <div className="mt-6">
      <p className="text-sm text-muted-foreground">Guests waiting for a sold-out room. A green tag means a room is free now — call or WhatsApp them, then mark notified.</p>
      {rows.length === 0 ? <p className="mt-4 text-muted-foreground">No one is waiting.</p> : (
        <ul className="mt-4 grid gap-2">{rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 bg-background p-4 text-sm">
            <span><b>{r.guest_name}</b> · {r.room_types?.name} · {r.check_in} → {r.check_out} · {r.guests} guest(s) · {r.phone} {r.email && `· ${r.email}`}</span>
            <span className="flex items-center gap-2">
              {avail.has(r.id) && <span className="bg-primary px-2 py-0.5 text-xs text-primary-foreground">ROOM FREE NOW</span>}
              <span className="text-xs uppercase">{r.status}</span>
              {r.status === "waiting" && <a href={`https://wa.me/${r.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello ${r.guest_name}, a ${r.room_types?.name} is now available at Soujanya Stays for ${r.check_in} to ${r.check_out}. Reply to book.`)}`} target="_blank" rel="noreferrer" onClick={() => set(r.id, "notified")} className={btn}>Notify</a>}
              <Button variant="panel" onClick={() => set(r.id, "booked")} className={btn}>Booked</Button>
              <Button variant="panel" onClick={() => set(r.id, "cancelled")} className={btn}>Remove</Button>
            </span>
          </li>
        ))}</ul>
      )}
    </div>
  );
}

export function NightAudit({ canEditSettings }: { canEditSettings: boolean }) {
  const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const [date, setDate] = useState(yesterday);
  const [rows, setRows] = useState<{ id: string; audit_date: string; arrivals: number; departures: number; in_house: number; no_shows: number; occupied_rooms: number; total_rooms: number; room_revenue: number; extras_revenue: number; collected: number; food_revenue: number; activity_revenue: number; other_revenue: number; taxes: number; payments: number; refunds: number; outstanding: number; discrepancies: string; status: string }[]>([]);
  const [msg, setMsg] = useState("");
  async function load() { const { data } = await supabase.from("night_audits").select("*").order("audit_date", { ascending: false }).limit(30); setRows(data ?? []); }
  useEffect(() => { load(); }, []);
  async function run() {
    if (!confirm(`Close the day ${date}? Unarrived bookings for this night will be marked no-show.`)) return;
    const { error } = await supabase.rpc("run_night_audit", { _date: date });
    setMsg(error ? error.message : "Night audit saved. Review it, then close the day."); load();
  }
  async function close(d: string) {
    if (!confirm(`Close ${d}? Bills and payments of this day will be locked.`)) return;
    const { error } = await supabase.rpc("close_night_audit", { _date: d });
    setMsg(error ? error.message : `${d} closed and locked.`); load();
  }
  return (
    <div className="mt-6">
      <div className="panel-form flex flex-wrap items-end gap-3 bg-background p-4">
        <label className="text-xs">Business date<input type="date" max={new Date().toISOString().slice(0, 10)} value={date} onChange={(e) => setDate(e.target.value)} className={`block ${field}`} /></label>
        <Button variant="panel" onClick={run} className={`${btn} bg-gold text-primary`}>Run night audit</Button>
        {msg && <span className="text-sm text-gold">{msg}</span>}
      </div>
      <div className="mt-4 overflow-x-auto">
        <div className="panel-table-scroll" tabIndex={0}><table className="w-full bg-background text-sm">
          <thead><tr className="text-left text-xs tracking-widest text-muted-foreground">{["Date", "Status", "Check-ins", "Check-outs", "In-house", "No-shows", "Occupancy", "Room", "Food", "Activities", "Other", "Taxes", "Payments", "Refunds", "Outstanding", ""].map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead>
          <tbody>{rows.map((r) => (
            <><tr key={r.id} className="border-t border-border"><td className="p-2">{r.audit_date}</td><td className="p-2 uppercase">{r.status}</td><td className="p-2">{r.arrivals}</td><td className="p-2">{r.departures}</td><td className="p-2">{r.in_house}</td><td className="p-2">{r.no_shows}</td>
              <td className="p-2">{r.total_rooms ? Math.round((r.occupied_rooms / r.total_rooms) * 100) : 0}%</td><td className="p-2">{inr(r.room_revenue)}</td><td className="p-2">{inr(r.food_revenue)}</td><td className="p-2">{inr(r.activity_revenue)}</td><td className="p-2">{inr(r.other_revenue)}</td><td className="p-2">{inr(r.taxes)}</td><td className="p-2">{inr(r.payments)}</td><td className="p-2">{inr(r.refunds)}</td><td className="p-2">{inr(r.outstanding)}</td>
              <td className="p-2">{r.status === "draft" && <Button variant="panel" onClick={() => close(r.audit_date)} className={btn}>Close day</Button>}</td></tr>
              {r.discrepancies && <tr key={r.id + "d"}><td colSpan={16} className="bg-gold/10 px-2 py-1 text-xs">Check before closing: {r.discrepancies}</td></tr>}</>
          ))}</tbody>
        </table></div>
      </div>
      {canEditSettings && <SettingsForm />}
    </div>
  );
}

function SettingsForm() {
  const [s, setS] = useState<{ early_checkin_fee: number; early_checkin_from: string; late_checkout_fee: number; late_checkout_until: string; security_deposit: number } | null>(null);
  const [msg, setMsg] = useState("");
  useEffect(() => { supabase.from("resort_settings").select("*").eq("id", 1).single().then(({ data }) => setS(data)); }, []);
  if (!s) return null;
  async function save() {
    const { error } = await supabase.from("resort_settings").update({ ...s, updated_at: new Date().toISOString() }).eq("id", 1);
    setMsg(error ? error.message : "Saved.");
  }
  const num = (k: keyof typeof s) => <input type="number" min={0} value={s[k] as number} onChange={(e) => setS({ ...s, [k]: +e.target.value })} className={`block w-28 ${field}`} />;
  const txt = (k: keyof typeof s) => <input type="time" value={s[k] as string} onChange={(e) => setS({ ...s, [k]: e.target.value })} className={`block ${field}`} />;
  return (
    <div className="mt-8 bg-background p-4">
      <p className="text-xs tracking-widest text-muted-foreground">OWNER SETTINGS · FEES & DEPOSIT</p>
      <div className="panel-form mt-3 flex flex-wrap items-end gap-4 text-xs">
        <label>Early check-in fee ₹{num("early_checkin_fee")}</label>
        <label>Early check-in from{txt("early_checkin_from")}</label>
        <label>Late checkout fee ₹{num("late_checkout_fee")}</label>
        <label>Late checkout until{txt("late_checkout_until")}</label>
        <label>Security deposit ₹{num("security_deposit")}</label>
        <Button variant="panel" onClick={save} className={btn}>Save</Button>
        {msg && <span className="text-gold">{msg}</span>}
      </div>
    </div>
  );
}
