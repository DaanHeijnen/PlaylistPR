"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationItems } from "./navigation";

export function BottomNavigation({ pendingCount = 0 }: { pendingCount?: number }) {
  const pathname = usePathname();
  return <nav className="bottom-nav" aria-label="Primary navigation">
    <div className="bottom-nav__inner">
      {navigationItems.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const badge = item.href === "/requests" && pendingCount > 0;
        return <Link key={item.href} href={item.href} className={`nav-item ${active ? "active" : ""}`}>
          <span className="material-symbols-outlined nav-icon">{item.icon}</span>
          <span>{item.label}</span>
          {badge ? <span className="badge-count">{pendingCount}</span> : null}
        </Link>;
      })}
    </div>
  </nav>;
}
