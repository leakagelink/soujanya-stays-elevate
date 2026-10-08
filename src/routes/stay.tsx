import logoAsset from "@/assets/soujanya-logo.webp.asset.json";
const logo = logoAsset.url;
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { inr } from "@/lib/rooms";

export const Route = createFileRoute("/stay")({
  head: () => ({
    meta: [
      { title: "My stay — Soujanya Stays" },
      { name: "description", content: "Order food to your room, book spa and activities, and request housekeeping." },
      { property: "og:title", content: "My stay — Soujanya Stays" },
      { property: "og:description", content: "In-room dining, spa, activities and requests during your stay." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Stay,
});

type Bk = { id: string; check_in: string; check_out: string; status: string; room_number: string; room_types: { name: string } | null };
type Item = { id: string; name: string; description: string; category: string; price: number; is_veg: boolean; available: boolean };
type Act = { id: string; name: string; description: string; category: string; price: number; duration_min: number; capacity: number; slots: string[] };

function Stay() {
  const { user, loading } = useAuth();
  const [bks, setBks] = useState<Bk[] | null>(null);
  const [sel, setSel] = useState<string>("");
  const [tab, setTab] = useState<"food" | "activities" | "requests">("food");
  useEffect(() => {
    if (!user) return;
    supabase.from("bookings").select("id,check_in,check_out,status,room_number,room_types(name)").eq("user_id", user.id)
      .in("status", ["confirmed", "checked_in"]).order("check_in").then(({ data }) => {
        const list = (data as Bk[]) ?? [];
        setBks(list);
        setSel((list.find((b) => b.status === "checked_in") ?? list[0])?.id ?? "");
      });
  }, [user]);
  const bk = bks?.find((b) => b.id === sel);
  if (loading) return null;
  return (
    <div className="min-h-screen bg-secondary px-4 py-10 md:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <Link to="/" className="font-display text-2xl tracking-[0.3em] text-primary">SOUJANYA STAYS</Link>
          <Link to="/my-bookings" className="text-xs tracking-widest text-muted-foreground">MY BOOKINGS</Link>
        </div>
        <h1 className="mt-8 font-display text-5xl text-primary">My stay</h1>
        {!user ? <p className="mt-6">Please <Link to="/auth" className="text-gold underline">sign in</Link> to continue.</p>
          : bks === null ? <p className="mt-6 text-muted-foreground">Loading…</p>
          : !bk ? <p className="mt-6 text-muted-foreground">You have no confirmed or current stay. <Link to="/" className="text-gold underline">Book a room</Link></p>
          : (
            <>
              {bks.length > 1 && (
                <select value={sel} onChange={(e) => setSel(e.target.value)} className="mt-4 border border-border bg-background px-3 py-2 text-sm">
                  {bks.map((b) => <option key={b.id} value={b.id}>{b.room_types?.name} · {b.check_in}</option>)}
                </select>
              )}
              <p className="mt-3 text-sm text-muted-foreground">{bk.room_types?.name}{bk.room_number && ` · Room ${bk.room_number}`} · {bk.check_in} → {bk.check_out} · <span className="uppercase">{bk.status.replace("_", " ")}</span></p>
              <div className="mt-6 flex gap-2 border-b border-border">
                {(["food", "activities", "requests"] as const).map((t) => (
                  <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-xs tracking-widest uppercase ${tab === t ? "border-b-2 border-gold text-primary" : "text-muted-foreground"}`}>
                    {{ food: "In-room dining", activities: "Spa & activities", requests: "Requests" }[t]}
                  </button>
                ))}
              </div>
              {tab === "food" && <Food bk={bk} />}
              {tab === "activities" && <Activities bk={bk} />}
              {tab === "requests" && <Requests bk={bk} />}
            </>
          )}
      </div>
    </div>
  );
}

function Food({ bk }: { bk: Bk }) {
  const [menu, setMenu] = useState<Item[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [orders, setOrders] = useState<{ id: string; status: string; total: number; created_at: string; order_items: { name: string; qty: number }[] }[]>([]);
  const [msg, setMsg] = useState("");
  async function loadOrders() {
    const { data } = await supabase.from("orders").select("id,status,total,created_at,order_items(name,qty)").eq("booking_id", bk.id).order("created_at", { ascending: false });
    setOrders(data ?? []);
  }
  useEffect(() => {
    supabase.from("menu_items").select("*").order("sort_order").then(({ data }) => setMenu(data ?? []));
    loadOrders();
    const t = setInterval(loadOrders, 15000);
    return () => clearInterval(t);
  }, [bk.id]);
  const cats = useMemo(() => [...new Set(menu.map((m) => m.category))], [menu]);
  const sub = menu.reduce((s, m) => s + (cart[m.id] ?? 0) * m.price, 0);
  const gst = Math.round(sub * 0.05);
  const add = (id: string, d: number) => setCart((c) => { const n = Math.max(0, (c[id] ?? 0) + d); const x = { ...c, [id]: n }; if (!n) delete x[id]; return x; });
  async function place() {
    setMsg("");
    const items = Object.entries(cart).map(([id, qty]) => ({ id, qty }));
    const { error } = await supabase.rpc("place_order", { _booking_id: bk.id, _items: items, _notes: notes });
    if (error) setMsg(error.message); else { setCart({}); setNotes(""); setMsg("Order placed! The kitchen has received it."); loadOrders(); }
  }
  const canOrder = bk.status === "checked_in";
  return (
    <div className="mt-6 grid gap-8 md:grid-cols-[1fr_320px]">
      <div>
        {!canOrder && <p className="mb-4 bg-background p-3 text-sm text-muted-foreground">You can browse the menu now. Ordering opens once you're checked in.</p>}
        {cats.map((c) => (
          <div key={c} className="mb-6">
            <h3 className="font-display text-2xl text-primary">{c}</h3>
            <ul className="mt-2 grid gap-2">
              {menu.filter((m) => m.category === c).map((m) => (
                <li key={m.id} className={`flex items-center gap-3 bg-background p-3 ${!m.available ? "opacity-50" : ""}`}>
                  <span className={`h-3 w-3 border ${m.is_veg ? "border-primary bg-primary" : "border-destructive bg-destructive"}`} title={m.is_veg ? "Veg" : "Non-veg"} />
                  <div className="flex-1"><p className="text-sm">{m.name}</p><p className="text-xs text-muted-foreground">{m.description}</p></div>
                  <span className="text-sm text-gold">{inr(m.price)}</span>
                  {m.available && canOrder ? (
                    <div className="flex items-center gap-2 text-sm">
                      {cart[m.id] ? <><button onClick={() => add(m.id, -1)} className="border border-border px-2">−</button><span>{cart[m.id]}</span></> : null}
                      <button onClick={() => add(m.id, 1)} className="border border-border px-2">+</button>
                    </div>
                  ) : !m.available ? <span className="text-xs">Unavailable</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="md:sticky md:top-6 md:self-start">
        <div className="bg-background p-4">
          <p className="text-xs tracking-widest text-muted-foreground">YOUR ORDER</p>
          {sub === 0 ? <p className="mt-2 text-sm text-muted-foreground">Cart is empty.</p> : (
            <ul className="mt-2 text-sm">
              {menu.filter((m) => cart[m.id]).map((m) => <li key={m.id} className="flex justify-between"><span>{cart[m.id]} × {m.name}</span><span>{inr(m.price * cart[m.id]!)}</span></li>)}
              <li className="mt-2 flex justify-between border-t border-border pt-2 text-muted-foreground"><span>GST 5%</span><span>{inr(gst)}</span></li>
              <li className="flex justify-between font-semibold"><span>Total</span><span className="text-gold">{inr(sub + gst)}</span></li>
            </ul>
          )}
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (less spicy, no onion…)" rows={2} className="mt-3 w-full border border-border bg-transparent p-2 text-sm" />
          <button disabled={!sub || !canOrder} onClick={place} className="mt-2 w-full bg-gold py-2 text-xs tracking-widest text-primary disabled:opacity-40">PLACE ORDER · ADD TO ROOM BILL</button>
          {msg && <p className="mt-2 text-xs text-gold">{msg}</p>}
        </div>
        {orders.length > 0 && (
          <div className="mt-4 bg-background p-4">
            <p className="text-xs tracking-widest text-muted-foreground">YOUR ORDERS</p>
            {orders.map((o) => (
              <div key={o.id} className="mt-2 border-t border-border pt-2 text-sm">
                <div className="flex justify-between"><span className="uppercase text-primary">{o.status}</span><span>{inr(o.total)}</span></div>
                <p className="text-xs text-muted-foreground">{o.order_items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Activities({ bk }: { bk: Bk }) {
  const [acts, setActs] = useState<Act[]>([]);
  const [mine, setMine] = useState<{ id: string; date: string; slot: string; people: number; total: number; status: string; activities: { name: string } | null }[]>([]);
  const [pick, setPick] = useState<Act | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(bk.check_in > today ? bk.check_in : today);
  const [slot, setSlot] = useState("");
  const [people, setPeople] = useState(1);
  const [used, setUsed] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState("");
  async function loadMine() {
    const { data } = await supabase.from("activity_bookings").select("id,date,slot,people,total,status,activities(name)").eq("booking_id", bk.id).order("date");
    setMine(data ?? []);
  }
  useEffect(() => { supabase.from("activities").select("*").eq("active", true).order("sort_order").then(({ data }) => setActs(data ?? [])); loadMine(); }, [bk.id]);
  useEffect(() => {
    if (!pick) return;
    supabase.rpc("activity_slots_used", { _activity_id: pick.id, _date: date }).then(({ data }) =>
      setUsed(Object.fromEntries((data ?? []).map((r) => [r.slot, r.used]))));
  }, [pick, date]);
  async function book() {
    if (!pick || !slot) return;
    setMsg("");
    const { error } = await supabase.rpc("book_activity", { _booking_id: bk.id, _activity_id: pick.id, _date: date, _slot: slot, _people: people });
    if (error) setMsg(error.message); else { setMsg("Booked! Added to your room bill."); setPick(null); setSlot(""); loadMine(); }
  }
  return (
    <div className="mt-6">
      <div className="grid gap-3 md:grid-cols-2">
        {acts.map((a) => (
          <button key={a.id} onClick={() => { setPick(a); setSlot(""); setMsg(""); }} className={`bg-background p-4 text-left ${pick?.id === a.id ? "ring-2 ring-gold" : ""}`}>
            <p className="text-xs tracking-widest text-muted-foreground uppercase">{a.category} · {a.duration_min} min</p>
            <p className="font-display text-2xl text-primary">{a.name}</p>
            <p className="text-sm text-muted-foreground">{a.description}</p>
            <p className="mt-1 text-sm text-gold">{inr(a.price)} / person + GST</p>
          </button>
        ))}
      </div>
      {pick && (
        <div className="mt-4 flex flex-wrap items-end gap-3 bg-background p-4">
          <label className="text-xs">Date<input type="date" min={bk.check_in > today ? bk.check_in : today} max={bk.check_out} value={date} onChange={(e) => setDate(e.target.value)} className="block border border-border bg-transparent px-2 py-1 text-sm" /></label>
          <div className="text-xs">Time
            <div className="flex flex-wrap gap-1">
              {pick.slots.map((s) => {
                const left = pick.capacity - (used[s] ?? 0);
                return <button key={s} disabled={left <= 0} onClick={() => setSlot(s)} className={`border px-2 py-1 text-sm ${slot === s ? "border-gold bg-gold text-primary" : "border-border"} disabled:opacity-40`}>{s} <span className="text-xs">({left} left)</span></button>;
              })}
            </div>
          </div>
          <label className="text-xs">People<input type="number" min={1} max={pick.capacity} value={people} onChange={(e) => setPeople(+e.target.value)} className="block w-20 border border-border bg-transparent px-2 py-1 text-sm" /></label>
          <span className="text-sm">Total {inr(Math.round(pick.price * people * 1.18))}</span>
          <button disabled={!slot} onClick={book} className="bg-gold px-4 py-2 text-xs tracking-widest text-primary disabled:opacity-40">BOOK</button>
        </div>
      )}
      {msg && <p className="mt-2 text-sm text-gold">{msg}</p>}
      {mine.length > 0 && (
        <ul className="mt-6 grid gap-2">
          {mine.map((m) => <li key={m.id} className="flex justify-between bg-background p-3 text-sm"><span>{m.activities?.name} · {m.date} {m.slot} · {m.people} pax</span><span className="uppercase">{m.status} · {inr(m.total)}</span></li>)}
        </ul>
      )}
    </div>
  );
}

function Requests({ bk }: { bk: Bk }) {
  const [rows, setRows] = useState<{ id: string; kind: string; message: string; status: string; created_at: string }[]>([]);
  const [kind, setKind] = useState<"housekeeping" | "maintenance" | "other">("housekeeping");
  const [message, setMessage] = useState("");
  const [msg, setMsg] = useState("");
  async function load() {
    const { data } = await supabase.from("service_requests").select("id,kind,message,status,created_at").eq("booking_id", bk.id).order("created_at", { ascending: false });
    setRows(data ?? []);
  }
  useEffect(() => { load(); }, [bk.id]);
  async function send() {
    const m = message.trim();
    if (!m || m.length > 500) return setMsg("Please write a short message (max 500 characters).");
    const { error } = await supabase.from("service_requests").insert({ booking_id: bk.id, room_number: bk.room_number, kind, message: m });
    if (error) setMsg(bk.status !== "checked_in" ? "Requests open once you're checked in." : error.message);
    else { setMessage(""); setMsg("Request sent."); load(); }
  }
  return (
    <div className="mt-6 max-w-2xl">
      <div className="flex flex-wrap gap-2">
        {(["Extra towels", "Room cleaning", "Extra pillows", "Drinking water", "AC not working", "Wi-Fi issue"]).map((q) => (
          <button key={q} onClick={() => { setMessage(q); setKind(q.includes("AC") || q.includes("Wi-Fi") ? "maintenance" : "housekeeping"); }} className="border border-border bg-background px-3 py-1 text-xs">{q}</button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className="border border-border bg-background px-2 text-sm">
          <option value="housekeeping">Housekeeping</option><option value="maintenance">Maintenance</option><option value="other">Other</option>
        </select>
        <input value={message} maxLength={500} onChange={(e) => setMessage(e.target.value)} placeholder="How can we help?" className="flex-1 border border-border bg-background px-3 py-2 text-sm" />
        <button onClick={send} className="bg-gold px-4 text-xs tracking-widest text-primary">SEND</button>
      </div>
      {msg && <p className="mt-2 text-sm text-gold">{msg}</p>}
      <ul className="mt-4 grid gap-2">
        {rows.map((r) => <li key={r.id} className="flex justify-between bg-background p-3 text-sm"><span><b className="uppercase text-xs tracking-widest">{r.kind}</b> · {r.message}</span><span className="text-xs uppercase">{r.status.replace("_", " ")}</span></li>)}
      </ul>
    </div>
  );
}
