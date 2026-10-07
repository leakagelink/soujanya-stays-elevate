import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import hero from "@/assets/hero.jpg";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { roomsQuery, inr } from "@/lib/rooms";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Soujanya Stays — Stay The Way You Like" },
      { name: "description", content: "A luxury Indian forest resort. Book villas, suites, curated experiences and dining at Soujanya Stays." },
      { property: "og:title", content: "Soujanya Stays — Stay The Way You Like" },
      { property: "og:description", content: "Luxury villas, suites and experiences in the heart of nature." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(roomsQuery),
  component: Index,
});

const experiences = ["Sunrise Valley Trek", "Ayurvedic Spa Rituals", "Candlelight Poolside Dinner", "Organic Farm-to-Table Cooking", "Bonfire & Folk Music", "Guided Birding Walk"];

function Index() {
  const { data: dbRooms } = useSuspenseQuery(roomsQuery);
  const rooms = dbRooms.map((x) => ({ id: x.id, name: x.name, price: x.price_per_night, guests: x.max_guests, desc: x.description }));
  const { user } = useAuth();
  const [ci, setCi] = useState("");
  const [co, setCo] = useState("");
  const [guests, setGuests] = useState(2);
  const [room, setRoom] = useState(rooms[0]?.name ?? "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const nights = ci && co ? Math.max(0, (new Date(co).getTime() - new Date(ci).getTime()) / 864e5) : 0;
  const r = (rooms.find((x) => x.name === room) ?? rooms[0])!;
  const sub = nights * r.price;
  const tax = Math.round(sub * 0.18);
  const today = new Date().toISOString().slice(0, 10);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || nights <= 0) return;
    setBusy(true); setErr("");
    const { data, error } = await supabase.from("bookings").insert({
      user_id: user.id, room_type_id: r.id, guest_name: name, phone, check_in: ci, check_out: co, guests,
      nights: 0, subtotal: 0, gst: 0, total: 0,
    }).select("id").single();
    setBusy(false);
    if (error) setErr(error.message); else setDone(data.id);
  }

  return (
    <div className="font-sans">
      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-6 py-5 text-ivory md:px-12">
        <div>
          <div className="font-display text-2xl tracking-[0.3em]">SOUJANYA STAYS</div>
          <div className="text-[10px] tracking-[0.4em] text-accent">STAY THE WAY YOU LIKE</div>
        </div>
        <nav className="flex gap-6 text-xs tracking-widest md:gap-8 md:text-sm">
          <a href="#rooms" className="hidden md:inline">ROOMS</a><a href="#experiences" className="hidden md:inline">EXPERIENCES</a><a href="#book" className="hidden md:inline">BOOK</a>
          {user ? <Link to="/my-bookings">MY BOOKINGS</Link> : <Link to="/auth">SIGN IN</Link>}
        </nav>
      </header>

      <section className="relative flex min-h-[92vh] items-end">
        <img src={hero} alt="Soujanya Stays infinity pool at sunset" width={1920} height={1088} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/40 to-transparent" />
        <div className="relative px-6 pb-20 text-ivory md:px-12">
          <p className="mb-4 text-xs tracking-[0.4em] text-accent">A LUXURY FOREST RESORT · INDIA</p>
          <h1 className="font-display text-5xl leading-tight md:text-8xl">Where the forest<br />becomes home.</h1>
          <a href="#book" className="mt-8 inline-block bg-gold px-8 py-4 text-sm tracking-widest text-primary-foreground hover:opacity-90">RESERVE YOUR STAY</a>
        </div>
      </section>

      <section id="rooms" className="px-6 py-24 md:px-12">
        <p className="text-xs tracking-[0.4em] text-gold">ACCOMMODATION</p>
        <h2 className="mt-2 font-display text-5xl text-primary">Rooms & Villas</h2>
        <div className="mt-12 grid gap-px bg-border md:grid-cols-2">
          {rooms.map((x) => (
            <div key={x.name} className="bg-background p-8">
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-3xl text-primary">{x.name}</h3>
                <span className="text-gold">{inr(x.price)}<span className="text-xs text-muted-foreground"> / night</span></span>
              </div>
              <p className="mt-3 text-muted-foreground">{x.desc}</p>
              <p className="mt-4 text-xs tracking-widest text-muted-foreground">UP TO {x.guests} GUESTS</p>
              <button onClick={() => { setRoom(x.name); document.getElementById("book")?.scrollIntoView({ behavior: "smooth" }); }} className="mt-6 border border-primary px-5 py-2 text-xs tracking-widest text-primary hover:bg-primary hover:text-primary-foreground">SELECT</button>
            </div>
          ))}
        </div>
      </section>

      <section id="experiences" className="bg-primary px-6 py-24 text-primary-foreground md:px-12">
        <p className="text-xs tracking-[0.4em] text-accent">CURATED</p>
        <h2 className="mt-2 font-display text-5xl">Experiences</h2>
        <ul className="mt-10 grid gap-6 md:grid-cols-3">
          {experiences.map((e, i) => (
            <li key={e} className="border-t border-accent/40 pt-4">
              <span className="text-accent">0{i + 1}</span>
              <p className="mt-2 font-display text-2xl">{e}</p>
            </li>
          ))}
        </ul>
      </section>

      <section id="book" className="px-6 py-24 md:px-12">
        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-[1fr_320px]">
          <div>
            <p className="text-xs tracking-[0.4em] text-gold">RESERVATIONS</p>
            <h2 className="mt-2 font-display text-5xl text-primary">Book your stay</h2>
            {done ? (
              <div className="mt-8 border border-gold bg-card p-8">
                <h3 className="font-display text-3xl text-primary">Booking request saved</h3>
                <p className="mt-2 text-muted-foreground">Reference <b>{done.slice(0, 8).toUpperCase()}</b> — your {room} for {nights} night(s). Our concierge will confirm shortly.</p>
                <Link to="/my-bookings" className="mt-4 inline-block text-sm text-gold underline">View my bookings</Link>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-8 grid gap-5 sm:grid-cols-2">
                <label className="text-xs tracking-widest">CHECK-IN<input required type="date" min={today} value={ci} onChange={(e) => setCi(e.target.value)} className="mt-2 w-full border border-input bg-card p-3" /></label>
                <label className="text-xs tracking-widest">CHECK-OUT<input required type="date" value={co} min={ci || today} onChange={(e) => setCo(e.target.value)} className="mt-2 w-full border border-input bg-card p-3" /></label>
                <label className="text-xs tracking-widest">ROOM<select value={room} onChange={(e) => setRoom(e.target.value)} className="mt-2 w-full border border-input bg-card p-3">{rooms.map((x) => <option key={x.name}>{x.name}</option>)}</select></label>
                <label className="text-xs tracking-widest">GUESTS<input type="number" min={1} max={r.guests} value={guests} onChange={(e) => setGuests(+e.target.value)} className="mt-2 w-full border border-input bg-card p-3" /></label>
                <input required placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className="border border-input bg-card p-3" />
                <input required type="tel" placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="border border-input bg-card p-3" />
                {err && <p className="text-sm text-destructive sm:col-span-2">{err}</p>}
                {user ? (
                  <button disabled={busy || nights <= 0} className="bg-primary py-4 text-sm tracking-widest text-primary-foreground disabled:opacity-60 sm:col-span-2">{busy ? "SAVING…" : "REQUEST BOOKING"}</button>
                ) : (
                  <Link to="/auth" className="bg-primary py-4 text-center text-sm tracking-widest text-primary-foreground sm:col-span-2">SIGN IN TO BOOK</Link>
                )}
              </form>
            )}
          </div>
          <aside className="h-fit bg-secondary p-6">
            <h3 className="font-display text-2xl text-primary">Summary</h3>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt>{r.name}</dt><dd>{inr(r.price)}</dd></div>
              <div className="flex justify-between"><dt>Nights</dt><dd>{nights}</dd></div>
              <div className="flex justify-between"><dt>GST (18%)</dt><dd>{inr(tax)}</dd></div>
              <div className="flex justify-between border-t border-border pt-2 font-semibold"><dt>Total</dt><dd className="text-gold">{inr(sub + tax)}</dd></div>
            </dl>
          </aside>
        </div>
      </section>

      <footer className="bg-primary px-6 py-10 text-center text-xs tracking-[0.3em] text-accent md:px-12">© SOUJANYA STAYS · STAY THE WAY YOU LIKE</footer>
    </div>
  );
}
