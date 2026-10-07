import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import hero from "@/assets/hero.jpg";

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
  component: Index,
});

const rooms = [
  { name: "Forest Suite", price: 12500, guests: 2, desc: "Canopy views, king bed, rain shower and private balcony." },
  { name: "Pool Villa", price: 24000, guests: 3, desc: "Private plunge pool, sundeck and outdoor bath." },
  { name: "Hillside Family Cottage", price: 18500, guests: 5, desc: "Two bedrooms, living lounge and garden sit-out." },
  { name: "Presidential Retreat", price: 48000, guests: 4, desc: "Infinity pool, butler service and valley panorama." },
];
const experiences = ["Sunrise Valley Trek", "Ayurvedic Spa Rituals", "Candlelight Poolside Dinner", "Organic Farm-to-Table Cooking", "Bonfire & Folk Music", "Guided Birding Walk"];
const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

function Index() {
  const [ci, setCi] = useState("");
  const [co, setCo] = useState("");
  const [guests, setGuests] = useState(2);
  const [room, setRoom] = useState(rooms[0].name);
  const [done, setDone] = useState(false);
  const nights = ci && co ? Math.max(0, (new Date(co).getTime() - new Date(ci).getTime()) / 864e5) : 0;
  const r = rooms.find((x) => x.name === room)!;
  const sub = nights * r.price;
  const tax = Math.round(sub * 0.18);

  return (
    <div className="font-sans">
      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-6 py-5 text-ivory md:px-12">
        <div>
          <div className="font-display text-2xl tracking-[0.3em]">SOUJANYA STAYS</div>
          <div className="text-[10px] tracking-[0.4em] text-accent">STAY THE WAY YOU LIKE</div>
        </div>
        <nav className="hidden gap-8 text-sm tracking-widest md:flex">
          <a href="#rooms">ROOMS</a><a href="#experiences">EXPERIENCES</a><a href="#book">BOOK</a>
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
                <h3 className="font-display text-3xl text-primary">Request received</h3>
                <p className="mt-2 text-muted-foreground">Our concierge will confirm your {room} for {nights} night(s) shortly.</p>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); if (nights > 0) setDone(true); }} className="mt-8 grid gap-5 sm:grid-cols-2">
                <label className="text-xs tracking-widest">CHECK-IN<input required type="date" value={ci} onChange={(e) => setCi(e.target.value)} className="mt-2 w-full border border-input bg-card p-3" /></label>
                <label className="text-xs tracking-widest">CHECK-OUT<input required type="date" value={co} min={ci} onChange={(e) => setCo(e.target.value)} className="mt-2 w-full border border-input bg-card p-3" /></label>
                <label className="text-xs tracking-widest">ROOM<select value={room} onChange={(e) => setRoom(e.target.value)} className="mt-2 w-full border border-input bg-card p-3">{rooms.map((x) => <option key={x.name}>{x.name}</option>)}</select></label>
                <label className="text-xs tracking-widest">GUESTS<input type="number" min={1} max={r.guests} value={guests} onChange={(e) => setGuests(+e.target.value)} className="mt-2 w-full border border-input bg-card p-3" /></label>
                <input required placeholder="Full name" className="border border-input bg-card p-3" />
                <input required type="email" placeholder="Email" className="border border-input bg-card p-3" />
                <button className="bg-primary py-4 text-sm tracking-widest text-primary-foreground sm:col-span-2">REQUEST BOOKING</button>
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
