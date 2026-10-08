import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { inr } from "@/lib/rooms";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Front desk — Soujanya Stays" },
      { name: "description", content: "Staff panel for bookings, check-ins, occupancy and rooms." },
      { property: "og:title", content: "Front desk — Soujanya Stays" },
      { property: "og:description", content: "Staff panel for Soujanya Stays." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

type Booking = {
  id: string; user_id: string; guest_name: string; phone: string; check_in: string; check_out: string;
  nights: number; guests: number; total: number; status: string; notes: string; room_number: string;
  room_type_id: string; source: string; room_types: { name: string } | null;
};
type Room = { id: string; name: string; price_per_night: number; total_rooms: number; max_guests: number };
type Charge = { id: string; description: string; amount: number };

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (d: string, n: number) => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const active = (s: string) => s !== "cancelled" && s !== "checked_out";

function Admin() {
  const { user, loading } = useAuth();
  const [roles, setRoles] = useState<string[] | null>(null);
  const [tab, setTab] = useState<"desk" | "calendar" | "rooms">("desk");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  async function loadRoles() {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id);
    setRoles((data ?? []).map((r) => r.role));
  }
  async function load() {
    const [b, r] = await Promise.all([
      supabase.from("bookings").select("*,room_types(name)").order("check_in"),
      supabase.from("room_types").select("id,name,price_per_night,total_rooms,max_guests").order("sort_order"),
    ]);
    setBookings((b.data as Booking[]) ?? []);
    setRooms(r.data ?? []);
  }
  useEffect(() => { if (user) loadRoles(); }, [user]);
  const isStaff = !!roles?.some((r) => r === "admin" || r === "front_desk");
  const isAdmin = !!roles?.includes("admin");
  useEffect(() => { if (isStaff) load(); }, [isStaff]);

  if (loading) return null;
  return (
    <div className="min-h-screen bg-secondary px-4 py-10 md:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <Link to="/" className="font-display text-2xl tracking-[0.3em] text-primary">SOUJANYA STAYS</Link>
          {user && <button onClick={() => supabase.auth.signOut()} className="text-xs tracking-widest text-muted-foreground">SIGN OUT</button>}
        </div>
        <h1 className="mt-8 font-display text-5xl text-primary">Front desk</h1>
        {!user ? (
          <p className="mt-6">Please <Link to="/auth" className="text-gold underline">sign in</Link> with a staff account.</p>
        ) : roles === null ? (
          <p className="mt-6 text-muted-foreground">Checking access…</p>
        ) : !isStaff ? (
          <NoAccess onClaimed={loadRoles} />
        ) : (
          <>
            <div className="mt-6 flex gap-2 border-b border-border">
              {(["desk", "calendar", "rooms"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-2 text-xs tracking-widest uppercase ${tab === t ? "border-b-2 border-gold text-primary" : "text-muted-foreground"}`}>
                  {t === "desk" ? "Bookings" : t === "calendar" ? "Occupancy" : "Rooms & rates"}
                </button>
              ))}
            </div>
            {tab === "desk" && <Desk bookings={bookings} rooms={rooms} reload={load} />}
            {tab === "calendar" && <Calendar bookings={bookings} rooms={rooms} />}
            {tab === "rooms" && <Rooms rooms={rooms} canEdit={isAdmin} reload={load} />}
          </>
        )}
      </div>
    </div>
  );
}

function NoAccess({ onClaimed }: { onClaimed: () => void }) {
  const [msg, setMsg] = useState("");
  async function claim() {
    const { data, error } = await supabase.rpc("claim_first_admin");
    if (error || !data) setMsg("An owner account already exists. Ask the owner to give you staff access.");
    else onClaimed();
  }
  return (
    <div className="mt-6 bg-background p-6">
      <p>This account does not have staff access.</p>
      <p className="mt-2 text-sm text-muted-foreground">Setting up the resort for the first time? Make this the owner account.</p>
      <button onClick={claim} className="mt-4 bg-primary px-5 py-2 text-xs tracking-widest text-primary-foreground">MAKE ME THE OWNER</button>
      {msg && <p className="mt-3 text-sm text-destructive">{msg}</p>}
    </div>
  );
}

function Desk({ bookings, rooms, reload }: { bookings: Booking[]; rooms: Room[]; reload: () => void }) {
  const [filter, setFilter] = useState<"arrivals" | "inhouse" | "departures" | "all">("arrivals");
  const [open, setOpen] = useState<string | null>(null);
  const [walkin, setWalkin] = useState(false);
  const t = today();
  const list = bookings.filter((b) =>
    filter === "arrivals" ? b.check_in === t && (b.status === "pending" || b.status === "confirmed")
    : filter === "inhouse" ? b.status === "checked_in"
    : filter === "departures" ? b.check_out === t && b.status === "checked_in"
    : true);
  const counts = {
    arrivals: bookings.filter((b) => b.check_in === t && (b.status === "pending" || b.status === "confirmed")).length,
    inhouse: bookings.filter((b) => b.status === "checked_in").length,
    departures: bookings.filter((b) => b.check_out === t && b.status === "checked_in").length,
    all: bookings.length,
  };

  async function update(id: string, patch: import("@/integrations/supabase/types").TablesUpdate<"bookings">) {
    const { error } = await supabase.from("bookings").update(patch).eq("id", id);
    if (error) alert(error.message);
    reload();
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-2">
        {(["arrivals", "inhouse", "departures", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 text-xs tracking-widest uppercase ${filter === f ? "bg-primary text-primary-foreground" : "bg-background"}`}>
            {f === "inhouse" ? "In-house" : f === "arrivals" ? "Today's arrivals" : f === "departures" ? "Today's departures" : "All"} ({counts[f]})
          </button>
        ))}
        <button onClick={() => setWalkin(!walkin)} className="ml-auto bg-gold px-4 py-2 text-xs tracking-widest text-primary">+ WALK-IN</button>
      </div>
      {walkin && <WalkIn rooms={rooms} done={() => { setWalkin(false); reload(); }} />}
      {list.length === 0 ? <p className="mt-6 text-muted-foreground">Nothing here.</p> : (
        <ul className="mt-4 grid gap-3">
          {list.map((b) => (
            <li key={b.id} className="bg-background p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-display text-2xl text-primary">{b.guest_name} <span className="text-base text-muted-foreground">· {b.room_types?.name}{b.room_number && ` · Room ${b.room_number}`}</span></p>
                  <p className="text-sm text-muted-foreground">{b.check_in} → {b.check_out} · {b.nights} night(s) · {b.guests} guest(s) · {b.phone || "no phone"} · {b.source}</p>
                  <p className="mt-1 text-xs tracking-widest text-muted-foreground">REF {b.id.slice(0, 8).toUpperCase()} · <span className="uppercase">{b.status.replace("_", " ")}</span></p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mr-2 text-gold">{inr(b.total)}</span>
                  {b.status === "pending" && <Btn onClick={() => update(b.id, { status: "confirmed" })}>Confirm</Btn>}
                  {(b.status === "pending" || b.status === "confirmed") && (
                    <Btn onClick={() => {
                      const room = prompt("Room number to assign", b.room_number);
                      if (room !== null) update(b.id, { status: "checked_in", room_number: room, checked_in_at: new Date().toISOString() });
                    }}>Check in</Btn>
                  )}
                  {b.status === "checked_in" && <Btn onClick={() => update(b.id, { status: "checked_out", checked_out_at: new Date().toISOString() })}>Check out</Btn>}
                  {(b.status === "pending" || b.status === "confirmed") && <Btn danger onClick={() => confirm("Cancel booking?") && update(b.id, { status: "cancelled" })}>Cancel</Btn>}
                  <Btn onClick={() => setOpen(open === b.id ? null : b.id)}>{open === b.id ? "Close" : "Folio & notes"}</Btn>
                </div>
              </div>
              {open === b.id && <Folio booking={b} onSaveNotes={(notes) => update(b.id, { notes })} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Btn({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return <button onClick={onClick} className={`border px-3 py-1.5 text-xs tracking-widest uppercase ${danger ? "border-destructive text-destructive" : "border-border"}`}>{children}</button>;
}

function Folio({ booking, onSaveNotes }: { booking: Booking; onSaveNotes: (n: string) => void }) {
  const [charges, setCharges] = useState<Charge[]>([]);
  const [desc, setDesc] = useState("");
  const [amt, setAmt] = useState("");
  const [notes, setNotes] = useState(booking.notes);
  async function load() {
    const { data } = await supabase.from("folio_charges").select("id,description,amount").eq("booking_id", booking.id).order("created_at");
    setCharges(data ?? []);
  }
  useEffect(() => { load(); }, [booking.id]);
  async function add() {
    const n = parseInt(amt, 10);
    if (!desc.trim() || isNaN(n)) return;
    const { error } = await supabase.from("folio_charges").insert({ booking_id: booking.id, description: desc.trim(), amount: n });
    if (error) alert(error.message);
    setDesc(""); setAmt(""); load();
  }
  async function remove(id: string) { await supabase.from("folio_charges").delete().eq("id", id); load(); }
  const extras = charges.reduce((s, c) => s + c.amount, 0);
  return (
    <div className="mt-4 grid gap-6 border-t border-border pt-4 md:grid-cols-2">
      <div>
        <p className="text-xs tracking-widest text-muted-foreground">FOLIO</p>
        <ul className="mt-2 text-sm">
          <li className="flex justify-between py-1"><span>Room charges (incl. GST)</span><span>{inr(booking.total)}</span></li>
          {charges.map((c) => (
            <li key={c.id} className="flex justify-between py-1">
              <span>{c.description} <button onClick={() => remove(c.id)} className="ml-2 text-xs text-destructive">remove</button></span>
              <span>{inr(c.amount)}</span>
            </li>
          ))}
          <li className="mt-1 flex justify-between border-t border-border pt-2 font-semibold"><span>Total due</span><span className="text-gold">{inr(booking.total + extras)}</span></li>
        </ul>
        <div className="mt-3 flex gap-2">
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Item, e.g. Dinner, late checkout" className="flex-1 border border-border bg-transparent px-2 py-1 text-sm" />
          <input value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="₹ (− for discount)" className="w-32 border border-border bg-transparent px-2 py-1 text-sm" />
          <Btn onClick={add}>Add</Btn>
        </div>
      </div>
      <div>
        <p className="text-xs tracking-widest text-muted-foreground">GUEST NOTES & PREFERENCES</p>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="mt-2 w-full border border-border bg-transparent p-2 text-sm" placeholder="Early check-in, allergies, anniversary…" />
        <Btn onClick={() => onSaveNotes(notes)}>Save notes</Btn>
      </div>
    </div>
  );
}

function WalkIn({ rooms, done }: { rooms: Room[]; done: () => void }) {
  const [f, setF] = useState({ guest_name: "", phone: "", room_type_id: rooms[0]?.id ?? "", check_in: today(), check_out: addDays(today(), 1), guests: 2 });
  async function save() {
    const { data: u } = await supabase.auth.getUser();
    if (!f.guest_name.trim()) return alert("Guest name required");
    const { error } = await supabase.from("bookings").insert({
      ...f, user_id: u.user!.id, status: "confirmed", source: "walk-in", nights: 0, subtotal: 0, gst: 0, total: 0,
    });
    if (error) return alert(error.message);
    done();
  }
  const inp = "border border-border bg-transparent px-2 py-1.5 text-sm";
  return (
    <div className="mt-4 grid gap-3 bg-background p-5 md:grid-cols-3">
      <input className={inp} placeholder="Guest name" value={f.guest_name} onChange={(e) => setF({ ...f, guest_name: e.target.value })} />
      <input className={inp} placeholder="Phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      <select className={inp} value={f.room_type_id} onChange={(e) => setF({ ...f, room_type_id: e.target.value })}>
        {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select>
      <input type="date" className={inp} value={f.check_in} onChange={(e) => setF({ ...f, check_in: e.target.value })} />
      <input type="date" className={inp} value={f.check_out} onChange={(e) => setF({ ...f, check_out: e.target.value })} />
      <input type="number" min={1} className={inp} value={f.guests} onChange={(e) => setF({ ...f, guests: +e.target.value })} />
      <button onClick={save} className="bg-primary px-4 py-2 text-xs tracking-widest text-primary-foreground md:col-span-3">SAVE WALK-IN (price calculated automatically)</button>
    </div>
  );
}

function Calendar({ bookings, rooms }: { bookings: Booking[]; rooms: Room[] }) {
  const [start, setStart] = useState(today());
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(start, i)), [start]);
  const used = (roomId: string, d: string) => bookings.filter((b) => b.room_type_id === roomId && active(b.status) && b.check_in <= d && d < b.check_out).length;
  return (
    <div className="mt-6">
      <div className="flex items-center gap-3">
        <Btn onClick={() => setStart(addDays(start, -14))}>‹ Prev</Btn>
        <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="border border-border bg-transparent px-2 py-1 text-sm" />
        <Btn onClick={() => setStart(addDays(start, 14))}>Next ›</Btn>
        <span className="text-xs text-muted-foreground">Rooms booked / total. Gold = full.</span>
      </div>
      <div className="mt-4 overflow-x-auto bg-background">
        <table className="w-full text-sm">
          <thead><tr><th className="p-2 text-left">Room</th>{days.map((d) => <th key={d} className="p-2 text-xs font-normal text-muted-foreground">{d.slice(8)}/{d.slice(5, 7)}</th>)}</tr></thead>
          <tbody>
            {rooms.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="whitespace-nowrap p-2">{r.name}</td>
                {days.map((d) => {
                  const n = used(r.id, d);
                  return <td key={d} className={`p-2 text-center ${n >= r.total_rooms ? "bg-gold text-primary" : n > 0 ? "bg-secondary" : ""}`}>{n}/{r.total_rooms}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Rooms({ rooms, canEdit, reload }: { rooms: Room[]; canEdit: boolean; reload: () => void }) {
  return (
    <div className="mt-6 grid gap-3">
      {!canEdit && <p className="text-sm text-muted-foreground">Only the owner can change rates.</p>}
      {rooms.map((r) => <RoomRow key={r.id} room={r} canEdit={canEdit} reload={reload} />)}
    </div>
  );
}

function RoomRow({ room, canEdit, reload }: { room: Room; canEdit: boolean; reload: () => void }) {
  const [p, setP] = useState(room.price_per_night);
  const [t, setT] = useState(room.total_rooms);
  const [g, setG] = useState(room.max_guests);
  async function save() {
    const { error } = await supabase.from("room_types").update({ price_per_night: p, total_rooms: t, max_guests: g }).eq("id", room.id);
    if (error) alert(error.message); else reload();
  }
  const inp = "w-24 border border-border bg-transparent px-2 py-1 text-sm";
  return (
    <div className="flex flex-wrap items-center gap-4 bg-background p-4">
      <p className="flex-1 font-display text-xl text-primary">{room.name}</p>
      <label className="text-xs">₹/night <input disabled={!canEdit} type="number" className={inp} value={p} onChange={(e) => setP(+e.target.value)} /></label>
      <label className="text-xs">Rooms <input disabled={!canEdit} type="number" className={inp} value={t} onChange={(e) => setT(+e.target.value)} /></label>
      <label className="text-xs">Max guests <input disabled={!canEdit} type="number" className={inp} value={g} onChange={(e) => setG(+e.target.value)} /></label>
      {canEdit && <Btn onClick={save}>Save</Btn>}
    </div>
  );
}
