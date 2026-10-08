import logoAsset from "@/assets/soujanya-logo.webp.asset.json";
const logo = logoAsset.url;
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useMyRoles, useStaffDirectory } from "@/lib/staff";

export const Route = createFileRoute("/housekeeping")({
  head: () => ({
    meta: [
      { title: "Housekeeping — Soujanya Stays" },
      { name: "description", content: "Room status board and housekeeping tasks." },
      { property: "og:title", content: "Housekeeping — Soujanya Stays" },
      { property: "og:description", content: "Room status board and housekeeping tasks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Housekeeping,
});

type Room = { id: string; number: string; hk_status: string; note: string; room_types: { name: string } | null };
type Task = { id: string; room_id: string; kind: string; assigned_to: string | null; status: string; notes: string; created_at: string; completed_at: string | null; rooms: { number: string } | null };

const STATUS: Record<string, { label: string; cls: string }> = {
  dirty: { label: "Dirty", cls: "border-destructive text-destructive" },
  cleaning: { label: "Cleaning", cls: "border-gold text-gold" },
  clean: { label: "Clean", cls: "border-primary text-primary" },
  inspected: { label: "Inspected", cls: "bg-primary text-primary-foreground border-primary" },
  out_of_order: { label: "Out of order", cls: "bg-muted text-muted-foreground border-border" },
};
const KINDS = ["turnaround", "daily_clean", "inspection", "maintenance", "deep_clean"];

function Housekeeping() {
  const { user, loading } = useAuth();
  const roles = useMyRoles(user?.id);
  const ok = !!roles?.some((r) => ["admin", "front_desk", "housekeeping"].includes(r));
  const manager = !!roles?.some((r) => r === "admin" || r === "front_desk");
  const staff = useStaffDirectory(ok);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [mine, setMine] = useState(false);
  const [nt, setNt] = useState({ room_id: "", kind: "daily_clean", assigned_to: "", notes: "" });

  async function load() {
    const since = new Date(Date.now() - 2 * 864e5).toISOString();
    const [r, t] = await Promise.all([
      supabase.from("rooms").select("id,number,hk_status,note,room_types(name)").order("number"),
      supabase.from("hk_tasks").select("id,room_id,kind,assigned_to,status,notes,created_at,completed_at,rooms(number)").or(`status.neq.done,completed_at.gte.${since}`).order("created_at", { ascending: false }),
    ]);
    setRooms((r.data as Room[]) ?? []); setTasks((t.data as Task[]) ?? []);
  }
  useEffect(() => { if (!ok) return undefined; load(); const i = setInterval(load, 15000); return () => clearInterval(i); }, [ok]);

  async function setStatus(room: Room, hk_status: string) {
    await supabase.from("rooms").update({ hk_status, updated_at: new Date().toISOString() }).eq("id", room.id); load();
  }
  async function taskStep(t: Task) {
    const now = new Date().toISOString();
    if (t.status === "todo") {
      await supabase.from("hk_tasks").update({ status: "in_progress", started_at: now, assigned_to: t.assigned_to ?? user!.id }).eq("id", t.id);
      if (t.kind !== "inspection") await supabase.from("rooms").update({ hk_status: "cleaning", updated_at: now }).eq("id", t.room_id);
    } else {
      await supabase.from("hk_tasks").update({ status: "done", completed_at: now, completed_by: user!.id }).eq("id", t.id);
      await supabase.from("rooms").update({ hk_status: t.kind === "inspection" ? "inspected" : t.kind === "maintenance" ? "clean" : "clean", updated_at: now }).eq("id", t.room_id);
    }
    load();
  }
  async function assign(t: Task, uid: string) { await supabase.from("hk_tasks").update({ assigned_to: uid || null }).eq("id", t.id); load(); }
  async function create() {
    if (!nt.room_id) return;
    await supabase.from("hk_tasks").insert({ room_id: nt.room_id, kind: nt.kind, assigned_to: nt.assigned_to || null, notes: nt.notes.slice(0, 300) });
    setNt({ ...nt, notes: "" }); load();
  }
  const who = (id: string | null) => staff.find((s) => s.user_id === id)?.email.split("@")[0] ?? "Unassigned";
  const shown = tasks.filter((t) => !mine || t.assigned_to === user?.id);
  const counts = Object.fromEntries(Object.keys(STATUS).map((k) => [k, rooms.filter((r) => r.hk_status === k).length]));

  if (loading) return null;
  return (
    <div className="min-h-screen bg-secondary px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <Link to="/" className="font-display text-2xl tracking-[0.3em] text-primary">SOUJANYA STAYS</Link>
          <div className="flex gap-6 text-xs tracking-widest text-muted-foreground"><Link to="/team">TEAM</Link>{manager && <Link to="/admin">FRONT DESK</Link>}</div>
        </div>
        <h1 className="mt-6 font-display text-5xl text-primary">Housekeeping</h1>
        {!user ? <p className="mt-6">Please <Link to="/auth" className="text-gold underline">sign in</Link>.</p>
          : roles === null ? <p className="mt-6 text-muted-foreground">Checking access…</p>
          : !ok ? <p className="mt-6">This screen is for housekeeping staff. Ask the owner for Housekeeping access.</p>
          : (
            <>
              <div className="mt-4 flex flex-wrap gap-3 text-xs tracking-widest">
                {Object.entries(STATUS).map(([k, v]) => <span key={k} className={`border px-3 py-1 uppercase ${v.cls}`}>{v.label}: {counts[k]}</span>)}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {rooms.map((r) => (
                  <div key={r.id} className="bg-background p-3">
                    <p className="font-display text-2xl text-primary">{r.number}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.room_types?.name}</p>
                    <select value={r.hk_status} onChange={(e) => setStatus(r, e.target.value)} className={`mt-2 w-full border px-1 py-1 text-xs uppercase ${STATUS[r.hk_status]?.cls}`}>
                      {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-3xl text-primary">Tasks</h2>
                <label className="text-xs"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> Only my tasks</label>
              </div>
              {manager && (
                <div className="mt-3 flex flex-wrap gap-2 bg-background p-3">
                  <select value={nt.room_id} onChange={(e) => setNt({ ...nt, room_id: e.target.value })} className="border border-border bg-transparent px-2 py-1 text-sm"><option value="">Room…</option>{rooms.map((r) => <option key={r.id} value={r.id}>{r.number}</option>)}</select>
                  <select value={nt.kind} onChange={(e) => setNt({ ...nt, kind: e.target.value })} className="border border-border bg-transparent px-2 py-1 text-sm">{KINDS.map((k) => <option key={k} value={k}>{k.replace("_", " ")}</option>)}</select>
                  <select value={nt.assigned_to} onChange={(e) => setNt({ ...nt, assigned_to: e.target.value })} className="border border-border bg-transparent px-2 py-1 text-sm"><option value="">Unassigned</option>{staff.map((s) => <option key={s.user_id} value={s.user_id}>{s.email}</option>)}</select>
                  <input value={nt.notes} onChange={(e) => setNt({ ...nt, notes: e.target.value })} placeholder="Notes" className="flex-1 border border-border bg-transparent px-2 py-1 text-sm" />
                  <button onClick={create} className="bg-gold px-4 py-1 text-xs tracking-widest text-primary">ADD TASK</button>
                </div>
              )}
              <ul className="mt-3 grid gap-2">
                {shown.length === 0 && <li className="text-sm text-muted-foreground">No tasks.</li>}
                {shown.map((t) => (
                  <li key={t.id} className={`flex flex-wrap items-center gap-3 bg-background p-3 text-sm ${t.status === "done" ? "opacity-60" : ""}`}>
                    <b className="font-display text-xl text-primary">{t.rooms?.number}</b>
                    <span className="text-xs uppercase tracking-widest">{t.kind.replace("_", " ")}</span>
                    <span className="flex-1 text-muted-foreground">{t.notes}</span>
                    {manager && t.status !== "done" ? (
                      <select value={t.assigned_to ?? ""} onChange={(e) => assign(t, e.target.value)} className="border border-border bg-transparent px-2 py-1 text-xs"><option value="">Unassigned</option>{staff.map((s) => <option key={s.user_id} value={s.user_id}>{s.email}</option>)}</select>
                    ) : <span className="text-xs">{who(t.assigned_to)}</span>}
                    {t.status === "done" ? <span className="text-xs uppercase">Done {t.completed_at && new Date(t.completed_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                      : <button onClick={() => taskStep(t)} className="bg-primary px-3 py-1.5 text-xs tracking-widest text-primary-foreground">{t.status === "todo" ? "START" : "MARK DONE"}</button>}
                  </li>
                ))}
              </ul>
            </>
          )}
      </div>
    </div>
  );
}
