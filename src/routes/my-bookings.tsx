import { PanelHeader } from "@/components/PanelHeader";
import { Button } from "@/components/ui/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { inr } from "@/lib/rooms";
import { ModifyBooking } from "@/components/FrontDeskExtras";
import logoAsset from "@/assets/soujanya-logo.webp.asset.json";

const logo = logoAsset.url;

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
  const [edit, setEdit] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("bookings").select("id,room_type_id,check_in,check_out,nights,guests,total,status,room_types(name)").order("created_at", { ascending: false });
    setRows((data as Row[]) ?? []);
  }
  useEffect(() => { if (user) load(); }, [user]);

  async function cancel(id: string) {
    if (!confirm("Cancel this booking request?")) return;
    await supabase.from("bookings").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", id);
    load();
  }

  return (
    <div className="panel-page min-h-screen bg-secondary px-4 py-6 md:px-12">
      <div className="mx-auto max-w-4xl">
        <PanelHeader>{user && <Button variant="panel" onClick={() => supabase.auth.signOut()} className="text-xs tracking-widest text-muted-foreground">SIGN OUT</Button>}</PanelHeader>
        
        <h1 className="mt-10 font-display text-4xl md:text-5xl text-primary">My bookings</h1>
        {loading ? null : !user ? (
          <p className="mt-6">Please <Link to="/auth" className="text-gold underline">sign in</Link> to see your bookings.</p>
        ) : rows === null ? (
          <p className="mt-6 text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="mt-6 text-muted-foreground">No bookings yet. <Link to="/" hash="book" className="text-gold underline">Book a stay</Link></p>
        ) : (
          <ul className="mt-8 grid gap-4">
            {rows.map((b) => (
              <li key={b.id} className="panel-stack flex flex-wrap items-center justify-between gap-4 bg-background p-4 sm:p-6">
                <div>
                  <p className="font-display text-2xl text-primary">{b.room_types?.name}</p>
                  <p className="text-sm text-muted-foreground">{b.check_in} → {b.check_out} · {b.nights} night(s) · {b.guests} guest(s)</p>
                  <p className="mt-1 text-xs tracking-widest text-muted-foreground">REF {b.id.slice(0, 8).toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <p className="text-gold">{inr(b.total)}</p>
                  <p className="text-xs tracking-widest uppercase">{b.status}</p>
                  {b.status !== "cancelled" && <p className="text-xs text-muted-foreground">Pay at hotel · 30% advance {inr(Math.round(b.total * 0.3))} · free cancel till 48h before</p>}
                  <Link to="/invoice/$id" params={{ id: b.id }} className="mt-1 block text-xs text-gold underline">Invoice</Link>
                  {(b.status === "confirmed" || b.status === "checked_in") && <Link to="/stay" className="mt-1 block text-xs text-gold underline">Dining, spa & requests</Link>}
                  {(b.status === "pending" || b.status === "confirmed") && <Button variant="panel" onClick={() => setEdit(edit === b.id ? null : b.id)} className="mt-2 mr-3 text-xs text-gold underline">Change dates / room</Button>}
                  {b.status === "pending" && <Button variant="panel" onClick={() => cancel(b.id)} className="mt-2 text-xs text-destructive underline">Cancel</Button>}
                </div>
                {edit === b.id && <div className="w-full"><ModifyBooking booking={b} onDone={load} /></div>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
