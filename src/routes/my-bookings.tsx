import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { inr } from "@/lib/rooms";

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

type Row = { id: string; check_in: string; check_out: string; nights: number; guests: number; total: number; status: string; room_types: { name: string } | null };

function MyBookings() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);

  async function load() {
    const { data } = await supabase.from("bookings").select("id,check_in,check_out,nights,guests,total,status,room_types(name)").order("created_at", { ascending: false });
    setRows((data as Row[]) ?? []);
  }
  useEffect(() => { if (user) load(); }, [user]);

  async function cancel(id: string) {
    if (!confirm("Cancel this booking request?")) return;
    await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
    load();
  }

  return (
    <div className="min-h-screen bg-secondary px-6 py-12 md:px-12">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <Link to="/" className="font-display text-2xl tracking-[0.3em] text-primary">SOUJANYA STAYS</Link>
          {user && <button onClick={() => supabase.auth.signOut()} className="text-xs tracking-widest text-muted-foreground">SIGN OUT</button>}
        </div>
        <h1 className="mt-10 font-display text-5xl text-primary">My bookings</h1>
        {loading ? null : !user ? (
          <p className="mt-6">Please <Link to="/auth" className="text-gold underline">sign in</Link> to see your bookings.</p>
        ) : rows === null ? (
          <p className="mt-6 text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="mt-6 text-muted-foreground">No bookings yet. <Link to="/" hash="book" className="text-gold underline">Book a stay</Link></p>
        ) : (
          <ul className="mt-8 grid gap-4">
            {rows.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-4 bg-background p-6">
                <div>
                  <p className="font-display text-2xl text-primary">{b.room_types?.name}</p>
                  <p className="text-sm text-muted-foreground">{b.check_in} → {b.check_out} · {b.nights} night(s) · {b.guests} guest(s)</p>
                  <p className="mt-1 text-xs tracking-widest text-muted-foreground">REF {b.id.slice(0, 8).toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <p className="text-gold">{inr(b.total)}</p>
                  <p className="text-xs tracking-widest uppercase">{b.status}</p>
                  {b.status === "pending" && <button onClick={() => cancel(b.id)} className="mt-2 text-xs text-destructive underline">Cancel</button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
