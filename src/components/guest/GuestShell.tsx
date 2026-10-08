import { Link } from "@tanstack/react-router";
import { Home, BedDouble, UtensilsCrossed, CalendarDays, UserRound, ArrowUpRight, Leaf } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { PanelHeader } from "@/components/PanelHeader";
import { t } from "@/lib/i18n";

export type GuestView = "home" | "rooms" | "dining" | "experiences" | "concierge" | "account";
const navigation = [
  { view: "home", label: "guest.home", icon: Home },
  { view: "rooms", label: "guest.rooms", icon: BedDouble },
  { view: "dining", label: "guest.food", icon: UtensilsCrossed },
  { view: "bookings", label: "guest.bookings", icon: CalendarDays },
  { view: "account", label: "guest.account", icon: UserRound },
] as const;

export function GuestShell({ children, active = "home" }: { children: ReactNode; active?: GuestView | "bookings" }) {
  return <div className="guest-app panel-page min-h-screen bg-background font-sans">
    <div className="guest-header border-b border-border bg-card">
      <div className="guest-container"><PanelHeader><Button asChild variant="ghost" className="text-primary"><Link to="/guest" search={{ view: "rooms" }}>{t("guest.rooms")} <ArrowUpRight /></Link></Button></PanelHeader></div>
    </div>
    <div className="guest-container guest-layout">
      <aside className="guest-sidebar"><p className="mb-6 flex items-center gap-2 text-xs text-gold"><Leaf size={16} /> STAY THE WAY YOU LIKE</p><nav aria-label="Guest navigation" className="grid gap-2">
        {navigation.map(({ view, label, icon: Icon }) => <Button asChild key={view} variant={active === view ? "default" : "ghost"} className="h-12 justify-start gap-3">{view === "bookings" ? <Link to="/my-bookings"><Icon />{t(label)}</Link> : <Link to="/guest" search={{ view }}><Icon />{t(label)}</Link>}</Button>)}
        <Button asChild variant={active === "experiences" ? "default" : "ghost"} className="h-12 justify-start"><Link to="/guest" search={{ view: "experiences" }}><Leaf />{t("guest.experiences")}</Link></Button>
        <Button asChild variant={active === "concierge" ? "default" : "ghost"} className="h-12 justify-start"><Link to="/guest" search={{ view: "concierge" }}>{t("guest.help")}</Link></Button>
      </nav><div className="mt-12 border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground">{t("guest.policy")}</div></aside>
      <main className="guest-main min-w-0">{children}</main>
    </div>
    <nav aria-label="Guest mobile navigation" className="guest-bottom-nav border-t border-border bg-card">
      {navigation.map(({ view, label, icon: Icon }) => <Button key={view} asChild variant="ghost" className={`guest-nav-item ${active === view ? "text-primary" : "text-muted-foreground"}`}>{view === "bookings" ? <Link to="/my-bookings"><Icon />{t(label)}</Link> : <Link to="/guest" search={{ view }}><Icon />{t(label)}</Link>}</Button>)}
    </nav>
  </div>;
}