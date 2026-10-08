import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Search, Users, ArrowUpRight, X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { roomsQuery } from "@/lib/rooms";
import { t, money } from "@/lib/i18n";
import { POLICIES, recordConsents } from "@/components/OpsExtras";
import forest from "@/assets/forest-suite.jpg";
import pool from "@/assets/pool-villa.jpg";
import cottage from "@/assets/family-cottage.jpg";
import retreat from "@/assets/presidential-retreat.jpg";
export const guestRoomPhotos = [forest, pool, cottage, retreat];

export function GuestRooms({ compact = false }: { compact?: boolean }) {
  const { data: rooms } = useSuspenseQuery(roomsQuery);
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const room = rooms.find(r => r.id === selected);
  const [ci, setCi] = useState(""); const [co, setCo] = useState("");
  const [guests, setGuests] = useState(1); const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  const [agree, setAgree] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [saved, setSaved] = useState(""); const [wait, setWait] = useState(false);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const nights = ci && co ? Math.max(0, (Date.parse(co) - Date.parse(ci)) / 86400000) : 0;
  async function reserve(e: React.FormEvent) {
    e.preventDefault(); if (!user || !room || !agree || !nights || busy) return;
    setBusy(true); setError("");
    try {
      const result = await supabase.from("bookings").insert({ user_id: user.id, room_type_id: room.id, guest_name: name, phone, check_in: ci, check_out: co, guests, nights: 0, subtotal: 0, gst: 0, total: 0 }).select("id,total").single();
      if (result.error) { setError(result.error.message); setWait(result.error.message.includes("No rooms")); return; }
      const consent = await recordConsents(user.id, result.data.id, POLICIES.map(([k]) => k));
      setSaved(`${result.data.id.slice(0, 8).toUpperCase()} · ${money(result.data.total)}`);
      if (consent.error) setError("Your reservation is saved, but policy acceptance could not be recorded. Please contact reception.");
    } catch { setError(t("guest.failed")); } finally { setBusy(false); }
  }
  async function waitlist() {
    if (!user || !room || busy) return; setBusy(true);
    const { error } = await supabase.from("waitlist").insert({ user_id: user.id, room_type_id: room.id, guest_name: name, phone, email: user.email ?? "", check_in: ci, check_out: co, guests });
    setError(error?.message ?? "You are on the waitlist. Reception will contact you if a room opens."); setWait(false); setBusy(false);
  }
  const filtered = rooms.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));
  return <section className="guest-enter">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="guest-eyebrow">SOUJANYA STAYS</p><h2 className="guest-heading">{t("guest.discover")}</h2></div>{compact && <Button asChild variant="link"><Link to="/guest" search={{ view: "rooms" }}>{t("guest.viewAll")} <ArrowUpRight /></Link></Button>}</div>
    {!compact && <div className="guest-search mb-6"><Search size={18} /><input aria-label={t("guest.search")} placeholder={t("guest.search")} value={search} onChange={e => setSearch(e.target.value)} /></div>}
    <div className="guest-room-grid">{(compact ? filtered.slice(0, 2) : filtered).map(r => <article key={r.id} className="guest-product group"><div className="guest-room-image"><img src={guestRoomPhotos[rooms.indexOf(r) % guestRoomPhotos.length]} alt={`${r.name} — illustrative interior`} loading="lazy" /><span className="guest-capacity"><Users size={14} />{r.max_guests}</span></div><div className="p-5"><h3 className="font-display text-3xl text-primary">{r.name}</h3><p className="mt-2 line-clamp-2 min-h-10 text-sm text-muted-foreground">{r.description}</p><div className="mt-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-lg font-semibold text-primary">{money(r.price_per_night)}</p><p className="text-xs text-muted-foreground">{t("guest.perNight")}</p></div><Button aria-label={`${t("guest.reserve")} — ${r.name}`} onClick={() => { setSelected(r.id); setGuests(1); setSaved(""); setError(""); setWait(false); }}>{t("guest.reserve")}<ArrowUpRight /></Button></div></div></article>)}</div>
    {!filtered.length && <p className="py-12 text-muted-foreground">{t("guest.noResults")}</p>}
    <p className="mt-3 text-xs text-muted-foreground">{t("guest.illustrative")}</p>
    {room && <div className="guest-modal-backdrop" onClick={() => setSelected(null)}><section role="dialog" aria-modal="true" aria-label={t("guest.reserve")} className="guest-booking-modal" onClick={e => e.stopPropagation()}><div className="flex items-start justify-between gap-3"><h2 className="font-display text-3xl text-primary">{room.name}</h2><Button variant="ghost" size="icon" aria-label="Close reservation" onClick={() => setSelected(null)}><X /></Button></div>
      {saved ? <div className="py-8"><ShieldCheck className="mb-4 text-primary" size={32} /><h3 className="font-display text-3xl">{t("guest.saved")}</h3><p className="mt-3">{saved}</p><p className="mt-3 text-sm text-muted-foreground">{t("guest.pending")}</p>{error && <p role="alert" className="mt-3 text-destructive">{error}</p>}<Button asChild className="mt-6"><Link to="/my-bookings">{t("guest.bookings")}</Link></Button></div> : <form onSubmit={reserve} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label>{t("guest.arrival")}<input required type="date" min={today} value={ci} onChange={e => setCi(e.target.value)} /></label><label>{t("guest.departure")}<input required type="date" min={ci || today} value={co} onChange={e => setCo(e.target.value)} /></label>
        <label>{t("guest.guests")}<input required type="number" min={1} max={room.max_guests} value={guests} onChange={e => setGuests(+e.target.value)} /></label><label>{t("guest.fullName")}<input required autoComplete="name" value={name} onChange={e => setName(e.target.value)} /></label><label className="sm:col-span-2">{t("guest.phone")}<input required type="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} /></label>
        <div className="border-t border-border pt-4 sm:col-span-2"><div className="flex justify-between"><span>{t("guest.estimate")}</span><b>{money(Math.round(nights * room.price_per_night * 1.18))}</b></div><p className="mt-2 text-xs text-muted-foreground">GST 18% · {nights} nights. {t("guest.finalRate")}</p><p className="mt-3 text-xs text-muted-foreground">{t("guest.policy")}</p></div>
        <label className="flex items-start gap-3 text-xs sm:col-span-2"><input type="checkbox" required checked={agree} onChange={e => setAgree(e.target.checked)} /><span>{t("consent.title")}: {POLICIES.map(([,label]) => label).join(", ")}.</span></label>
        {error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p>}
        {wait && <Button type="button" variant="outline" disabled={busy} onClick={waitlist} className="sm:col-span-2">{t("book.waitlist")}</Button>}
        {user ? <Button type="submit" disabled={busy || nights <= 0} className="h-12 sm:col-span-2">{busy ? t("guest.loading") : t("book.request")}</Button> : <Button asChild className="sm:col-span-2"><Link to="/auth">{t("guest.signin")}</Link></Button>}
      </form>}
    </section></div>}
  </section>;
}