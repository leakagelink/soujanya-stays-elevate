import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/rooms";

const btn = "border border-border px-3 py-1.5 text-xs tracking-widest uppercase";
const field = "border border-border bg-transparent px-2 py-1 text-sm";
const today = () => new Date().toISOString().slice(0, 10);
const plus = (d: string, n: number) => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

export const SOURCES = ["walk-in", "phone", "website", "whatsapp", "corporate", "travel agent", "booking.com", "makemytrip", "agoda", "airbnb", "goibibo", "other"];

type Co = { id: string; name: string; gstin: string; contact_person: string; phone: string; email: string; billing_address: string; discount_pct: number; credit_limit: number };

export function useCompanies() {
  const [list, setList] = useState<Co[]>([]);
  const load = () => supabase.from("companies").select("*").eq("active", true).order("name").then(({ data }) => setList(data ?? []));
  useEffect(() => { load(); }, []);
  return { list, load };
}

export function Corporate() {
  const { list, load } = useCompanies();
  const empty = { name: "", gstin: "", contact_person: "", phone: "", email: "", billing_address: "", discount_pct: 10, credit_limit: 0 };
  const [f, setF] = useState(empty);
  const [stats, setStats] = useState<Record<string, { stays: number; total: number; paid: number }>>({});
  useEffect(() => {
    (async () => {
      const { data: b } = await supabase.from("bookings").select("id,company_id,total,status").not("company_id", "is", null).neq("status", "cancelled");
      const ids = (b ?? []).map((x) => x.id);
      const { data: p } = ids.length ? await supabase.from("payments").select("booking_id,amount,kind").in("booking_id", ids) : { data: [] };
      const paidBy: Record<string, number> = {}; (p ?? []).forEach((x) => { paidBy[x.booking_id] = (paidBy[x.booking_id] ?? 0) + (x.kind === "refund" ? -x.amount : x.amount); });
      const s: typeof stats = {};
      (b ?? []).forEach((x) => { const k = x.company_id!; s[k] ??= { stays: 0, total: 0, paid: 0 }; s[k].stays++; s[k].total += x.total; s[k].paid += paidBy[x.id] ?? 0; });
      setStats(s);
    })();
  }, [list.length]);
  async function save() {
    if (!f.name.trim()) return;
    const { error } = await supabase.from("companies").insert({ ...f, name: f.name.trim() });
    if (error) return alert(error.message);
    setF(empty); load();
  }
  async function remove(id: string) { if (confirm("Remove this company?")) { await supabase.from("companies").update({ active: false }).eq("id", id); load(); } }
  return (
    <div className="mt-6">
      <p className="text-sm text-muted-foreground">Companies get their agreed discount automatically when you pick them on a new booking. Their GSTIN can be used on the invoice.</p>
      <div className="mt-3 flex flex-wrap items-end gap-2 bg-background p-3 text-xs">
        {(["name", "gstin", "contact_person", "phone", "email", "billing_address"] as const).map((k) => (
          <input key={k} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} placeholder={{ name: "Company name", gstin: "GSTIN", contact_person: "Contact person", phone: "Phone", email: "Email", billing_address: "Billing address" }[k]} className={field} />
        ))}
        <label>Discount %<input type="number" min={0} max={50} value={f.discount_pct} onChange={(e) => setF({ ...f, discount_pct: +e.target.value })} className={`block w-20 ${field}`} /></label>
        <label>Credit limit ₹<input type="number" min={0} value={f.credit_limit} onChange={(e) => setF({ ...f, credit_limit: +e.target.value })} className={`block w-28 ${field}`} /></label>
        <Button variant="panel" onClick={save} className={`${btn} bg-gold text-primary`}>Add company</Button>
      </div>
      <ul className="mt-3 grid gap-2">{list.map((c) => { const s = stats[c.id] ?? { stays: 0, total: 0, paid: 0 }; const due = s.total - s.paid; return (
        <li key={c.id} className="flex flex-wrap justify-between gap-2 bg-background p-4 text-sm">
          <span><b className="font-display text-xl text-primary">{c.name}</b> · {Number(c.discount_pct)}% off {c.gstin && `· GSTIN ${c.gstin}`} · {c.contact_person} {c.phone}</span>
          <span className="panel-actions flex items-center gap-3">{s.stays} stay(s) · billed {inr(s.total)} · <span className={c.credit_limit && due > c.credit_limit ? "text-destructive" : "text-gold"}>due {inr(due)}{c.credit_limit ? ` / limit ${inr(c.credit_limit)}` : ""}</span>
            <Button variant="panel" onClick={() => remove(c.id)} className="text-xs text-destructive">remove</Button></span>
        </li>); })}</ul>
    </div>
  );
}

export function Groups({ rooms, reload }: { rooms: { id: string; name: string; max_guests: number }[]; reload: () => void }) {
  const { list: companies } = useCompanies();
  const [groups, setGroups] = useState<{ id: string; name: string; contact_name: string; phone: string; bookings: { id: string; total: number; status: string; room_number: string; room_types: { name: string } | null }[] }[]>([]);
  const [f, setF] = useState({ name: "", contact_name: "", phone: "", company_id: "", check_in: today(), check_out: plus(today(), 1), notes: "" });
  const [lines, setLines] = useState<Record<string, { count: number; guests: number }>>({});
  const [free, setFree] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState("");
  async function load() {
    const { data } = await supabase.from("booking_groups").select("id,name,contact_name,phone,bookings(id,total,status,room_number,room_types(name))").order("created_at", { ascending: false }).limit(20);
    setGroups((data as typeof groups) ?? []);
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (f.check_out <= f.check_in) return;
    Promise.all(rooms.map((r) => supabase.rpc("rooms_free", { _room_type_id: r.id, _in: f.check_in, _out: f.check_out }).then(({ data }) => [r.id, data ?? 0] as const))).then((x) => setFree(Object.fromEntries(x)));
  }, [f.check_in, f.check_out, rooms]);
  async function create() {
    setMsg("");
    const want = Object.entries(lines).filter(([, l]) => l.count > 0);
    if (!f.name.trim() || !want.length) return setMsg("Add a group name and at least one room.");
    for (const [id, l] of want) if (l.count > (free[id] ?? 0)) return setMsg(`Only ${free[id] ?? 0} ${rooms.find((r) => r.id === id)?.name} free.`);
    const { data: u } = await supabase.auth.getUser();
    const { data: g, error } = await supabase.from("booking_groups").insert({ name: f.name.trim(), contact_name: f.contact_name, phone: f.phone, company_id: f.company_id || null, notes: f.notes }).select("id").single();
    if (error || !g) return setMsg(error?.message ?? "Could not create group");
    const rows = want.flatMap(([id, l]) => Array.from({ length: l.count }, (_, i) => ({
      user_id: u.user!.id, room_type_id: id, guest_name: `${f.name.trim()} · ${f.contact_name || "guest"} ${i + 1}`, phone: f.phone,
      check_in: f.check_in, check_out: f.check_out, guests: Math.max(1, l.guests), status: "confirmed", source: f.company_id ? "corporate" : "group",
      company_id: f.company_id || null, group_id: g.id, nights: 0, subtotal: 0, gst: 0, total: 0,
    })));
    let ok = 0; let err = "";
    for (const r of rows) { const { error: e } = await supabase.from("bookings").insert(r); if (e) err = e.message; else ok++; }
    setMsg(err ? `${ok} of ${rows.length} rooms booked. Problem: ${err}` : `Group booked: ${ok} rooms.`);
    setLines({}); load(); reload();
  }
  async function groupStatus(id: string, status: "confirmed" | "cancelled") {
    const g = groups.find((x) => x.id === id); if (!g || !confirm(`${status === "cancelled" ? "Cancel" : "Confirm"} all rooms in ${g.name}?`)) return;
    await supabase.from("bookings").update(status === "cancelled" ? { status, cancelled_at: new Date().toISOString() } : { status }).eq("group_id", id).in("status", ["pending", "confirmed"]);
    load(); reload();
  }
  return (
    <div className="mt-6">
      <div className="bg-background p-4">
        <div className="panel-form flex flex-wrap items-end gap-2 text-xs">
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Group name (e.g. Sharma wedding)" className={field} />
          <input value={f.contact_name} onChange={(e) => setF({ ...f, contact_name: e.target.value })} placeholder="Contact person" className={field} />
          <input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="Phone" className={field} />
          <select value={f.company_id} onChange={(e) => setF({ ...f, company_id: e.target.value })} className={field}><option value="">No company</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.name} ({Number(c.discount_pct)}% off)</option>)}</select>
          <label>Check-in<input type="date" value={f.check_in} min={today()} onChange={(e) => setF({ ...f, check_in: e.target.value })} className={`block ${field}`} /></label>
          <label>Check-out<input type="date" value={f.check_out} min={f.check_in} onChange={(e) => setF({ ...f, check_out: e.target.value })} className={`block ${field}`} /></label>
        </div>
        <ul className="mt-3 grid gap-1 text-sm md:grid-cols-2">{rooms.map((r) => (
          <li key={r.id} className="panel-stack flex items-center justify-between gap-3 bg-secondary p-2">
            <span>{r.name} <span className="text-xs text-muted-foreground">({free[r.id] ?? "…"} free)</span></span>
            <span className="flex flex-wrap items-center gap-2 text-xs">Rooms<input type="number" min={0} max={free[r.id] ?? 0} value={lines[r.id]?.count ?? 0} onChange={(e) => setLines({ ...lines, [r.id]: { guests: lines[r.id]?.guests ?? Math.min(2, r.max_guests), count: Math.max(0, +e.target.value) } })} className={`w-14 ${field}`} />
              Guests/room<input type="number" min={1} max={r.max_guests} value={lines[r.id]?.guests ?? Math.min(2, r.max_guests)} onChange={(e) => setLines({ ...lines, [r.id]: { count: lines[r.id]?.count ?? 0, guests: +e.target.value } })} className={`w-14 ${field}`} /></span>
          </li>))}</ul>
        <Button variant="panel" onClick={create} className={`mt-3 ${btn} bg-gold text-primary`}>Book group</Button>
        {msg && <p className="mt-2 text-sm text-gold">{msg}</p>}
      </div>
      <ul className="mt-4 grid gap-2">{groups.map((g) => { const live = g.bookings.filter((b) => b.status !== "cancelled"); return (
        <li key={g.id} className="bg-background p-4 text-sm">
          <div className="flex flex-wrap justify-between gap-2"><span><b className="font-display text-xl text-primary">{g.name}</b> · {g.contact_name} {g.phone} · {live.length} room(s)</span>
            <span className="panel-actions flex items-center gap-2"><span className="text-gold">{inr(live.reduce((s, b) => s + b.total, 0))}</span><Button variant="panel" onClick={() => groupStatus(g.id, "confirmed")} className={btn}>Confirm all</Button><Button variant="panel" onClick={() => groupStatus(g.id, "cancelled")} className={`${btn} text-destructive`}>Cancel all</Button></span></div>
          <p className="mt-1 text-xs text-muted-foreground">{g.bookings.map((b) => `${b.room_types?.name}${b.room_number ? " #" + b.room_number : ""} (${b.status})`).join(" · ")}</p>
        </li>); })}</ul>
    </div>
  );
}

type Ev = { id: string; title: string; kind: string; client_name: string; phone: string; event_date: string; start_time: string; end_time: string; venue: string; guests: number; package: string; amount: number; gst: number; total: number; paid: number; status: string; notes: string };

export function Events() {
  const [rows, setRows] = useState<Ev[]>([]);
  const empty = { title: "", kind: "wedding", client_name: "", phone: "", event_date: today(), start_time: "18:00", end_time: "23:00", venue: "Lawn", guests: 100, package: "", amount: 0, notes: "" };
  const [f, setF] = useState(empty);
  const [pay, setPay] = useState<Record<string, string>>({});
  async function load() { const { data } = await supabase.from("events").select("*").neq("status", "cancelled").gte("event_date", plus(today(), -60)).order("event_date"); setRows(data ?? []); }
  useEffect(() => { load(); }, []);
  async function save() {
    if (!f.title.trim() || !f.client_name.trim()) return alert("Event name and client required");
    const clash = rows.find((r) => r.event_date === f.event_date && r.venue.toLowerCase() === f.venue.toLowerCase() && r.status !== "enquiry" && r.start_time < f.end_time && f.start_time < r.end_time);
    if (clash && !confirm(`${f.venue} is already booked for "${clash.title}" at that time. Save anyway?`)) return;
    const { error } = await supabase.from("events").insert(f);
    if (error) return alert(error.message);
    setF(empty); load();
  }
  async function upd(id: string, patch: Partial<Ev>) { const { error } = await supabase.from("events").update(patch).eq("id", id); if (error) alert(error.message); load(); }
  return (
    <div className="mt-6">
      <div className="panel-form flex flex-wrap items-end gap-2 bg-background p-4 text-xs">
        <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Event name" className={field} />
        <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} className={field}>{["wedding", "reception", "birthday", "conference", "corporate offsite", "party", "other"].map((k) => <option key={k}>{k}</option>)}</select>
        <input value={f.client_name} onChange={(e) => setF({ ...f, client_name: e.target.value })} placeholder="Client name" className={field} />
        <input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="Phone" className={field} />
        <label>Date<input type="date" value={f.event_date} onChange={(e) => setF({ ...f, event_date: e.target.value })} className={`block ${field}`} /></label>
        <label>From<input type="time" value={f.start_time} onChange={(e) => setF({ ...f, start_time: e.target.value })} className={`block ${field}`} /></label>
        <label>To<input type="time" value={f.end_time} onChange={(e) => setF({ ...f, end_time: e.target.value })} className={`block ${field}`} /></label>
        <label>Venue<input value={f.venue} onChange={(e) => setF({ ...f, venue: e.target.value })} className={`block w-28 ${field}`} /></label>
        <label>Guests<input type="number" min={1} value={f.guests} onChange={(e) => setF({ ...f, guests: +e.target.value })} className={`block w-20 ${field}`} /></label>
        <input value={f.package} onChange={(e) => setF({ ...f, package: e.target.value })} placeholder="Package (menu, decor, DJ…)" className={`min-w-60 flex-1 ${field}`} />
        <label>Price before GST ₹<input type="number" min={0} value={f.amount} onChange={(e) => setF({ ...f, amount: +e.target.value })} className={`block w-28 ${field}`} /></label>
        <Button variant="panel" onClick={save} className={`${btn} bg-gold text-primary`}>Save event</Button>
      </div>
      <ul className="mt-4 grid gap-2">{rows.map((r) => (
        <li key={r.id} className="bg-background p-4 text-sm">
          <div className="flex flex-wrap justify-between gap-2">
            <span><b className="font-display text-xl text-primary">{r.title}</b> · {r.kind} · {r.event_date} {r.start_time}–{r.end_time} · {r.venue} · {r.guests} guests · {r.client_name} {r.phone}</span>
            <select value={r.status} onChange={(e) => upd(r.id, { status: e.target.value })} className={field}>{["enquiry", "tentative", "confirmed", "completed", "cancelled"].map((s) => <option key={s}>{s}</option>)}</select>
          </div>
          {r.package && <p className="text-xs text-muted-foreground">{r.package}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
            <span>{inr(r.amount)} + GST 18% {inr(r.gst)} = <b>{inr(r.total)}</b></span>
            <span className="text-gold">Paid {inr(r.paid)} · Balance {inr(r.total - r.paid)}</span>
            <input value={pay[r.id] ?? ""} onChange={(e) => setPay({ ...pay, [r.id]: e.target.value })} placeholder="₹ received" className={`w-24 ${field}`} />
            <Button variant="panel" onClick={() => { const n = parseInt(pay[r.id] ?? "", 10); if (n > 0) { upd(r.id, { paid: r.paid + n }); setPay({ ...pay, [r.id]: "" }); } }} className={btn}>Add payment</Button>
          </div>
        </li>
      ))}</ul>
    </div>
  );
}

export function Cash() {
  const [open, setOpen] = useState<{ id: string; opened_at: string; opening_float: number } | null>(null);
  const [past, setPast] = useState<{ id: string; opened_at: string; closed_at: string | null; opening_float: number; expected: number | null; counted: number | null; notes: string }[]>([]);
  const [entries, setEntries] = useState<{ id: string; kind: string; amount: number; reason: string; created_at: string }[]>([]);
  const [expected, setExpected] = useState(0);
  const [float, setFloat] = useState("0");
  const [e, setE] = useState({ kind: "out", amount: "", reason: "" });
  const [counted, setCounted] = useState("");
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState("");
  async function load() {
    const { data } = await supabase.from("cash_sessions").select("*").order("opened_at", { ascending: false }).limit(15);
    const o = (data ?? []).find((s) => !s.closed_at) ?? null;
    setOpen(o); setPast((data ?? []).filter((s) => s.closed_at));
    if (o) {
      const [en, ex] = await Promise.all([supabase.from("cash_entries").select("*").eq("session_id", o.id).order("created_at"), supabase.rpc("cash_expected", { _session_id: o.id })]);
      setEntries(en.data ?? []); setExpected(ex.data ?? 0);
    }
  }
  useEffect(() => { load(); }, []);
  async function start() { const { error } = await supabase.from("cash_sessions").insert({ opening_float: parseInt(float, 10) || 0 }); if (error) alert(error.message); load(); }
  async function addEntry() {
    const n = parseInt(e.amount, 10); if (!open || !(n > 0) || !e.reason.trim()) return;
    const { error } = await supabase.from("cash_entries").insert({ session_id: open.id, kind: e.kind, amount: n, reason: e.reason.trim() });
    if (error) alert(error.message); setE({ ...e, amount: "", reason: "" }); load();
  }
  async function close() {
    if (!open) return; const c = parseInt(counted, 10); if (isNaN(c)) return;
    const { data, error } = await supabase.rpc("close_cash_session", { _session_id: open.id, _counted: c, _notes: notes });
    if (error) return alert(error.message);
    setMsg(data === 0 ? "Drawer closed. Cash matches." : data! > 0 ? `Drawer closed. ${inr(data!)} extra.` : `Drawer closed. ${inr(-data!)} short.`);
    setCounted(""); setNotes(""); load();
  }
  return (
    <div className="mt-6">
      {!open ? (
        <div className="panel-form flex flex-wrap items-end gap-2 bg-background p-4 text-xs">
          <label>Opening cash in drawer ₹<input type="number" min={0} value={float} onChange={(ev) => setFloat(ev.target.value)} className={`block w-28 ${field}`} /></label>
          <Button variant="panel" onClick={start} className={`${btn} bg-gold text-primary`}>Open drawer</Button>
        </div>
      ) : (
        <div className="bg-background p-4">
          <p className="text-sm">Drawer open since {new Date(open.opened_at).toLocaleString("en-IN")} · opening {inr(open.opening_float)}</p>
          <p className="mt-1 font-display text-3xl text-primary">Should be in drawer: {inr(expected)}</p>
          <p className="text-xs text-muted-foreground">Opening cash + cash payments & refunds at desk + paid restaurant bills in cash + cash in/out below.</p>
          <div className="panel-form mt-3 flex flex-wrap gap-2 text-sm">
            <select value={e.kind} onChange={(ev) => setE({ ...e, kind: ev.target.value })} className={field}><option value="out">Cash out (petty expense, bank deposit)</option><option value="in">Cash in</option></select>
            <input value={e.amount} onChange={(ev) => setE({ ...e, amount: ev.target.value })} placeholder="₹" className={`w-24 ${field}`} />
            <input value={e.reason} onChange={(ev) => setE({ ...e, reason: ev.target.value })} placeholder="Reason" className={`flex-1 ${field}`} />
            <Button variant="panel" onClick={addEntry} className={btn}>Record</Button>
          </div>
          <ul className="mt-2 text-xs">{entries.map((x) => <li key={x.id}>{new Date(x.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} · {x.kind === "in" ? "+" : "−"}{inr(x.amount)} · {x.reason}</li>)}</ul>
          <div className="panel-form mt-4 flex flex-wrap items-end gap-2 border-t border-border pt-3 text-xs">
            <label>Cash counted ₹<input type="number" min={0} value={counted} onChange={(ev) => setCounted(ev.target.value)} className={`block w-28 ${field}`} /></label>
            <input value={notes} onChange={(ev) => setNotes(ev.target.value)} placeholder="Notes" className={field} />
            <Button variant="panel" onClick={close} className={`${btn} bg-primary text-primary-foreground`}>Close drawer</Button>
          </div>
        </div>
      )}
      {msg && <p className="mt-2 text-sm text-gold">{msg}</p>}
      <div className="panel-table-scroll" tabIndex={0}><table className="panel-table-wide mt-4 w-full bg-background text-sm">
        <thead><tr className="text-left text-xs tracking-widest text-muted-foreground"><th className="p-2">Opened</th><th className="p-2">Closed</th><th className="p-2">Expected</th><th className="p-2">Counted</th><th className="p-2">Difference</th><th className="p-2">Notes</th></tr></thead>
        <tbody>{past.map((s) => { const d = (s.counted ?? 0) - (s.expected ?? 0); return (
          <tr key={s.id} className="border-t border-border"><td className="p-2">{new Date(s.opened_at).toLocaleString("en-IN")}</td><td className="p-2">{s.closed_at && new Date(s.closed_at).toLocaleString("en-IN")}</td><td className="p-2">{inr(s.expected ?? 0)}</td><td className="p-2">{inr(s.counted ?? 0)}</td><td className={`p-2 ${d < 0 ? "text-destructive" : ""}`}>{d === 0 ? "—" : (d > 0 ? "+" : "−") + inr(Math.abs(d))}</td><td className="p-2">{s.notes}</td></tr>); })}</tbody>
      </table></div>
    </div>
  );
}
