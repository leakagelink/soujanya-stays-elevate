import logoAsset from "@/assets/soujanya-logo.webp.asset.json";
const logo = logoAsset.url;
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { hoursWorked, useMyRoles, useStaffDirectory } from "@/lib/staff";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "Team — Soujanya Stays" },
      { name: "description", content: "Staff attendance, shifts, leave and performance." },
      { property: "og:title", content: "Team — Soujanya Stays" },
      { property: "og:description", content: "Staff attendance, shifts, leave and performance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Team,
});

type Att = { id: string; user_id: string; clock_in: string; clock_out: string | null };
type Shift = { id: string; user_id: string; date: string; start_time: string; end_time: string; note: string };
type Leave = { id: string; user_id: string; from_date: string; to_date: string; reason: string; status: string };

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (d: string, n: number) => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const time = (s: string) => new Date(s).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

function Team() {
  const { user, loading } = useAuth();
  const roles = useMyRoles(user?.id);
  const isStaff = !!roles?.length;
  const isAdmin = !!roles?.includes("admin");
  const staff = useStaffDirectory(isStaff);
  const name = (id: string) => staff.find((s) => s.user_id === id)?.email ?? "—";
  const [att, setAtt] = useState<Att[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [perf, setPerf] = useState<Record<string, number>>({});
  const [lv, setLv] = useState({ from_date: today(), to_date: today(), reason: "" });
  const [sh, setSh] = useState({ user_id: "", date: today(), start_time: "09:00", end_time: "17:00", note: "" });
  const [msg, setMsg] = useState("");

  async function load() {
    const from = addDays(today(), -7);
    const [a, s, l] = await Promise.all([
      supabase.from("attendance").select("*").gte("clock_in", from).order("clock_in", { ascending: false }),
      supabase.from("shifts").select("*").gte("date", today()).lte("date", addDays(today(), 7)).order("date").order("start_time"),
      supabase.from("leave_requests").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setAtt(a.data ?? []); setShifts(s.data ?? []); setLeaves(l.data ?? []);
    if (isAdmin) {
      const { data } = await supabase.from("hk_tasks").select("completed_by").eq("status", "done").gte("completed_at", addDays(today(), -30));
      const m: Record<string, number> = {};
      (data ?? []).forEach((t) => { if (t.completed_by) m[t.completed_by] = (m[t.completed_by] ?? 0) + 1; });
      setPerf(m);
    }
  }
  useEffect(() => { if (isStaff) load(); }, [isStaff, isAdmin]);

  const open = att.find((a) => a.user_id === user?.id && !a.clock_out);
  async function clock() {
    setMsg("");
    const { error } = open
      ? await supabase.from("attendance").update({ clock_out: new Date().toISOString() }).eq("id", open.id)
      : await supabase.from("attendance").insert({ user_id: user!.id });
    if (error) setMsg(error.message); load();
  }
  async function applyLeave() {
    if (lv.to_date < lv.from_date) return setMsg("End date must be after start date.");
    const { error } = await supabase.from("leave_requests").insert({ ...lv, reason: lv.reason.slice(0, 300), user_id: user!.id });
    if (error) setMsg(error.message); else { setLv({ ...lv, reason: "" }); setMsg("Leave request sent."); load(); }
  }
  async function decide(l: Leave, status: string) { await supabase.from("leave_requests").update({ status }).eq("id", l.id); load(); }
  async function addShift() {
    if (!sh.user_id) return setMsg("Pick a staff member.");
    const { error } = await supabase.from("shifts").insert(sh);
    if (error) setMsg(error.message); else load();
  }
  async function delShift(id: string) { await supabase.from("shifts").delete().eq("id", id); load(); }

  const hours = useMemo(() => {
    const m: Record<string, number> = {};
    att.forEach((a) => { m[a.user_id] = (m[a.user_id] ?? 0) + hoursWorked(a.clock_in, a.clock_out); });
    return m;
  }, [att]);

  const box = "bg-background p-4";
  const inp = "border border-border bg-transparent px-2 py-1 text-sm";
  if (loading) return null;
  return (
    <div className="min-h-screen bg-secondary px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3"><img src={logo} alt="Soujanya Stays logo" className="h-10 w-10 rounded-full object-cover" /><span className="font-display text-2xl tracking-[0.3em] text-primary">SOUJANYA STAYS</span></Link>
          <div className="flex gap-6 text-xs tracking-widest text-muted-foreground"><Link to="/housekeeping">HOUSEKEEPING</Link><Link to="/kitchen">KITCHEN</Link><Link to="/admin">FRONT DESK</Link></div>
        </div>
        <h1 className="mt-6 font-display text-5xl text-primary">Team</h1>
        {!user ? <p className="mt-6">Please <Link to="/auth" className="text-gold underline">sign in</Link>.</p>
          : roles === null ? <p className="mt-6 text-muted-foreground">Checking access…</p>
          : !isStaff ? <p className="mt-6">This page is for Soujanya Stays staff.</p>
          : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className={box}>
                <p className="text-xs tracking-widest text-muted-foreground">MY ATTENDANCE</p>
                <p className="mt-2 text-sm">{open ? `Clocked in since ${time(open.clock_in)}` : "You are not clocked in."}</p>
                <button onClick={clock} className="mt-3 bg-gold px-5 py-2 text-xs tracking-widest text-primary">{open ? "CLOCK OUT" : "CLOCK IN"}</button>
                <p className="mt-3 text-xs text-muted-foreground">Last 7 days: {hours[user.id] ?? 0} hours</p>
              </div>
              <div className={box}>
                <p className="text-xs tracking-widest text-muted-foreground">APPLY FOR LEAVE</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <input type="date" className={inp} value={lv.from_date} onChange={(e) => setLv({ ...lv, from_date: e.target.value })} />
                  <input type="date" className={inp} value={lv.to_date} onChange={(e) => setLv({ ...lv, to_date: e.target.value })} />
                  <input className={`${inp} flex-1`} placeholder="Reason" value={lv.reason} onChange={(e) => setLv({ ...lv, reason: e.target.value })} />
                  <button onClick={applyLeave} className="border border-border px-3 text-xs tracking-widest">SEND</button>
                </div>
              </div>
              {msg && <p className="text-sm text-gold md:col-span-2">{msg}</p>}

              <div className={`${box} md:col-span-2`}>
                <p className="text-xs tracking-widest text-muted-foreground">SHIFTS · NEXT 7 DAYS</p>
                {isAdmin && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <select className={inp} value={sh.user_id} onChange={(e) => setSh({ ...sh, user_id: e.target.value })}><option value="">Staff…</option>{staff.map((s) => <option key={s.user_id} value={s.user_id}>{s.email}</option>)}</select>
                    <input type="date" className={inp} value={sh.date} onChange={(e) => setSh({ ...sh, date: e.target.value })} />
                    <input type="time" className={inp} value={sh.start_time} onChange={(e) => setSh({ ...sh, start_time: e.target.value })} />
                    <input type="time" className={inp} value={sh.end_time} onChange={(e) => setSh({ ...sh, end_time: e.target.value })} />
                    <input className={inp} placeholder="Note (e.g. Front desk)" value={sh.note} onChange={(e) => setSh({ ...sh, note: e.target.value })} />
                    <button onClick={addShift} className="bg-gold px-4 text-xs tracking-widest text-primary">ADD SHIFT</button>
                  </div>
                )}
                <ul className="mt-3 grid gap-1 text-sm">
                  {shifts.length === 0 && <li className="text-muted-foreground">No shifts scheduled.</li>}
                  {shifts.map((s) => <li key={s.id} className="flex gap-3 border-t border-border py-1"><span className="w-24">{s.date}</span><span className="w-28">{s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}</span><span className="flex-1">{name(s.user_id)} {s.note && `· ${s.note}`}</span>{isAdmin && <button onClick={() => delShift(s.id)} className="text-xs text-destructive">remove</button>}</li>)}
                </ul>
              </div>

              <div className={box}>
                <p className="text-xs tracking-widest text-muted-foreground">LEAVE REQUESTS</p>
                <ul className="mt-2 grid gap-1 text-sm">
                  {leaves.length === 0 && <li className="text-muted-foreground">None.</li>}
                  {leaves.map((l) => (
                    <li key={l.id} className="flex flex-wrap items-center gap-2 border-t border-border py-1">
                      <span className="flex-1">{isAdmin && `${name(l.user_id)} · `}{l.from_date} → {l.to_date} {l.reason && `· ${l.reason}`}</span>
                      {isAdmin && l.status === "pending" ? <>
                        <button onClick={() => decide(l, "approved")} className="border border-primary px-2 text-xs text-primary">APPROVE</button>
                        <button onClick={() => decide(l, "rejected")} className="border border-destructive px-2 text-xs text-destructive">REJECT</button>
                      </> : <span className="text-xs uppercase">{l.status}</span>}
                    </li>
                  ))}
                </ul>
              </div>

              {isAdmin && (
                <div className={box}>
                  <p className="text-xs tracking-widest text-muted-foreground">STAFF PERFORMANCE</p>
                  <table className="mt-2 w-full text-sm">
                    <thead><tr className="text-left text-xs text-muted-foreground"><th>Staff</th><th>Hours (7d)</th><th>Tasks done (30d)</th><th>Now</th></tr></thead>
                    <tbody>
                      {staff.map((s) => (
                        <tr key={s.user_id} className="border-t border-border">
                          <td className="py-1">{s.email}</td>
                          <td>{hours[s.user_id] ?? 0}</td>
                          <td>{perf[s.user_id] ?? 0}</td>
                          <td className="text-xs">{att.some((a) => a.user_id === s.user_id && !a.clock_out) ? "ON DUTY" : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-3 text-xs text-muted-foreground">Recent clock-ins</p>
                  <ul className="text-xs">{att.slice(0, 10).map((a) => <li key={a.id}>{name(a.user_id)} · {a.clock_in.slice(0, 10)} {time(a.clock_in)}–{a.clock_out ? time(a.clock_out) : "now"}</li>)}</ul>
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  );
}
