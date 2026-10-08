import { Button } from "@/components/ui/button";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import logoAsset from "@/assets/soujanya-logo.webp.asset.json";

const logo = logoAsset.url;

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Soujanya Stays" },
      { name: "description", content: "Sign in or create your Soujanya Stays guest account to book and manage stays." },
      { property: "og:title", content: "Sign in — Soujanya Stays" },
      { property: "og:description", content: "Your guest account for bookings at Soujanya Stays." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg("");
    if (mode === "up") {
      const { error } = await supabase.auth.signUp({ email, password: pw, options: { emailRedirectTo: window.location.origin } });
      setMsg(error ? error.message : "Check your email to confirm your account, then sign in.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) setMsg(error.message); else nav({ to: "/" , hash: "book" });
    }
    setBusy(false);
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) setMsg(String(r.error.message ?? r.error));
    else if (!r.redirected) nav({ to: "/", hash: "book" });
  }

  return (
    <div className="panel-page flex min-h-screen items-center justify-center bg-secondary px-4 py-6">
      <div className="w-full max-w-md bg-background p-6 md:p-10">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <img src={logo} alt="Soujanya Stays logo" className="h-12 w-12 shrink-0 rounded-full object-cover" />
          <span className="font-display text-xl sm:text-2xl text-primary">SOUJANYA STAYS</span>
        </Link>
        <h1 className="mt-6 font-display text-4xl text-primary">{mode === "in" ? "Welcome back" : "Create account"}</h1>
        <Button variant="panel" onClick={google} className="mt-8 w-full border border-primary py-3 text-sm tracking-widest text-primary hover:bg-primary hover:text-primary-foreground">CONTINUE WITH GOOGLE</Button>
        <div className="my-6 text-center text-xs tracking-widest text-muted-foreground">OR</div>
        <form onSubmit={submit} className="grid gap-4">
          <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="border border-input bg-card p-3" />
          <input required type="password" minLength={6} placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} className="border border-input bg-card p-3" />
          <Button variant="panel" disabled={busy} className="bg-primary py-4 text-sm tracking-widest text-primary-foreground disabled:opacity-60">{mode === "in" ? "SIGN IN" : "SIGN UP"}</Button>
        </form>
        {msg && <p className="mt-4 text-sm text-muted-foreground">{msg}</p>}
        <Button variant="panel" onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-6 text-sm text-gold underline">
          {mode === "in" ? "New guest? Create an account" : "Already have an account? Sign in"}
        </Button>
      </div>
    </div>
  );
}
