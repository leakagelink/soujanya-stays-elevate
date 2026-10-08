import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BedDouble, UtensilsCrossed, Leaf, Bell, ArrowUpRight, CalendarDays, UserRound, LogOut } from "lucide-react";
import { GuestShell, type GuestView } from "@/components/guest/GuestShell";
import { GuestRooms } from "@/components/guest/GuestRooms";
import { Food, Activities, Requests, type Bk } from "@/components/guest/GuestServices";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { roomsQuery } from "@/lib/rooms";
import { t } from "@/lib/i18n";
import hero from "@/assets/hero.jpg";
import dining from "@/assets/guest-dining.jpg";
import spa from "@/assets/spa-experience.jpg";

export const Route = createFileRoute("/guest")({
  validateSearch: (search: Record<string, unknown>): { view?: GuestView } => {
    const view = search["view"];
    return { view: view === "rooms" || view === "dining" || view === "experiences" || view === "concierge" || view === "account" ? view : "home" };
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(roomsQuery),
  head: () => ({ meta: [
    { title: "Your guest app — Soujanya Stays" },
    { name: "description", content: "Reserve your next escape, enjoy room dining, book experiences and manage your Soujanya Stays reservations." },
    { property: "og:title", content: "Your guest app — Soujanya Stays" },
    { property: "og:description", content: "Your rooms, dining, experiences and concierge at Soujanya Stays." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: GuestApp,
});

function GuestApp() {
  const { view = "home" } = Route.useSearch();
  const { user, loading } = useAuth();
  const [bookings, setBookings] = useState<Bk[]>([]); const [selected, setSelected] = useState("");
  const [fetching, setFetching] = useState(false); const [error, setError] = useState("");
  useEffect(() => {
    if (!user) { setBookings([]); return; }
    let active = true; setFetching(true);
    supabase.from("bookings").select("id,check_in,check_out,status,room_number,room_types(name)").eq("user_id", user.id).in("status", ["confirmed", "checked_in", "pending"]).order("check_in").then(({ data, error }) => {
      if (!active) return; const rows = (data as Bk[]) ?? []; setBookings(rows); setError(error ? t("guest.failed") : ""); setSelected((rows.find(b => b.status === "checked_in") ?? rows.find(b => b.status === "confirmed") ?? rows[0])?.id ?? ""); setFetching(false);
    }); return () => { active = false; };
  }, [user]);
  const bk = bookings.find(b => b.id === selected);
  const serviceBk = bk && ["confirmed", "checked_in"].includes(bk.status) ? bk : undefined;
  const guestName = user?.user_metadata?.["full_name"] || user?.user_metadata?.["name"] || user?.email?.split("@")[0];
  const services = [
    { view: "rooms", label: "guest.rooms", icon: BedDouble },
    { view: "dining", label: "guest.food", icon: UtensilsCrossed },
    { view: "experiences", label: "guest.experiences", icon: Leaf },
    { view: "concierge", label: "guest.help", icon: Bell },
  ] as const;
  return <GuestShell active={view}>
    {loading ? <p className="py-8 text-muted-foreground">{t("guest.loading")}</p> : <>
      {!user && <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4"><p className="text-sm text-muted-foreground">{t("guest.signin")}</p><Button asChild><Link to="/auth">{t("guest.continue")}</Link></Button></div>}
      {view === "home" && <div className="guest-enter">
        <div className="mb-6"><p className="guest-eyebrow">{t("guest.welcome")}{guestName ? `, ${guestName}` : ""}</p><h1 className="guest-heading">{t("guest.escape")}</h1></div>
        <section className="guest-hero"><img src={hero} alt="Soujanya Stays forest resort — illustrative photograph" fetchPriority="high" /><div className="guest-hero-shade" /><div className="guest-hero-copy"><p className="text-xs text-accent">STAY THE WAY YOU LIKE</p><h2 className="font-display text-5xl">SOUJANYA STAYS</h2><Button asChild className="mt-6 bg-gold text-primary hover:bg-accent"><Link to="/guest" search={{ view: "rooms" }}>{t("guest.rooms")}<ArrowUpRight /></Link></Button></div></section>
        <nav aria-label="Stay services" className="guest-quick-actions">{services.map(({view, label, icon: Icon}) => <Button asChild key={view} variant="ghost" className="guest-quick-action"><Link to="/guest" search={{ view }}><span><Icon /></span>{t(label)}</Link></Button>)}</nav>
        {bk && <section className="guest-stay-strip mb-10"><CalendarDays className="text-gold" /><div><p className="text-xs uppercase text-muted-foreground">{t("guest.current")} · {bk.status.replaceAll("_", " ")}</p><h3 className="font-display text-2xl text-primary">{bk.room_types?.name}</h3><p className="text-xs text-muted-foreground">{bk.check_in} → {bk.check_out}{bk.room_number ? ` · Room ${bk.room_number}` : ""}</p></div><Button asChild variant="outline"><Link to="/my-bookings">{t("guest.bookings")}<ArrowUpRight /></Link></Button></section>}
        {error && <p role="alert" className="mb-4 text-destructive">{error}</p>}
        <GuestRooms compact />
        <div className="guest-promo-grid mt-10">{[{view:"dining", photo:dining, title:"guest.diningTitle", label:"guest.food"},{view:"experiences",photo:spa,title:"guest.spaTitle",label:"guest.experiences"}].map(x => <article key={x.view} className="guest-promo"><img src={x.photo} alt={`${t(x.label as "guest.food")} — illustrative photography`} loading="lazy" /><div className="p-5"><h3 className="font-display text-3xl text-primary">{t(x.title as "guest.diningTitle")}</h3><Button asChild variant="link" className="mt-2 px-0"><Link to="/guest" search={{view: x.view === "dining" ? "dining" : "experiences"}}>{t(x.label as "guest.food")}<ArrowUpRight /></Link></Button></div></article>)}</div>
      </div>}
      {view === "rooms" && <GuestRooms />}
      {(view === "dining" || view === "experiences" || view === "concierge") && <div className="guest-enter">
        {view !== "concierge" ? <section className="guest-service-cover"><img src={view === "dining" ? dining : spa} alt="Illustrative resort experience" /><div className="guest-hero-shade" /><h1 className="guest-service-title font-display text-4xl">{view === "dining" ? t("guest.diningTitle") : t("guest.spaTitle")}</h1></section> : <h1 className="guest-heading">{t("guest.helpTitle")}</h1>}
        {bookings.filter(b => ["confirmed","checked_in"].includes(b.status)).length > 0 && <label className="mt-5 block text-xs text-muted-foreground">{t("guest.current")}<select aria-label={t("guest.current")} className="mt-2 block max-w-full border border-border bg-card p-3 text-sm text-primary" value={selected} onChange={e => setSelected(e.target.value)}>{bookings.map(b => <option key={b.id} value={b.id}>{b.room_types?.name} · {b.check_in} · {b.status.replaceAll("_"," ")}</option>)}</select></label>}
        {fetching ? <p className="py-6">{t("guest.loading")}</p> : view === "dining" ? <Food key={serviceBk?.id ?? "browse"} bk={serviceBk ?? {id:"",check_in:"",check_out:"",status:"browse",room_number:"",room_types:null}} /> : serviceBk ? view === "experiences" ? <Activities key={serviceBk.id} bk={serviceBk} /> : <Requests key={serviceBk.id} bk={serviceBk} /> : <div className="py-10"><h2 className="font-display text-3xl">{t("guest.noStay")}</h2><p className="mt-3 text-muted-foreground">{t("guest.serviceStay")}</p><Button asChild className="mt-5"><Link to="/guest" search={{view:"rooms"}}>{t("guest.rooms")}</Link></Button></div>}
      </div>}
      {view === "account" && <section className="guest-enter"><p className="guest-eyebrow">SOUJANYA STAYS</p><h1 className="guest-heading">{t("guest.account")}</h1><div className="my-8 flex items-center gap-4 border-b border-border pb-8"><UserRound size={40} className="text-gold" /><div><h2 className="font-display text-3xl text-primary">{guestName || t("guest.accountDetail")}</h2><p className="text-sm text-muted-foreground">{user?.email}</p></div></div><h3 className="font-display text-2xl">{t("guest.billing")}</h3><Button asChild variant="outline" className="mt-4"><Link to="/my-bookings">{t("guest.bookings")}<ArrowUpRight /></Link></Button><h3 className="mt-8 font-display text-2xl">{t("guest.paymentTitle")}</h3><p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">{t("guest.policy")}</p>{user && <Button variant="outline" className="mt-8" onClick={() => supabase.auth.signOut()}><LogOut />{t("guest.signout")}</Button>}</section>}
    </>}
  </GuestShell>;
}