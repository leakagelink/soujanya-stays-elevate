import { useEffect, useRef, useState } from "react";
import { recordConsents } from "@/components/OpsExtras";
import { supabase } from "@/integrations/supabase/client";

type B = {
  id: string; guest_name: string; phone: string; guests: number; room_number: string;
  email?: string; address?: string; nationality?: string; id_type?: string; id_number?: string;
  guest_photo_path?: string | null; id_front_path?: string | null; id_back_path?: string | null;
};

const ID_TYPES = ["Aadhaar", "Passport", "Driving licence", "Voter ID", "PAN card", "Other govt ID"];

function PhotoField({ label, facing, file, existing, onChange }: {
  label: string; facing: "user" | "environment"; file: Blob | null; existing?: string | null | undefined; onChange: (b: Blob) => void;
}) {
  const [cam, setCam] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (file) { const u = URL.createObjectURL(file); setPreview(u); return () => URL.revokeObjectURL(u); }
    if (existing) supabase.rpc("log_doc_access", { _booking_id: existing.split("/")[0]!, _path: existing }).then(() => supabase.storage.from("guest-docs").createSignedUrl(existing, 600)).then(({ data }) => setPreview(data?.signedUrl ?? null));
    return undefined;
  }, [file, existing]);

  async function open() {
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing } });
      setCam(true);
      setTimeout(() => { if (video.current) { video.current.srcObject = stream.current; video.current.play(); } }, 50);
    } catch { alert("Camera not available. Please use Upload instead."); }
  }
  function stop() { stream.current?.getTracks().forEach((t) => t.stop()); setCam(false); }
  useEffect(() => stop, []);
  function snap() {
    const v = video.current; if (!v) return;
    const c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    c.toBlob((b) => { if (b) onChange(b); stop(); }, "image/jpeg", 0.85);
  }

  return (
    <div className="border border-border p-3">
      <p className="text-xs tracking-widest text-muted-foreground uppercase">{label}</p>
      <div className="mt-2 flex aspect-[4/3] items-center justify-center overflow-hidden bg-secondary">
        {cam ? <video ref={video} playsInline muted className="h-full w-full object-cover" />
          : preview ? <img src={preview} alt={label} className="h-full w-full object-contain" />
          : <span className="text-xs text-muted-foreground">No photo</span>}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {cam ? (
          <>
            <button type="button" onClick={snap} className="bg-primary px-3 py-1.5 text-xs tracking-widest text-primary-foreground">CAPTURE</button>
            <button type="button" onClick={stop} className="border border-border px-3 py-1.5 text-xs tracking-widest">CANCEL</button>
          </>
        ) : (
          <>
            <button type="button" onClick={open} className="border border-border px-3 py-1.5 text-xs tracking-widest">TAKE PHOTO</button>
            <label className="cursor-pointer border border-border px-3 py-1.5 text-xs tracking-widest">
              UPLOAD
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onChange(e.target.files[0])} />
            </label>
          </>
        )}
      </div>
    </div>
  );
}

export function CheckInForm({ booking, onDone, onClose }: { booking: B; onDone: () => void; onClose: () => void }) {
  const [f, setF] = useState({
    guest_name: booking.guest_name, phone: booking.phone, email: booking.email ?? "", address: booking.address ?? "",
    nationality: booking.nationality || "Indian", id_type: booking.id_type || "Aadhaar", id_number: booking.id_number ?? "",
    adults: booking.guests, children: 0, coming_from: "", going_to: "", purpose: "Leisure", vehicle_number: "", visa_number: "",
    room_number: booking.room_number, id_verification: (booking as { id_verification?: string }).id_verification ?? "pending",
  });
  const [declared, setDeclared] = useState(false);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [front, setFront] = useState<Blob | null>(null);
  const [back, setBack] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.type === "number" ? +e.target.value : e.target.value });
  const foreign = f.nationality.trim().toLowerCase() !== "indian";

  async function up(b: Blob | null, name: string) {
    if (!b) return undefined;
    const path = `${booking.id}/${name}-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from("guest-docs").upload(path, b, { contentType: b.type || "image/jpeg" });
    if (error) throw error;
    return path;
  }

  async function submit() {
    setErr("");
    if (!f.guest_name.trim() || !f.phone.trim() || !f.address.trim() || !f.id_number.trim() || !f.room_number.trim())
      return setErr("Name, phone, address, ID number and room number are required.");
    if (!photo && !booking.guest_photo_path) return setErr("Guest photo is required.");
    if (!front && !booking.id_front_path) return setErr("ID card front photo is required.");
    if (!declared) return setErr("Guest must confirm the declaration.");
    if (foreign && !f.visa_number.trim()) return setErr("Visa number is required for foreign guests.");
    setBusy(true);
    try {
      const [p, fr, bk] = await Promise.all([up(photo, "guest"), up(front, "id-front"), up(back, "id-back")]);
      const { error } = await supabase.from("bookings").update({
        ...f, guests: f.adults + f.children,
        ...(p && { guest_photo_path: p }), ...(fr && { id_front_path: fr }), ...(bk && { id_back_path: bk }),
        status: "checked_in", checked_in_at: new Date().toISOString(),
      }).eq("id", booking.id);
      if (error) throw error;
      const { data: own } = await supabase.from("bookings").select("user_id").eq("id", booking.id).single();
      if (own) await recordConsents(own.user_id, booking.id, ["guest_declaration", "resort_rules"]);
      onDone();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  }

  const inp = "w-full border border-border bg-transparent px-2 py-1.5 text-sm";
  const L = ({ t, children }: { t: string; children: React.ReactNode }) => <label className="text-xs text-muted-foreground">{t}{children}</label>;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-primary/60 p-4">
      <div className="mx-auto max-w-4xl bg-background p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-3xl text-primary">Guest check-in</h2>
          <button onClick={onClose} className="text-xs tracking-widest text-muted-foreground">CLOSE</button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <PhotoField label="Guest photo *" facing="user" file={photo} existing={booking.guest_photo_path} onChange={setPhoto} />
          <PhotoField label="ID card front *" facing="environment" file={front} existing={booking.id_front_path} onChange={setFront} />
          <PhotoField label="ID card back" facing="environment" file={back} existing={booking.id_back_path} onChange={setBack} />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <L t="Full name *"><input className={inp} value={f.guest_name} onChange={set("guest_name")} /></L>
          <L t="Phone *"><input className={inp} value={f.phone} onChange={set("phone")} /></L>
          <L t="Email"><input className={inp} value={f.email} onChange={set("email")} /></L>
          <L t="Address *"><input className={inp} value={f.address} onChange={set("address")} /></L>
          <L t="Nationality"><input className={inp} value={f.nationality} onChange={set("nationality")} /></L>
          <L t="ID type *"><select className={inp} value={f.id_type} onChange={set("id_type")}>{ID_TYPES.map((t) => <option key={t}>{t}</option>)}</select></L>
          <L t="ID number *"><input className={inp} value={f.id_number} onChange={set("id_number")} /></L>
          {foreign && <L t="Visa number * (Form C)"><input className={inp} value={f.visa_number} onChange={set("visa_number")} /></L>}
          <L t="Adults"><input type="number" min={1} className={inp} value={f.adults} onChange={set("adults")} /></L>
          <L t="Children"><input type="number" min={0} className={inp} value={f.children} onChange={set("children")} /></L>
          <L t="Coming from"><input className={inp} value={f.coming_from} onChange={set("coming_from")} /></L>
          <L t="Going to"><input className={inp} value={f.going_to} onChange={set("going_to")} /></L>
          <L t="Purpose of visit"><select className={inp} value={f.purpose} onChange={set("purpose")}>{["Leisure", "Business", "Wedding / event", "Other"].map((t) => <option key={t}>{t}</option>)}</select></L>
          <L t="Vehicle number"><input className={inp} value={f.vehicle_number} onChange={set("vehicle_number")} /></L>
          <L t="Room number *"><input className={inp} value={f.room_number} onChange={set("room_number")} /></L>
          <L t="ID verification"><select className={inp} value={f.id_verification} onChange={set("id_verification")}><option value="pending">Pending</option><option value="verified">Verified (matches guest)</option><option value="rejected">Rejected</option></select></L>
        </div>
        <label className="mt-4 flex items-start gap-2 text-sm"><input type="checkbox" checked={declared} onChange={(e) => setDeclared(e.target.checked)} className="mt-1" />
          <span>Guest declares the details above are true, and accepts the resort rules and that ID copies are kept as required by law.</span></label>
        {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
        <button disabled={busy} onClick={submit} className="mt-5 bg-gold px-6 py-2.5 text-xs tracking-widest text-primary disabled:opacity-50">
          {busy ? "SAVING…" : "COMPLETE CHECK-IN"}
        </button>
      </div>
    </div>
  );
}
