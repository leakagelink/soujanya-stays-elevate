import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import logoAsset from "@/assets/soujanya-logo.webp.asset.json";

/** Shared, shrink-safe branding and panel navigation. */
export function PanelHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="panel-header grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap sm:justify-between">
      <Link to="/" className="flex min-w-0 items-center gap-3">
        <img src={logoAsset.url} alt="Soujanya Stays logo" className="h-10 w-10 shrink-0 rounded-full object-cover" />
        <span className="min-w-0 font-display text-xl text-primary sm:text-2xl">SOUJANYA <span className="block sm:inline">STAYS</span></span>
      </Link>
      {children && <nav className="panel-links flex min-w-0 flex-wrap items-center justify-end gap-x-4 gap-y-1 text-xs text-muted-foreground">{children}</nav>}
    </header>
  );
}