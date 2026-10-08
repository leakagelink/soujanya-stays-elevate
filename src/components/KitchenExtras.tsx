import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/rooms";

const btn = "border border-border px-3 py-1.5 text-xs tracking-widest uppercase";
const field = "border border-border bg-transparent px-2 py-1 text-sm";
type M = { id: string; name: string; category: string; price: number; available: boolean };
type Tbl = { id: string; number: string; seats: number; area: string; status: string };
type TO = { id: string; table_id: string; items: { name: string; qty: number; price: number }[]; total: number; status: string; paid: boolean; created_at: string };

/** Food cost of one plate from its recipe. */
export function plateCost(lines: { qty: number; cost_per_unit: number }[]) {
  return Math.round(lines.reduce((s, l) => s + l.qty * l.cost_per_unit, 0));
}

export function Tables({ menu }: { menu: M[] }) {
  const [tables, setTables] = useState<Tbl[]>([]);
  const [orders, setOrders] = useState<TO[]>([]);
  const [sel, setSel] = useState<Tbl | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState("");
  const [newT, setNewT] = useState({ number: "", seats: 4, area: "Restaurant" });
  async function load() {
    const [t, o] = await Promise.all([
      supabase.from("restaurant_tables").select("*").order("number"),
      supabase.from("table_orders").select("id,table_id,items,total,status,paid,created_at").eq("paid", false).neq("status", "cancelled").order("created_at"),
    ]);
    setTables(t.data ?? []); setOrders((o.data as TO[]) ?? []);
  }
  useEffect(() => { load(); }, []);
  const sub = menu.reduce((s, m) => s + (cart[m.id] ?? 0) * m.price, 0);
  async function place() {
    if (!sel) return;
    const items = Object.entries(cart).map(([id, qty]) => ({ id, qty }));
    const { error } = await supabase.rpc("place_table_order", { _table_id: sel.id, _items: items, _notes: notes });
    if (error) return setMsg(error.message);
    setCart({}); setNotes(""); setMsg("Sent to kitchen."); load();
  }
  async function pay(tableId: string, method: string) {
    await supabase.from("table_orders").update({ paid: true, payment_method: method }).eq("table_id", tableId).eq("paid", false).neq("status", "cancelled");
    await supabase.from("restaurant_tables").update({ status: "free" }).eq("id", tableId);
    setSel(null); load();
  }
  async function setStatus(t: Tbl, status: string) { await supabase.from("restaurant_tables").update({ status }).eq("id", t.id); load(); }
  async function addTable() {
    if (!newT.number.trim()) return;
    const { error } = await supabase.from("restaurant_tables").insert({ ...newT, number: newT.number.trim() });
    if (error) alert(error.message); setNewT({ ...newT, number: "" }); load();
  }
  const open = sel ? orders.filter((o) => o.table_id === sel.id) : [];
  const bill = open.reduce((s, o) => s + o.total, 0);
  return (
    <div className="mt-4 grid gap-6 md:grid-cols-[1fr_340px]">
      <div>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
          {tables.map((t) => (
            <button key={t.id} onClick={() => { setSel(t); setMsg(""); }} className={`p-3 text-left ${sel?.id === t.id ? "ring-2 ring-gold" : ""} ${t.status === "occupied" ? "bg-primary text-primary-foreground" : t.status === "reserved" ? "bg-gold text-primary" : "bg-background"}`}>
              <p className="font-display text-2xl">{t.number}</p><p className="text-xs">{t.seats} seats · {t.status}</p>
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <input value={newT.number} onChange={(e) => setNewT({ ...newT, number: e.target.value })} placeholder="New table no." className={`w-28 ${field}`} />
          <input type="number" min={1} value={newT.seats} onChange={(e) => setNewT({ ...newT, seats: +e.target.value })} className={`w-16 ${field}`} />
          <input value={newT.area} onChange={(e) => setNewT({ ...newT, area: e.target.value })} className={`w-32 ${field}`} />
          <button onClick={addTable} className={btn}>Add table</button>
        </div>
        {sel && (
          <ul className="mt-4 grid gap-1 md:grid-cols-2">
            {menu.filter((m) => m.available).map((m) => (
              <li key={m.id} className="flex items-center justify-between bg-background p-2 text-sm">
                <span>{m.name} · {inr(m.price)}</span>
                <span className="flex items-center gap-2">
                  {cart[m.id] ? <><button onClick={() => setCart({ ...cart, [m.id]: cart[m.id]! - 1 })} className="border border-border px-2">−</button><span>{cart[m.id]}</span></> : null}
                  <button onClick={() => setCart({ ...cart, [m.id]: (cart[m.id] ?? 0) + 1 })} className="border border-border px-2">+</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {sel && (
        <div className="bg-background p-4 md:sticky md:top-6 md:self-start">
          <p className="font-display text-3xl text-primary">Table {sel.number}</p>
          <div className="mt-1 flex gap-2">{["free", "reserved", "occupied"].map((s) => <button key={s} onClick={() => setStatus(sel, s)} className={`${btn} ${sel.status === s ? "bg-secondary" : ""}`}>{s}</button>)}</div>
          <p className="mt-3 text-xs tracking-widest text-muted-foreground">NEW ITEMS</p>
          {sub === 0 ? <p className="text-sm text-muted-foreground">Tap + on the menu.</p> : <p className="text-sm">{inr(sub)} + GST 5% = <b>{inr(sub + Math.round(sub * 0.05))}</b></p>}
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes for kitchen" className={`mt-2 w-full ${field}`} />
          <button disabled={!sub} onClick={place} className={`mt-2 w-full ${btn} bg-gold text-primary disabled:opacity-40`}>Send to kitchen</button>
          {msg && <p className="mt-1 text-xs text-gold">{msg}</p>}
          <p className="mt-4 text-xs tracking-widest text-muted-foreground">RUNNING BILL</p>
          <ul className="text-sm">{open.map((o) => <li key={o.id} className="border-t border-border py-1"><span className="text-xs uppercase">{o.status}</span> · {o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")} <span className="float-right">{inr(o.total)}</span></li>)}</ul>
          <p className="mt-2 flex justify-between font-semibold"><span>Total</span><span className="text-gold">{inr(bill)}</span></p>
          {bill > 0 && <div className="mt-2 flex gap-2">{["cash", "upi", "card"].map((m) => <button key={m} onClick={() => confirm(`Mark ${inr(bill)} paid by ${m} and free the table?`) && pay(sel.id, m)} className={btn}>Paid {m}</button>)}</div>}
        </div>
      )}
    </div>
  );
}

type Ing = { id: string; name: string; unit: string; stock: number; min_stock: number; cost_per_unit: number; supplier_id: string | null };
type Sup = { id: string; name: string; phone: string; gstin: string; category: string; notes: string };

export function Stock() {
  const [ings, setIngs] = useState<Ing[]>([]);
  const [sups, setSups] = useState<Sup[]>([]);
  const [moves, setMoves] = useState<{ id: string; kind: string; qty: number; cost: number; note: string; created_at: string; ingredients: { name: string; unit: string } | null }[]>([]);
  const [n, setN] = useState({ name: "", unit: "kg", min_stock: 0, cost_per_unit: 0 });
  const [mv, setMv] = useState({ ingredient_id: "", kind: "purchase", qty: "", cost: "", supplier_id: "", note: "" });
  async function load() {
    const [i, s, m] = await Promise.all([
      supabase.from("ingredients").select("*").order("name"),
      supabase.from("suppliers").select("*").eq("active", true).order("name"),
      supabase.from("stock_moves").select("id,kind,qty,cost,note,created_at,ingredients(name,unit)").order("created_at", { ascending: false }).limit(30),
    ]);
    setIngs(i.data ?? []); setSups(s.data ?? []); setMoves((m.data as typeof moves) ?? []);
  }
  useEffect(() => { load(); }, []);
  async function addIng() {
    if (!n.name.trim()) return;
    const { error } = await supabase.from("ingredients").insert({ ...n, name: n.name.trim() });
    if (error) alert(error.message); setN({ ...n, name: "" }); load();
  }
  async function addMove() {
    const q = parseFloat(mv.qty);
    if (!mv.ingredient_id || isNaN(q) || q === 0) return;
    const { error } = await supabase.from("stock_moves").insert({ ingredient_id: mv.ingredient_id, kind: mv.kind, qty: q, cost: parseInt(mv.cost, 10) || 0, supplier_id: mv.supplier_id || null, note: mv.note.trim() });
    if (error) alert(error.message); setMv({ ...mv, qty: "", cost: "", note: "" }); load();
  }
  const low = ings.filter((i) => Number(i.stock) <= Number(i.min_stock));
  const value = ings.reduce((s, i) => s + Number(i.stock) * Number(i.cost_per_unit), 0);
  return (
    <div className="mt-4">
      {low.length > 0 && <p className="bg-destructive/10 p-3 text-sm text-destructive">Low stock: {low.map((i) => `${i.name} (${i.stock} ${i.unit})`).join(", ")}</p>}
      <p className="mt-2 text-sm text-muted-foreground">Stock value: <b className="text-gold">{inr(Math.round(value))}</b></p>
      <div className="mt-3 flex flex-wrap items-end gap-2 bg-background p-3 text-xs">
        <label>Item<select value={mv.ingredient_id} onChange={(e) => setMv({ ...mv, ingredient_id: e.target.value })} className={`block ${field}`}><option value="">Choose…</option>{ings.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></label>
        <label>Type<select value={mv.kind} onChange={(e) => setMv({ ...mv, kind: e.target.value })} className={`block ${field}`}><option value="purchase">Purchase (in)</option><option value="use">Used</option><option value="waste">Waste</option><option value="adjust">Count correction (+/−)</option></select></label>
        <label>Qty<input value={mv.qty} onChange={(e) => setMv({ ...mv, qty: e.target.value })} className={`block w-20 ${field}`} /></label>
        {mv.kind === "purchase" && <><label>Bill ₹<input value={mv.cost} onChange={(e) => setMv({ ...mv, cost: e.target.value })} className={`block w-24 ${field}`} /></label>
          <label>Supplier<select value={mv.supplier_id} onChange={(e) => setMv({ ...mv, supplier_id: e.target.value })} className={`block ${field}`}><option value="">—</option>{sups.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label></>}
        <label>Note<input value={mv.note} onChange={(e) => setMv({ ...mv, note: e.target.value })} className={`block ${field}`} /></label>
        <button onClick={addMove} className={`${btn} bg-gold text-primary`}>Record</button>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full bg-background text-sm">
          <thead><tr className="text-left text-xs tracking-widest text-muted-foreground"><th className="p-2">Item</th><th className="p-2">In stock</th><th className="p-2">Minimum</th><th className="p-2">Cost / unit</th></tr></thead>
          <tbody>{ings.map((i) => <tr key={i.id} className={`border-t border-border ${Number(i.stock) <= Number(i.min_stock) ? "text-destructive" : ""}`}><td className="p-2">{i.name}</td><td className="p-2">{Number(i.stock)} {i.unit}</td><td className="p-2">{Number(i.min_stock)}</td><td className="p-2">{inr(Number(i.cost_per_unit))}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <input value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} placeholder="New item (e.g. Rice)" className={field} />
        <select value={n.unit} onChange={(e) => setN({ ...n, unit: e.target.value })} className={field}>{["kg", "g", "litre", "ml", "piece", "dozen", "packet"].map((u) => <option key={u}>{u}</option>)}</select>
        <input type="number" value={n.min_stock} onChange={(e) => setN({ ...n, min_stock: +e.target.value })} placeholder="Min" className={`w-20 ${field}`} title="Alert below this" />
        <input type="number" value={n.cost_per_unit} onChange={(e) => setN({ ...n, cost_per_unit: +e.target.value })} className={`w-24 ${field}`} title="Cost per unit ₹" />
        <button onClick={addIng} className={btn}>Add item</button>
      </div>
      <p className="mt-6 text-xs tracking-widest text-muted-foreground">RECENT MOVEMENTS</p>
      <ul className="text-xs">{moves.map((m) => <li key={m.id} className="py-0.5">{new Date(m.created_at).toLocaleString("en-IN")} · <b className="uppercase">{m.kind}</b> {Number(m.qty)} {m.ingredients?.unit} {m.ingredients?.name} {m.cost ? `· ${inr(m.cost)}` : ""} {m.note && `· ${m.note}`}</li>)}</ul>
    </div>
  );
}

export function Recipes({ menu }: { menu: M[] }) {
  const [ings, setIngs] = useState<Ing[]>([]);
  const [lines, setLines] = useState<{ id: string; menu_item_id: string; ingredient_id: string; qty: number }[]>([]);
  const [sel, setSel] = useState("");
  const [add, setAdd] = useState({ ingredient_id: "", qty: "" });
  async function load() {
    const [i, r] = await Promise.all([supabase.from("ingredients").select("*").order("name"), supabase.from("recipe_items").select("*")]);
    setIngs(i.data ?? []); setLines(r.data ?? []);
  }
  useEffect(() => { load(); }, []);
  const byId = useMemo(() => Object.fromEntries(ings.map((i) => [i.id, i])), [ings]);
  const costOf = (mid: string) => plateCost(lines.filter((l) => l.menu_item_id === mid).map((l) => ({ qty: Number(l.qty), cost_per_unit: Number(byId[l.ingredient_id]?.cost_per_unit ?? 0) })));
  async function addLine() {
    const q = parseFloat(add.qty);
    if (!sel || !add.ingredient_id || !(q > 0)) return;
    const { error } = await supabase.from("recipe_items").upsert({ menu_item_id: sel, ingredient_id: add.ingredient_id, qty: q }, { onConflict: "menu_item_id,ingredient_id" });
    if (error) alert(error.message); setAdd({ ingredient_id: "", qty: "" }); load();
  }
  async function del(id: string) { await supabase.from("recipe_items").delete().eq("id", id); load(); }
  return (
    <div className="mt-4 grid gap-6 md:grid-cols-[1fr_360px]">
      <div className="overflow-x-auto">
        <table className="w-full bg-background text-sm">
          <thead><tr className="text-left text-xs tracking-widest text-muted-foreground"><th className="p-2">Dish</th><th className="p-2">Price</th><th className="p-2">Food cost</th><th className="p-2">Cost %</th><th className="p-2">Margin</th></tr></thead>
          <tbody>{menu.map((m) => { const c = costOf(m.id); const pct = m.price ? Math.round((c / m.price) * 100) : 0; return (
            <tr key={m.id} onClick={() => setSel(m.id)} className={`cursor-pointer border-t border-border ${sel === m.id ? "bg-secondary" : ""}`}>
              <td className="p-2">{m.name}</td><td className="p-2">{inr(m.price)}</td><td className="p-2">{c ? inr(c) : "—"}</td>
              <td className={`p-2 ${pct > 35 ? "text-destructive" : ""}`}>{c ? `${pct}%` : "—"}</td><td className="p-2">{c ? inr(m.price - c) : "—"}</td></tr>); })}</tbody>
        </table>
      </div>
      <div className="bg-background p-4 md:sticky md:top-6 md:self-start">
        {!sel ? <p className="text-sm text-muted-foreground">Pick a dish to set its recipe (ingredients per plate). Stock is reduced automatically when the kitchen starts cooking.</p> : (
          <>
            <p className="font-display text-2xl text-primary">{menu.find((m) => m.id === sel)?.name}</p>
            <ul className="mt-2 text-sm">{lines.filter((l) => l.menu_item_id === sel).map((l) => { const i = byId[l.ingredient_id]; return (
              <li key={l.id} className="flex justify-between py-0.5"><span>{Number(l.qty)} {i?.unit} {i?.name} <button onClick={() => del(l.id)} className="ml-1 text-xs text-destructive">remove</button></span><span>{inr(Math.round(Number(l.qty) * Number(i?.cost_per_unit ?? 0)))}</span></li>); })}</ul>
            <div className="mt-3 flex gap-2">
              <select value={add.ingredient_id} onChange={(e) => setAdd({ ...add, ingredient_id: e.target.value })} className={`flex-1 ${field}`}><option value="">Ingredient…</option>{ings.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}</select>
              <input value={add.qty} onChange={(e) => setAdd({ ...add, qty: e.target.value })} placeholder="Qty" className={`w-20 ${field}`} />
              <button onClick={addLine} className={btn}>Add</button>
            </div>
            {ings.length === 0 && <p className="mt-2 text-xs text-muted-foreground">Add ingredients in the Stock tab first.</p>}
          </>
        )}
      </div>
    </div>
  );
}

export function Suppliers() {
  const [rows, setRows] = useState<Sup[]>([]);
  const [f, setF] = useState({ name: "", phone: "", gstin: "", category: "", notes: "" });
  const [spend, setSpend] = useState<Record<string, number>>({});
  async function load() {
    const [s, m] = await Promise.all([supabase.from("suppliers").select("*").eq("active", true).order("name"), supabase.from("stock_moves").select("supplier_id,cost").eq("kind", "purchase")]);
    setRows(s.data ?? []);
    const t: Record<string, number> = {}; (m.data ?? []).forEach((x) => { if (x.supplier_id) t[x.supplier_id] = (t[x.supplier_id] ?? 0) + x.cost; }); setSpend(t);
  }
  useEffect(() => { load(); }, []);
  async function save() {
    if (!f.name.trim()) return;
    const { error } = await supabase.from("suppliers").insert({ ...f, name: f.name.trim() });
    if (error) alert(error.message); setF({ name: "", phone: "", gstin: "", category: "", notes: "" }); load();
  }
  async function remove(id: string) { if (confirm("Remove supplier?")) { await supabase.from("suppliers").update({ active: false }).eq("id", id); load(); } }
  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2 bg-background p-3">
        {(["name", "phone", "gstin", "category", "notes"] as const).map((k) => <input key={k} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} placeholder={{ name: "Supplier name", phone: "Phone", gstin: "GSTIN", category: "Supplies (veg, dairy…)", notes: "Notes" }[k]} className={field} />)}
        <button onClick={save} className={`${btn} bg-gold text-primary`}>Add supplier</button>
      </div>
      <ul className="mt-3 grid gap-2">{rows.map((s) => (
        <li key={s.id} className="flex flex-wrap justify-between gap-2 bg-background p-3 text-sm">
          <span><b>{s.name}</b> · {s.category} · {s.phone} {s.gstin && `· GSTIN ${s.gstin}`} {s.notes && `· ${s.notes}`}</span>
          <span className="flex items-center gap-3"><span className="text-gold">Bought {inr(spend[s.id] ?? 0)}</span><button onClick={() => remove(s.id)} className="text-xs text-destructive">remove</button></span>
        </li>
      ))}</ul>
    </div>
  );
}
