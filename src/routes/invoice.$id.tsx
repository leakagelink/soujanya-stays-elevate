import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/rooms";

export const Route = createFileRoute("/invoice/$id")({
  head: () => ({
    meta: [
      { title: "Tax invoice — Soujanya Stays" },
      { name: "description", content: "GST invoice for your stay at Soujanya Stays." },
      { property: "og:title", content: "Tax invoice — Soujanya Stays" },
      { property: "og:description", content: "GST invoice for your stay." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Invoice,
});

type B = { id: string; guest_name: string; phone: string; check_in: string; check_out: string; nights: number; guests: number; subtotal: number; gst: number; total: number; status: string; room_number: string; room_types: { name: string } | null };

function Invoice() {
  const { id } = Route.useParams();
  const [b, setB] = useState<B | null | undefined>(undefined);
  const [charges, setCharges] = useState<{ id: string; description: string; amount: number }[]>([]);
  const [pays, setPays] = useState<{ id: string; amount: number; kind: string; method: string; created_at: string }[]>([]);
  useEffect(() => {
    (async () => {
      const [x, c, p] = await Promise.all([
        supabase.from("bookings").select("*,room_types(name)").eq("id", id).maybeSingle(),
        supabase.from("folio_charges").select("id,description,amount").eq("booking_id", id).order("created_at"),
        supabase.from("payments").select("id,amount,kind,method,created_at").eq("booking_id", id).order("created_at"),
      ]);
      setB((x.data as B) ?? null); setCharges(c.data ?? []); setPays(p.data ?? []);
    })();
  }, [id]);
  if (b === undefined) return <p className="p-10 text-muted-foreground">Loading…</p>;
  if (b === null) return <p className="p-10">Invoice not found. <Link to="/auth" className="text-gold underline">Sign in</Link> to view it.</p>;
  const extras = charges.reduce((s, c) => s + c.amount, 0);
  const grand = b.total + extras;
  const paid = pays.reduce((s, p) => s + (p.kind === "refund" ? -p.amount : p.amount), 0);
  return (
    <div className="min-h-screen bg-secondary px-4 py-10 print:bg-background">
      <div className="mx-auto max-w-3xl bg-background p-8">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-display text-3xl tracking-[0.2em] text-primary">SOUJANYA STAYS</p>
            <p className="text-xs text-muted-foreground">GSTIN: — (to be added)</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-display text-2xl text-primary">Tax Invoice</p>
            <p>No. SS-{b.id.slice(0, 8).toUpperCase()}</p>
            <p>{new Date().toLocaleDateString("en-IN")}</p>
          </div>
        </div>
        <div className="mt-6 text-sm">
          <p><b>{b.guest_name}</b> {b.phone && `· ${b.phone}`}</p>
          <p>{b.room_types?.name}{b.room_number && ` · Room ${b.room_number}`} · {b.check_in} → {b.check_out} · {b.nights} night(s) · {b.guests} guest(s)</p>
        </div>
        <table className="mt-6 w-full text-sm">
          <tbody>
            <tr className="border-b border-border"><td className="py-2">Room charges (HSN 9963)</td><td className="text-right">{inr(b.subtotal)}</td></tr>
            <tr className="border-b border-border"><td className="py-2">CGST 9%</td><td className="text-right">{inr(Math.round(b.gst / 2))}</td></tr>
            <tr className="border-b border-border"><td className="py-2">SGST 9%</td><td className="text-right">{inr(b.gst - Math.round(b.gst / 2))}</td></tr>
            {charges.map((c) => <tr key={c.id} className="border-b border-border"><td className="py-2">{c.description}</td><td className="text-right">{inr(c.amount)}</td></tr>)}
            <tr className="font-semibold"><td className="py-2">Total</td><td className="text-right text-gold">{inr(grand)}</td></tr>
            {pays.map((p) => <tr key={p.id} className="text-muted-foreground"><td className="py-1">{p.kind === "refund" ? "Refund" : "Paid"} ({p.method.toUpperCase()}) {p.created_at.slice(0, 10)}</td><td className="text-right">{p.kind === "refund" ? "+" : "−"}{inr(p.amount)}</td></tr>)}
            <tr className="border-t border-border font-semibold"><td className="py-2">Balance due</td><td className="text-right">{inr(grand - paid)}</td></tr>
          </tbody>
        </table>
        <p className="mt-6 text-xs text-muted-foreground">Payment at hotel. 30% advance confirms the booking. Free cancellation up to 48 hours before check-in.</p>
        <button onClick={() => window.print()} className="mt-6 bg-primary px-5 py-2 text-xs tracking-widest text-primary-foreground print:hidden">DOWNLOAD / PRINT PDF</button>
      </div>
    </div>
  );
}
