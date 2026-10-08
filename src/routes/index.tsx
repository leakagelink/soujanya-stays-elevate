import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowDown, ArrowUpRight, ArrowRight, Menu, X, Users, Leaf, CalendarDays, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/home/Reveal";
import forestSuite from "@/assets/forest-suite.jpg";
import poolVilla from "@/assets/pool-villa.jpg";
import familyCottage from "@/assets/family-cottage.jpg";
import presidentialRetreat from "@/assets/presidential-retreat.jpg";
import spaPhoto from "@/assets/spa-experience.jpg";
import diningPhoto from "@/assets/dining-experience.jpg";
import naturePhoto from "@/assets/nature-experience.jpg";
import { useSuspenseQuery } from "@tanstack/react-query";
import hero from "@/assets/hero.jpg";
import logoAsset from "@/assets/soujanya-logo.webp.asset.json";

const logo = logoAsset.url;
import { POLICIES, recordConsents } from "@/components/OpsExtras";
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

const roomPhotos = [forestSuite, poolVilla, familyCottage, presidentialRetreat];
const experiences = [
  { label: "Into the wild", name: "Sunrise Valley Trek", photo: naturePhoto, detail: "Slow mornings. Open trails. A little closer to nature." },
  { label: "A moment of calm", name: "Ayurvedic Spa Rituals", photo: spaPhoto, detail: "Take a breath and make a little time for yourself." },
  { label: "Evenings to remember", name: "Candlelight Poolside Dinner", photo: diningPhoto, detail: "Good food, warm conversation and an unhurried evening." },
];

function Index() {
  const { data: dbRooms } = useSuspenseQuery(roomsQuery);
  const rooms = dbRooms.map((x) => ({ id: x.id, name: x.name, price: x.price_per_night, guests: x.max_guests, desc: x.description }));
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [ci, setCi] = useState("");
  const [co, setCo] = useState("");
  const [guests, setGuests] = useState(2);
  const [room, setRoom] = useState(rooms[0]?.name ?? "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [agree, setAgree] = useState(false);
  const [wait, setWait] = useState<"" | "can" | "done">("");
  const nights = ci && co ? Math.max(0, (new Date(co).getTime() - new Date(ci).getTime()) / 864e5) : 0;
  const r = rooms.find((x) => x.name === room) ?? rooms[0];
  const sub = nights * (r?.price ?? 0);
  const tax = Math.round(sub * 0.18);
  const today = new Date().toISOString().slice(0, 10);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !r || nights <= 0) return;
    if (!agree) { setErr("Please accept the resort policies to continue."); return; }
    setBusy(true); setErr("");
    const { data, error } = await supabase.from("bookings").insert({
      user_id: user.id, room_type_id: r.id, guest_name: name, phone, check_in: ci, check_out: co, guests,
      nights: 0, subtotal: 0, gst: 0, total: 0,
    }).select("id").single();
    setBusy(false);
    if (error) { setErr(error.message); setWait(error.message.includes("No rooms") ? "can" : ""); } else { await recordConsents(user.id, data.id, POLICIES.map(([k]) => k)); setDone(data.id); }
  }
  async function joinWaitlist() {
    if (!user || !r) return;
    const { error } = await supabase.from("waitlist").insert({ user_id: user.id, room_type_id: r.id, guest_name: name, phone, email: user.email ?? "", check_in: ci, check_out: co, guests });
    if (error) setErr(error.message); else { setErr(""); setWait("done"); }
  }

  function scrollTo(id: string) {
    setMenuOpen(false);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  }

  return (
    <div className="resort-home overflow-x-clip bg-background font-sans">
      <section className="home-hero relative flex flex-col overflow-hidden bg-primary">
        <img src={hero} alt="Forest resort villas beside an infinity pool at sunset" width={1920} height={1088} fetchPriority="high" className="hero-photo absolute inset-0 h-full w-full object-cover object-center" />
        <div className="hero-overlay absolute inset-0" />
        <header className="home-shell relative z-30 flex items-center justify-between gap-4 py-6 text-ivory md:py-8">
          <a href="#" aria-label="Soujanya Stays home" className="flex min-w-0 items-center gap-3">
            <img src={logo} alt="Soujanya Stays logo" width={56} height={56} className="h-12 w-12 shrink-0 rounded-full md:h-14 md:w-14" />
            <span className="min-w-0"><span className="block font-display text-xl md:text-2xl">SOUJANYA STAYS</span><span className="hidden text-[10px] text-ivory/80 sm:block">STAY THE WAY YOU LIKE</span></span>
          </a>
          <nav aria-label="Main navigation" className="hidden items-center gap-9 text-xs lg:flex">
            <a href="#rooms" className="transition-colors hover:text-accent">ROOMS & VILLAS</a>
            <a href="#experiences" className="transition-colors hover:text-accent">EXPERIENCES</a>
            <a href="#book" className="transition-colors hover:text-accent">RESERVATIONS</a>
            <Button asChild className="home-glass rounded-sm px-6"><Link to={user ? "/my-bookings" : "/auth"}>{user ? "MY BOOKINGS" : "SIGN IN"}</Link></Button>
          </nav>
          <Button variant="ghost" size="icon" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)} className="text-ivory hover:bg-ivory/10 lg:hidden">{menuOpen ? <X /> : <Menu />}</Button>
          {menuOpen && <nav aria-label="Mobile navigation" className="absolute inset-x-0 top-full flex flex-col gap-1 border border-gold/30 bg-primary p-4 shadow-sm lg:hidden">
            <Button variant="ghost" onClick={() => scrollTo("rooms")} className="justify-start text-ivory">Rooms & Villas</Button>
            <Button variant="ghost" onClick={() => scrollTo("experiences")} className="justify-start text-ivory">Experiences</Button>
            <Button variant="ghost" onClick={() => scrollTo("book")} className="justify-start text-ivory">Reservations</Button>
            <Button asChild className="home-gold mt-2"><Link to={user ? "/my-bookings" : "/auth"}>{user ? "My bookings" : "Sign in"}</Link></Button>
          </nav>}
        </header>
        <div className="hero-copy home-shell relative z-10 mt-auto pb-12 text-ivory md:pb-20">
          <p className="home-kicker mb-6 flex items-center gap-4"><span className="h-px w-10 bg-gold" /> A LUXURY FOREST RETREAT · INDIA</p>
          <h1 className="home-title max-w-5xl font-display">SOUJANYA<br /><span className="italic">STAYS</span></h1>
          <p className="mt-5 max-w-lg text-lg text-ivory/90 md:text-xl">Where the forest becomes home.</p>
          <div className="mt-8 flex flex-wrap gap-3 md:gap-5">
            <Button className="home-cta home-gold" onClick={() => scrollTo("book")}>RESERVE YOUR STAY <ArrowUpRight /></Button>
            <Button className="home-cta home-glass" onClick={() => scrollTo("rooms")}>EXPLORE THE STAY <ArrowDown /></Button>
          </div>
        </div>
      </section>

      <div className="border-b border-border bg-background">
        <form aria-label="Plan your stay" onSubmit={(e) => { e.preventDefault(); scrollTo("book"); }} className="home-shell grid grid-cols-2 items-center gap-x-5 gap-y-4 py-6 md:grid-cols-[1.1fr_1.1fr_0.8fr_auto] md:gap-8 md:py-7">
          <label className="home-kicker text-muted-foreground">Arrival<input aria-label="Arrival" required type="date" min={today} value={ci} onChange={(e) => setCi(e.target.value)} className="booking-input block" /></label>
          <label className="home-kicker text-muted-foreground">Departure<input aria-label="Departure" required type="date" min={ci || today} value={co} onChange={(e) => setCo(e.target.value)} className="booking-input block" /></label>
          <label className="home-kicker text-muted-foreground">Guests<select aria-label="Number of guests" value={guests} onChange={(e) => setGuests(+e.target.value)} className="booking-input block">{Array.from({ length: r?.guests ?? 2 }, (_, i) => <option key={i} value={i + 1}>{i + 1} {i ? "guests" : "guest"}</option>)}</select></label>
          <Button type="submit" className="home-cta w-full">PLAN YOUR STAY <ArrowRight /></Button>
        </form>
      </div>

      <section id="rooms" className="home-shell py-20 md:py-28">
        <Reveal className="mb-12 flex flex-col justify-between gap-6 md:mb-16 md:flex-row md:items-end">
          <div><p className="home-kicker mb-4 text-gold">Stay a little closer</p><h2 className="home-heading font-display text-primary">Rooms & <span className="italic">Villas</span></h2></div>
          <p className="max-w-sm leading-relaxed text-muted-foreground">A space to slow down. A view to wake up to. Find your own corner of the forest.</p>
        </Reveal>
        <div className="grid gap-14 md:grid-cols-2 md:gap-x-16 md:gap-y-8 lg:gap-x-24">
          {rooms.map((x, i) => <Reveal key={x.id} className="room-item group">
            <div className="room-photo relative overflow-hidden bg-secondary">
              <img src={roomPhotos[i % roomPhotos.length]} alt={`${x.name} — illustrative resort interior`} loading="lazy" width={1024} height={1280} className="photo-zoom h-full w-full object-cover" />
              <div className="absolute right-5 top-5 bg-background px-5 py-4 text-primary md:right-7 md:top-7"><p className="text-[10px] text-muted-foreground">FROM / NIGHT</p><p className="mt-1 font-display text-3xl">{inr(x.price)}</p></div>
            </div>
            <div className="pt-6 md:pt-8"><div className="flex items-center justify-between gap-4"><h3 className="font-display text-3xl text-primary md:text-4xl">{x.name}</h3><span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" />{x.guests} guests</span></div>
              <p className="mt-3 max-w-md leading-relaxed text-muted-foreground">{x.desc}</p>
              <Button variant="link" onClick={() => { setRoom(x.name); scrollTo("book"); }} className="mt-4 h-10 rounded-none border-b border-gold/40 px-0 text-xs text-primary no-underline hover:text-gold hover:no-underline">SELECT {x.name.toUpperCase()} <ArrowUpRight /></Button>
            </div>
          </Reveal>)}
        </div>
        {!rooms.length && <p className="text-muted-foreground">Our rooms are being updated. Please check back shortly.</p>}
      </section>

      <section id="experiences" className="bg-primary py-20 text-ivory md:py-28">
        <div className="home-shell">
          <Reveal className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="home-kicker mb-4 text-accent">More than a getaway</p><h2 className="home-heading font-display">Moments that <span className="italic">stay.</span></h2></div><p className="max-w-sm leading-relaxed text-ivory/70">Wander a little. Unwind completely. Make room for the things you love.</p></Reveal>
          <div className="grid gap-8 md:grid-cols-3">{experiences.map((x, i) => <Reveal key={x.name} className="group"><div className="aspect-[4/3] overflow-hidden"><img src={x.photo} alt={x.name} width={1024} height={768} loading="lazy" className="photo-zoom h-full w-full object-cover" /></div><p className="home-kicker mb-3 mt-6 text-accent">0{i + 1} / {x.label}</p><h3 className="font-display text-3xl">{x.name}</h3><p className="mt-3 leading-relaxed text-ivory/70">{x.detail}</p></Reveal>)}</div>
          <Reveal className="mt-12 flex flex-wrap items-center justify-between gap-6 border-t border-ivory/20 pt-8"><p className="max-w-2xl text-sm leading-relaxed text-ivory/70">Also discover organic farm-to-table cooking, bonfire & folk music, and guided birding walks.</p><Button className="home-glass home-cta" onClick={() => scrollTo("book")}>MAKE IT YOUR STAY <ArrowUpRight /></Button></Reveal>
        </div>
      </section>

      <section id="book" className="home-shell py-20 md:py-28">
        <Reveal className="grid gap-12 lg:grid-cols-[1fr_360px] lg:gap-20">
          <div><p className="home-kicker mb-4 text-gold">Your forest escape</p><h2 className="home-heading font-display text-primary">Come for a stay.<br /><span className="italic">Leave with a feeling.</span></h2>
            {done ? <div className="mt-8 border-l-2 border-gold py-3 pl-6"><h3 className="font-display text-3xl text-primary">Booking request saved</h3><p className="mt-3 leading-relaxed text-muted-foreground">Reference <b>{done.slice(0, 8).toUpperCase()}</b> — your {room} for {nights} night(s). Our concierge will confirm shortly.</p><Button asChild variant="link" className="mt-4 px-0"><Link to="/my-bookings">View my bookings <ArrowRight /></Link></Button></div> :
            <form onSubmit={submit} className="mt-10 grid gap-5 sm:grid-cols-2">
              <label className="home-kicker text-primary">Check-in<input aria-label="Check-in" required type="date" min={today} value={ci} onChange={(e) => setCi(e.target.value)} className="form-input" /></label>
              <label className="home-kicker text-primary">Check-out<input aria-label="Check-out" required type="date" min={ci || today} value={co} onChange={(e) => setCo(e.target.value)} className="form-input" /></label>
              <label className="home-kicker text-primary">Room<select aria-label="Room" value={room} onChange={(e) => setRoom(e.target.value)} className="form-input">{rooms.map((x) => <option key={x.id}>{x.name}</option>)}</select></label>
              <label className="home-kicker text-primary">Guests<input aria-label="Guests" required type="number" min={1} max={r?.guests ?? 2} value={guests} onChange={(e) => setGuests(+e.target.value)} className="form-input" /></label>
              <label className="home-kicker text-primary">Full name<input required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="form-input" /></label>
              <label className="home-kicker text-primary">Phone<input required type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="form-input" /></label>
              {err && <p role="alert" className="text-sm text-destructive sm:col-span-2">{err}</p>}
              <label className="flex items-start gap-2 text-xs sm:col-span-2"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5" /><span>I accept the {POLICIES.map(([, l]) => l).join(", ")}.</span></label>
              {wait === "can" && <button type="button" onClick={joinWaitlist} className="booking-input sm:col-span-2 text-xs tracking-widest">JOIN WAITLIST — WE WILL CALL YOU IF A ROOM OPENS</button>}
              {wait === "done" && <p className="text-sm sm:col-span-2">You are on the waitlist. We will contact you if a room opens.</p>}
              {user ? <Button type="submit" disabled={busy || !r || nights <= 0} className="home-cta mt-2 w-full sm:col-span-2">{busy ? "SAVING…" : "REQUEST BOOKING"} <ArrowRight /></Button> : <Button asChild className="home-cta mt-2 w-full sm:col-span-2"><Link to="/auth">SIGN IN TO BOOK <ArrowRight /></Link></Button>}
            </form>}
          </div>
          <aside className="booking-summary h-fit border border-border bg-card p-7 lg:mt-12">
            <Leaf className="mb-5 h-7 w-7 text-gold" /><p className="home-kicker text-muted-foreground">Your stay at a glance</p><h3 className="mt-3 font-display text-3xl text-primary">{r?.name ?? "Select a room"}</h3>
            <dl className="mt-6 space-y-4 text-sm"><div className="flex justify-between gap-4"><dt className="text-muted-foreground">Per night</dt><dd>{inr(r?.price ?? 0)}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Nights</dt><dd>{nights}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">GST (18%)</dt><dd>{inr(tax)}</dd></div><div className="flex justify-between border-t border-border pt-5"><dt className="font-medium">Estimated total</dt><dd className="font-display text-3xl text-primary">{inr(sub + tax)}</dd></div></dl>
            <div className="mt-7 space-y-4 border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground"><p className="flex items-start gap-3"><ShieldCheck className="h-4 w-4 shrink-0 text-gold" />Pay at hotel · 30% advance to confirm</p><p className="flex items-start gap-3"><CalendarDays className="h-4 w-4 shrink-0 text-gold" />Free cancellation up to 48 hours before check-in</p></div>
          </aside>
        </Reveal>
      </section>
      <footer className="bg-primary py-12 text-ivory">
        <div className="home-shell"><div className="flex flex-col justify-between gap-8 md:flex-row md:items-center"><div className="flex items-center gap-4"><img src={logo} alt="Soujanya Stays logo" loading="lazy" width={64} height={64} className="h-16 w-16 rounded-full" /><div><p className="font-display text-3xl">SOUJANYA STAYS</p><p className="mt-1 text-xs text-accent">STAY THE WAY YOU LIKE</p></div></div><nav aria-label="Footer navigation" className="flex flex-wrap gap-6 text-sm text-ivory/80"><a href="#rooms">Rooms & Villas</a><a href="#experiences">Experiences</a><a href="#book">Reservations</a><Link to="/my-bookings">My Bookings</Link></nav></div><div className="mt-10 flex flex-wrap justify-between gap-3 border-t border-ivory/20 pt-6 text-xs text-ivory/60"><p>© SOUJANYA STAYS</p><p>Room & experience imagery is illustrative.</p></div></div>
      </footer>
    </div>
  );
}
