import logoAsset from "@/assets/soujanya-logo.webp.asset.json";
const logo = logoAsset.url;
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { inr } from "@/lib/rooms";
import { Tables, Stock, Recipes, Suppliers } from "@/components/KitchenExtras";

export const Route = createFileRoute("/kitchen")({
  head: () => ({
    meta: [
      { title: "Kitchen display — Soujanya Stays" },
      { name: "description", content: "Live food orders for the Soujanya Stays kitchen." },
      { property: "og:title", content: "Kitchen display — Soujanya Stays" },
      { property: "og:description", content: "Live kitchen order board." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Kitchen,
});

type O = { id: string; src?: "room" | "table"; label?: string; room_number: string; status: string; total: number; notes: string; created_at: string; order_items: { name: string; qty: number }[] };
type M = { id: string; name: string; category: string; price: number; available: boolean };
const COLS = ["new", "preparing", "ready"] as const;
const NEXT: Record<string, string> = { new: "preparing", preparing: "ready", ready: "served" };

function Kitchen() {
  const { user, loading } = useAuth();
  const [ok, setOk] = useState<boolean | null>(null);
  const [orders, setOrders] = useState<O[]>([]);
  const [menu, setMenu] = useState<M[]>([]);
  const [tab, setTab] = useState<"orders" | "tables" | "menu" | "stock" | "recipes" | "suppliers">("orders");
  async function load() {
    const since = new Date(Date.now() - 864e5).toISOString();
    const { data } = await supabase.from("orders").select("id,room_number,status,total,notes,created_at,order_items(name,qty)").gte("created_at", since).order("created_at");
    const { data: t } = await supabase.from("table_orders").select("id,status,total,notes,created_at,items,restaurant_tables(number)").gte("created_at", since).order("created_at");
    const tbl = (t ?? []).map((x) => ({ id: x.id, src: "table" as const, label: "Table " + ((x.restaurant_tables as { number: string } | null)?.number ?? ""), room_number: "", status: x.status, total: x.total, notes: x.notes, created_at: x.created_at, order_items: x.items as { name: string; qty: number }[] }));
    setOrders([...(data ?? []).map((o) => ({ ...o, src: "room" as const, label: "Room " + (o.room_number || "—") })), ...tbl].sort((a, b) => a.created_at.localeCompare(b.created_at)));
  }
  async function loadMenu() { const { data } = await supabase.from("menu_items").select("id,name,category,price,available").order("sort_order"); setMenu(data ?? []); }
  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data }) => setOk(!!data?.some((r) => ["admin", "front_desk", "kitchen"].includes(r.role))));
  }, [user]);
  useEffect(() => {
    if (!ok) return;
    load(); loadMenu();
    const t = setInterval(load, 10000);
    const ch = supabase.channel("kitchen-orders").on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load()).on("postgres_changes", { event: "*", schema: "public", table: "table_orders" }, () => load()).subscribe();
    return () => { clearInterval(t); supabase.removeChannel(ch); };
  }, [ok]);
  async function move(o: O, status: string) { await supabase.from(o.src === "table" ? "table_orders" : "orders").update({ status }).eq("id", o.id); load(); }
  async function toggle(m: M) { await supabase.from("menu_items").update({ available: !m.available }).eq("id", m.id); loadMenu(); }
  if (loading) return null;
  return (
    <div className="min-h-screen bg-secondary px-4 py-8 md:px-8">
      <div className="flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3"><img src={logo} alt="Soujanya Stays logo" className="h-10 w-10 rounded-full object-cover" /><span className="font-display text-2xl tracking-[0.3em] text-primary">SOUJANYA STAYS</span></Link>
        <Link to="/admin" className="text-xs tracking-widest text-muted-foreground">FRONT DESK</Link>
      </div>
      <h1 className="mt-6 font-display text-5xl text-primary">Kitchen</h1>
      {!user ? <p className="mt-6">Please <Link to="/auth" className="text-gold underline">sign in</Link> with a kitchen account.</p>
        : ok === null ? <p className="mt-6 text-muted-foreground">Checking access…</p>
        : !ok ? <p className="mt-6">This screen is for kitchen staff. Ask the owner to give you Kitchen access.</p>
        : (
          <>
            <div className="mt-4 flex flex-wrap gap-2 border-b border-border">
              {(["orders", "tables", "menu", "stock", "recipes", "suppliers"] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-xs tracking-widest uppercase ${tab === t ? "border-b-2 border-gold text-primary" : "text-muted-foreground"}`}>{{ orders: "Live orders", tables: "Restaurant tables", menu: "Menu availability", stock: "Stock", recipes: "Recipes & food cost", suppliers: "Suppliers" }[t]}</button>)}
            </div>
            {tab === "orders" ? (
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {COLS.map((c) => (
                  <div key={c}>
                    <p className="text-xs tracking-widest uppercase text-muted-foreground">{c} ({orders.filter((o) => o.status === c).length})</p>
                    <div className="mt-2 grid gap-2">
                      {orders.filter((o) => o.status === c).map((o) => (
                        <div key={o.id} className={`bg-background p-4 ${c === "new" ? "border-l-4 border-gold" : ""}`}>
                          <div className="flex justify-between"><p className="font-display text-2xl text-primary">{o.label}</p><span className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span></div>
                          <ul className="mt-1 text-sm">{o.order_items.map((i, k) => <li key={k}><b>{i.qty}×</b> {i.name}</li>)}</ul>
                          {o.notes && <p className="mt-1 text-xs text-destructive">Note: {o.notes}</p>}
                          <div className="mt-3 flex gap-2">
                            <button onClick={() => move(o, NEXT[c]!)} className="bg-primary px-3 py-1.5 text-xs tracking-widest text-primary-foreground uppercase">Mark {NEXT[c]}</button>
                            {c === "new" && <button onClick={() => confirm("Cancel order?") && move(o, "cancelled")} className="border border-destructive px-3 py-1.5 text-xs text-destructive">CANCEL</button>}
                            <span className="ml-auto text-xs text-muted-foreground">{inr(o.total)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : tab === "tables" ? <Tables menu={menu} /> : tab === "stock" ? <Stock /> : tab === "recipes" ? <Recipes menu={menu} /> : tab === "suppliers" ? <Suppliers /> : (
              <ul className="mt-4 grid gap-2 md:grid-cols-2">
                {menu.map((m) => (
                  <li key={m.id} className="flex items-center justify-between bg-background p-3 text-sm">
                    <span>{m.name} <span className="text-xs text-muted-foreground">· {m.category} · {inr(m.price)}</span></span>
                    <button onClick={() => toggle(m)} className={`border px-3 py-1 text-xs ${m.available ? "border-primary text-primary" : "border-destructive text-destructive"}`}>{m.available ? "AVAILABLE" : "SOLD OUT"}</button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
    </div>
  );
}
