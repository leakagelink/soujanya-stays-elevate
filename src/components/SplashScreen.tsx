import { useEffect, useState } from "react";
import logoAsset from "@/assets/soujanya-logo.webp.asset.json";

const logo = logoAsset.url;
const SESSION_KEY = "soujanya-splash-shown";

/**
 * Branded splash screen. Shows once per browser session on first load,
 * then never again during that session. Skipped entirely for users who
 * prefer reduced motion.
 */
export function SplashScreen() {
  const [phase, setPhase] = useState<"hidden" | "show" | "leaving">("hidden");

  useEffect(() => {
    let leaving: ReturnType<typeof setTimeout> | undefined;
    let gone: ReturnType<typeof setTimeout> | undefined;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (sessionStorage.getItem(SESSION_KEY) || reduce) return;
    sessionStorage.setItem(SESSION_KEY, "1");
    document.documentElement.classList.add("splash-lock");
    setPhase("show");
    leaving = setTimeout(() => setPhase("leaving"), 2350);
    gone = setTimeout(() => {
      document.documentElement.classList.remove("splash-lock");
      setPhase("hidden");
    }, 3000);
    return () => {
      clearTimeout(leaving);
      clearTimeout(gone);
      document.documentElement.classList.remove("splash-lock");
    };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div
      aria-hidden="true"
      className={`brand-splash${phase === "leaving" ? " brand-splash-leaving" : ""}`}
    >
      <div className="brand-splash-inner">
        <div className="brand-splash-emblem">
          <span className="brand-splash-ring" />
          <span className="brand-splash-ring brand-splash-ring-slow" />
          <img src={logo} alt="" width={112} height={112} className="brand-splash-logo" />
        </div>
        <p className="brand-splash-title font-display">
          <span className="brand-splash-word">SOUJANYA</span>
          <span className="brand-splash-word brand-splash-word-accent">STAYS</span>
        </p>
        <p className="brand-splash-tagline">STAY THE WAY YOU LIKE</p>
        <div className="brand-splash-line"><span /></div>
      </div>
    </div>
  );
}
