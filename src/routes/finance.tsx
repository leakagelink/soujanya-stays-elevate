import { DailyReport } from "@/components/OpsExtras";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useMyRoles } from "@/lib/staff";
import { inr } from "@/lib/rooms";
import { kpis, toCsv } from "@/lib/finance";

export const Route = createFileRoute("/finance")({
  head: () => ({
    meta: [
      { title: "Finance & reports — Soujanya Stays" },
      { name: "description", content: "Revenue, occupancy, expenses, P&L and GST reports." },
      { property: "og:title", content: "Finance & reports — Soujanya Stays" },
      { property: "og:description", content: "Revenue, occupancy, expenses, P&L and GST reports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Finance,
});

type Bk = { id: string; guest_name: string; check_in: string; check_out: string; nights: number; subtotal: number; gst: number; total: number; status: string; source: string; created_at: string; room_types: { name: string } | null };
type Exp = { id: string; date: string; category: string; vendor: string; description: string; amount: number; gst: number; bill_no: string; paid: boolean };
const CATS = ["Food & supplies", "Salaries", "Utilities", "Maintenance", "Laundry", "Marketing", "Commission", "Rent", "Other"];
const iso = (d: Date) => d.toISOString().slice(0, 10);

function download(name: string, rows: (string | number)[][]) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([toCsv(rows)], { type: "text/csv" }));
  a.download = name; a.click();
}

function Finance() {
  const { user, loading } = useAuth();
  const roles = useMyRoles(user?.id);
  const ok = !!roles?.some((r) => r === "admin" || r === "finance");
  const now = new Date();
  const [from, setFrom] = useState(iso(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [to, setTo] = useState(iso(now));
  const [tab, setTab] = useState<"dash" | "daily" | "exp" | "reports">("dash");
  const [bk, setBk] = useState<Bk[]>([]);
  const [rooms, setRooms] = useState(0);
  const [pays, setPays] = useState<{ amount: number; kind: string; method: string; created_at: string }[]>([]);
  const [folio, setFolio] = useState<{ description: string; amount: number; created_at: string }[]>([]);
  const [exps, setExps] = useState<Exp[]>([]);
  const [ne, setNe] = useState({ date: iso(now), category: CATS[0] as string, vendor: "", description: "", amount: "", gst: "", bill_no: "", paid: true });

  async function load() {
    const end = to + "T23:59:59";
    const [b, r, p, f, e] = await Promise.all([
      supabase.from("bookings").select("id,guest_name,check_in,check_out,nights,subtotal,gst,total,status,source,created_at,room_types(name)").lte("check_in", to).gte("check_out", from),
      supabase.from("rooms").select("id", { count: "exact", head: true }),
      supabase.from("payments").select("amount,kind,method,created_at").gte("created_at", from).lte("created_at", end),
      supabase.from("folio_charges").select("description,amount,created_at").gte("created_at", from).lte("created_at", end),
      supabase.from("expenses").select("*").gte("date", from).lte("date", to).order("date", { ascending: false }),
    ]);
    setBk((b.data as Bk[]) ?? []); setRooms(r.count ?? 0); setPays(p.data ?? []); setFolio(f.data ?? []); setExps((e.data as Exp[]) ?? []);
  }
  useEffect(() => { if (ok && from <= to) load(); }, [ok, from, to]);

  const k = useMemo(() => kpis(bk, rooms, from, to), [bk, rooms, from, to]);
  const live = bk.filter((b) => b.status !== "cancelled" && b.status !== "pending");
  const roomGst = Math.round(k.revenue * 0.18);
  const extras = folio.reduce((s, c) => s + c.amount, 0);
  const food = folio.filter((c) => c.description.startsWith("Food")).reduce((s, c) => s + c.amount, 0);
  const discounts = folio.filter((c) => c.amount < 0).reduce((s, c) => s + c.amount, 0);
  const otherExtras = extras - food - discounts;
  const collected = pays.reduce((s, p) => s + (p.kind === "refund" ? -p.amount : p.amount), 0);
  const expTotal = exps.reduce((s, e) => s + e.amount, 0);
  const expGst = exps.reduce((s, e) => s + e.gst, 0);
  const income = k.revenue + extras;
  const profit = income - expTotal;
  const bySource = Object.entries(live.reduce<Record<string, { n: number; rev: number }>>((m, b) => { const s = b.source || "website"; m[s] ??= { n: 0, rev: 0 }; m[s].n++; m[s].rev += b.total; return m; }, {}));
  const byType = Object.entries(live.reduce<Record<string, number>>((m, b) => { const t = b.room_types?.name ?? "—"; m[t] = (m[t] ?? 0) + b.subtotal; return m; }, {}));
  const byMethod = Object.entries(pays.reduce<Record<string, number>>((m, p) => { m[p.method] = (m[p.method] ?? 0) + (p.kind === "refund" ? -p.amount : p.amount); return m; }, {}));
  const byCat = Object.entries(exps.reduce<Record<string, number>>((m, e) => { m[e.category] = (m[e.category] ?? 0) + e.amount; return m; }, {}));

  async function addExp() {
    const amount = parseInt(ne.amount); if (!amount || amount < 1 || !user) return alert("Enter an amount");
    const { error } = await supabase.from("expenses").insert({ date: ne.date, category: ne.category ?? "Other", vendor: ne.vendor.trim(), description: ne.description.trim(), amount, gst: parseInt(ne.gst) || 0, bill_no: ne.bill_no.trim(), paid: ne.paid, created_by: user.id });
    if (error) return alert(error.message);
    setNe({ ...ne, vendor: "", description: "", amount: "", gst: "", bill_no: "" }); load();
  }
  async function delExp(id: string) { if (confirm("Delete this expense?")) { await supabase.from("expenses").delete().eq("id", id); load(); } }
  async function togglePaid(e: Exp) { await supabase.from("expenses").update({ paid: !e.paid }).eq("id", e.id); load(); }

  if (loading || (user && roles === null)) return <p className="p-10 text-muted-foreground">Loading…</p>;
  if (!user || !ok) return <p className="p-10">Only the owner and finance staff can see this page. <Link to="/auth" className="text-gold underline">Sign in</Link></p>;

  const Card = ({ l, v, s }: { l: string; v: string; s?: string }) => <div className="border border-border bg-background p-4"><p className="text-xs tracking-widest text-muted-foreground">{l}</p><p className="mt-1 font-display text-3xl text-primary">{v}</p>{s && <p className="text-xs text-muted-foreground">{s}</p>}</div>;
  const Row = ({ l, v, b }: { l: string; v: number; b?: boolean }) => <tr className={`border-b border-border ${b ? "font-semibold" : ""}`}><td className="py-2">{l}</td><td className="text-right">{inr(v)}</td></tr>;
  const inp = "border border-border bg-background px-3 py-2 text-sm";

  return (
    <div className="min-h-screen bg-secondary">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background px-6 py-4 print:hidden">
        <Link to="/admin" className="font-display text-2xl tracking-[0.2em] text-primary">FINANCE</Link>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inp} />
          <span>→</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inp} />
          <button onClick={() => window.print()} className="border border-primary px-3 py-2 text-xs tracking-widest text-primary">PRINT / PDF</button>
        </div>
      </header>
      <nav className="flex gap-6 bg-background px-6 pb-3 print:hidden">
        {([["dash", "Dashboard"], ["daily", "Daily report"], ["exp", "Expenses & bills"], ["reports", "P&L & GST"]] as const).map(([t, l]) => <button key={t} onClick={() => setTab(t)} className={`text-xs tracking-widest ${tab === t ? "text-gold" : "text-muted-foreground"}`}>{l.toUpperCase()}</button>)}
      </nav>
      <main className="mx-auto max-w-6xl space-y-6 p-6">
        <p className="text-sm text-muted-foreground">Period: {from} to {to}</p>
        {tab === "dash" && <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card l="ROOM REVENUE" v={inr(k.revenue)} s="before GST" />
            <Card l="OCCUPANCY" v={`${k.occupancy}%`} s={`${k.sold} of ${k.available} room nights`} />
            <Card l="ADR" v={inr(k.adr)} s="average rate per sold night" />
            <Card l="REVPAR" v={inr(k.revpar)} s="revenue per available room" />
            <Card l="FOOD & EXTRAS" v={inr(extras)} />
            <Card l="COLLECTED" v={inr(collected)} s="payments minus refunds" />
            <Card l="EXPENSES" v={inr(expTotal)} />
            <Card l="PROFIT" v={inr(profit)} />
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <section className="bg-background p-4"><h3 className="font-display text-xl text-primary">Source of business</h3><table className="mt-2 w-full text-sm"><tbody>{bySource.map(([s, v]) => <tr key={s} className="border-b border-border"><td className="py-2 capitalize">{s.replace("_", " ")}</td><td>{v.n} bookings</td><td className="text-right">{inr(v.rev)}</td></tr>)}</tbody></table></section>
            <section className="bg-background p-4"><h3 className="font-display text-xl text-primary">By room type</h3><table className="mt-2 w-full text-sm"><tbody>{byType.map(([t, v]) => <Row key={t} l={t} v={v} />)}</tbody></table></section>
            <section className="bg-background p-4"><h3 className="font-display text-xl text-primary">Payments by method</h3><table className="mt-2 w-full text-sm"><tbody>{byMethod.map(([m, v]) => <Row key={m} l={m.toUpperCase()} v={v} />)}</tbody></table></section>
          </div>
          <button onClick={() => download(`bookings_${from}_${to}.csv`, [["Guest", "Room type", "Check-in", "Check-out", "Nights", "Status", "Source", "Subtotal", "GST", "Total"], ...bk.map((b) => [b.guest_name, b.room_types?.name ?? "", b.check_in, b.check_out, b.nights, b.status, b.source, b.subtotal, b.gst, b.total])])} className="bg-primary px-4 py-2 text-xs tracking-widest text-primary-foreground print:hidden">EXPORT BOOKINGS CSV</button>
        </>}
        {tab === "exp" && <>
          <section className="grid gap-2 bg-background p-4 md:grid-cols-4 print:hidden">
            <input type="date" value={ne.date} onChange={(e) => setNe({ ...ne, date: e.target.value })} className={inp} />
            <select value={ne.category} onChange={(e) => setNe({ ...ne, category: e.target.value })} className={inp}>{CATS.map((c) => <option key={c}>{c}</option>)}</select>
            <input placeholder="Vendor" value={ne.vendor} onChange={(e) => setNe({ ...ne, vendor: e.target.value })} className={inp} />
            <input placeholder="Bill no." value={ne.bill_no} onChange={(e) => setNe({ ...ne, bill_no: e.target.value })} className={inp} />
            <input placeholder="Description" value={ne.description} onChange={(e) => setNe({ ...ne, description: e.target.value })} className={`${inp} md:col-span-2`} />
            <input placeholder="Amount ₹ (incl. GST)" inputMode="numeric" value={ne.amount} onChange={(e) => setNe({ ...ne, amount: e.target.value })} className={inp} />
            <input placeholder="GST in bill ₹" inputMode="numeric" value={ne.gst} onChange={(e) => setNe({ ...ne, gst: e.target.value })} className={inp} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={ne.paid} onChange={(e) => setNe({ ...ne, paid: e.target.checked })} /> Already paid</label>
            <button onClick={addExp} className="bg-primary px-4 py-2 text-xs tracking-widest text-primary-foreground">ADD EXPENSE</button>
          </section>
          <p className="text-sm">Total {inr(expTotal)} · Unpaid bills {inr(exps.filter((e) => !e.paid).reduce((s, e) => s + e.amount, 0))}</p>
          <table className="w-full bg-background text-sm">
            <thead><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="p-2">Date</th><th>Category</th><th>Vendor</th><th>Bill</th><th>Description</th><th className="text-right">Amount</th><th className="text-right">GST</th><th>Status</th><th /></tr></thead>
            <tbody>{exps.map((e) => <tr key={e.id} className="border-b border-border"><td className="p-2">{e.date}</td><td>{e.category}</td><td>{e.vendor}</td><td>{e.bill_no}</td><td>{e.description}</td><td className="text-right">{inr(e.amount)}</td><td className="text-right">{inr(e.gst)}</td><td><button onClick={() => togglePaid(e)} className={e.paid ? "text-primary" : "text-destructive"}>{e.paid ? "Paid" : "Unpaid"}</button></td><td><button onClick={() => delExp(e.id)} className="text-xs text-muted-foreground print:hidden">Delete</button></td></tr>)}
              {!exps.length && <tr><td colSpan={9} className="p-4 text-muted-foreground">No expenses in this period.</td></tr>}</tbody>
          </table>
          <button onClick={() => download(`expenses_${from}_${to}.csv`, [["Date", "Category", "Vendor", "Bill no", "Description", "Amount", "GST", "Paid"], ...exps.map((e) => [e.date, e.category, e.vendor, e.bill_no, e.description, e.amount, e.gst, e.paid ? "yes" : "no"])])} className="bg-primary px-4 py-2 text-xs tracking-widest text-primary-foreground print:hidden">EXPORT EXPENSES CSV</button>
        </>}
        {tab === "daily" && <DailyReport />}
        {tab === "reports" && <div className="grid gap-6 md:grid-cols-2">
          <section className="bg-background p-4"><h3 className="font-display text-xl text-primary">Profit & loss</h3><table className="mt-2 w-full text-sm"><tbody>
            <Row l="Room revenue (before GST)" v={k.revenue} /><Row l="Food orders (incl. GST)" v={food} /><Row l="Other extras" v={otherExtras} /><Row l="Discounts" v={discounts} /><Row l="Total income" v={income} b />
            {byCat.map(([c, v]) => <Row key={c} l={`Expense: ${c}`} v={-v} />)}<Row l="Total expenses" v={-expTotal} b /><Row l="Net profit" v={profit} b />
          </tbody></table></section>
          <section className="bg-background p-4"><h3 className="font-display text-xl text-primary">GST summary</h3><table className="mt-2 w-full text-sm"><tbody>
            <Row l="Room GST collected (18%)" v={roomGst} /><Row l="— CGST 9%" v={Math.round(roomGst / 2)} /><Row l="— SGST 9%" v={roomGst - Math.round(roomGst / 2)} />
            <Row l="Food GST collected (5%)" v={Math.round(food - food / 1.05)} /><Row l="GST paid on bills (input credit)" v={-expGst} />
            <Row l="Estimated net GST payable" v={roomGst + Math.round(food - food / 1.05) - expGst} b />
          </tbody></table><p className="mt-2 text-xs text-muted-foreground">Estimate only — please confirm with your accountant before filing.</p></section>
          <button onClick={() => download(`pnl_${from}_${to}.csv`, [["Item", "Amount"], ["Room revenue", k.revenue], ["Food", food], ["Other extras", otherExtras], ["Discounts", discounts], ["Total income", income], ...byCat.map(([c, v]) => [`Expense: ${c}`, -v]), ["Total expenses", -expTotal], ["Net profit", profit], ["Room GST", roomGst], ["Input GST", expGst], ["Occupancy %", k.occupancy], ["ADR", k.adr], ["RevPAR", k.revpar]])} className="bg-primary px-4 py-2 text-xs tracking-widest text-primary-foreground print:hidden md:col-span-2 md:justify-self-start">EXPORT REPORT CSV</button>
        </div>}
      </main>
    </div>
  );
}
