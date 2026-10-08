import { GuestShell } from "@/components/guest/GuestShell";
import { guestRoomPhotos } from "@/components/guest/GuestRooms";
import { BedDouble, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { money as inr, t } from "@/lib/i18n";
import { ModifyBooking } from "@/components/FrontDeskExtras";


export const Route = createFileRoute("/my-bookings")({
  head: () => ({
    meta: [
      { title: "My bookings — Soujanya Stays" },
      { name: "description", content: "View and manage your Soujanya Stays reservations." },
      { property: "og:title", content: "My bookings — Soujanya Stays" },
      { property: "og:description", content: "Your reservations at Soujanya Stays." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyBookings,
});

type Row = { id: string; room_type_id: string; check_in: string; check_out: string; nights: number; guests: number; total: number; status: string; room_types: { name: string } | null };

function MyBookings() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all");
  const [edit, setEdit] = useState<string | null>(null);

  async function load() {
    if (!user) return;
    setError("");
    const { data, error } = await supabase.from("bookings").select("id,room_type_id,check_in,check_out,nights,guests,total,status,room_types(name)").eq("user_id", user.id).order("created_at", { ascending: false });
    if (error) { setError(error.message); return; }
    setRows((data as Row[]) ?? []);
  }
  useEffect(() => { if (user) load(); }, [user]);

  async function cancel(id: string) {
    if (!confirm("Cancel this booking request?")) return;
    const { error } = await supabase.from("bookings").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", id);
    if (error) { setError(error.message); return; }
    load();
  }

  return (
    <GuestShell active="bookings">
        <div className="guest-enter"><p className="guest-eyebrow">SOUJANYA STAYS</p><h1 className="guest-heading">{t("guest.bookings")}</h1>
        <div className="mt-6 flex gap-2">{(["all", "upcoming", "past"] as const).map(f => <Button variant={filter === f ? "default" : "outline"} key={f} onClick={() => setFilter(f)}>{f === "all" ? t("guest.all") : f === "upcoming" ? "Upcoming" : "Past stays"}</Button>)}</div>
        {error && <p role="alert" className="mt-5 text-destructive">{error} <Button variant="link" onClick={load}>{t("guest.retry")}</Button></p>}
        {loading ? <p className="mt-6">{t("guest.loading")}</p> : !user ? (
          <p className="mt-6">Please <Link to="/auth" className="text-gold underline">sign in</Link> to see your bookings.</p>
        ) : rows === null ? (
          <p className="mt-6 text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="mt-6 text-muted-foreground">{t("guest.emptyBookings")} <Link to="/guest" search={{view:"rooms"}} className="text-gold underline">Book a stay</Link></p>
        ) : (
          <ul className="mt-8 grid gap-4">
            {rows.filter(b => filter === "all" || (filter === "past" ? ["checked_out", "cancelled", "no_show"].includes(b.status) : !["checked_out", "cancelled", "no_show"].includes(b.status))).map((b, i) => (
              <li key={b.id} className="guest-booking-row border border-border bg-card p-4 sm:p-6">
                <img src={guestRoomPhotos[i % guestRoomPhotos.length]} alt="Illustrative resort room" className="guest-booking-thumb" loading="lazy" />
                <div>
                  <p className="font-display text-2xl text-primary">{b.room_types?.name}</p>
                  <p className="text-sm text-muted-foreground">{b.check_in} → {b.check_out} · {b.nights} night(s) · {b.guests} guest(s)</p>
                  <p className="mt-1 text-xs tracking-widest text-muted-foreground">REF {b.id.slice(0, 8).toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-primary">{inr(b.total)}</p>
                  <p className="text-xs tracking-widest uppercase">{b.status}</p>
                  {b.status !== "cancelled" && <p className="text-xs text-muted-foreground">Pay at hotel · 30% advance {inr(Math.round(b.total * 0.3))} · free cancel till 48h before</p>}
                  <Link to="/invoice/$id" params={{ id: b.id }} className="mt-2 block text-sm text-primary underline">{t("guest.invoice")}</Link>
                  {(b.status === "confirmed" || b.status === "checked_in") && <Link to="/guest" search={{view:"dining"}} className="mt-1 block text-xs text-gold underline">Dining, spa & requests</Link>}
                  {(b.status === "pending" || b.status === "confirmed") && <Button variant="panel" onClick={() => setEdit(edit === b.id ? null : b.id)} className="mt-2 mr-3 text-xs text-gold underline">{t("guest.change")}</Button>}
                  {b.status === "pending" && <Button variant="panel" onClick={() => cancel(b.id)} className="mt-2 text-xs text-destructive underline">{t("guest.cancel")}</Button>}
                </div>
                {edit === b.id && <div className="w-full sm:col-span-3"><ModifyBooking booking={b} onDone={load} /></div>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </GuestShell>
  );
}
