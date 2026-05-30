"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, LayoutGroup } from "framer-motion";
import {
  BarChart3,
  Calendar,
  LayoutGrid,
  ListTodo,
  Settings,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { NavLink } from "@/components/nav/nav-link";
import { UserMenu } from "@/components/nav/user-menu";
import type { SessionUser } from "@/lib/auth";

const links = [
  { href: "/dashboard", label: "Home", icon: LayoutGrid },
  { href: "/applications", label: "Applications", icon: ListTodo },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/import", label: "Import", icon: Upload },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function FloatingNav({ user }: { user: SessionUser }) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop top floating pill */}
      <header className="pointer-events-none fixed inset-x-0 top-4 z-40 hidden justify-center px-6 md:flex">
        <div className="pointer-events-auto flex items-center gap-2 glass-nav px-3 py-2">
          <Link href="/dashboard" className="px-3 text-sm font-semibold tracking-tight">
            Momentum
          </Link>
          <span className="h-5 w-px bg-border/70" />
          <LayoutGroup id="floating-nav">
            <nav className="flex items-center gap-1 px-1">
              {links.map((link) => {
                const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                return (
                  <NavLink
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-[color,transform,opacity] duration-150 hover:text-foreground active:scale-[0.97] active:opacity-80",
                      active && "text-foreground",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="active-pill"
                        className="absolute inset-0 -z-0 rounded-full bg-foreground/8 dark:bg-white/[0.08] ring-1 ring-foreground/[0.06] dark:ring-white/[0.08]"
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      />
                    )}
                    <link.icon className="relative size-3.5" />
                    <span className="relative">{link.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </LayoutGroup>
          <span className="h-5 w-px bg-border/70" />
          <ThemeToggle />
          <UserMenu user={user} />
        </div>
      </header>

      {/* Mobile top bar — wordmark + user menu */}
      <header className="pointer-events-none fixed inset-x-0 top-3 z-40 flex items-center justify-between px-3 md:hidden">
        <div className="pointer-events-auto rounded-full glass-nav px-4 py-2 text-xs font-semibold tracking-tight">
          Momentum
        </div>
        <div className="pointer-events-auto flex items-center gap-1 rounded-full glass-nav p-1.5">
          <ThemeToggle />
          <UserMenu user={user} />
        </div>
      </header>

      {/* Mobile bottom pill — all 6 nav links */}
      <div className="pointer-events-none fixed inset-x-0 bottom-3 z-40 flex justify-center px-2 md:hidden">
        <nav className="pointer-events-auto flex items-center glass-nav p-1.5">
          <LayoutGroup id="floating-nav-mobile">
            {links.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <NavLink
                  key={link.href}
                  href={link.href}
                  aria-label={link.label}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative inline-flex size-11 touch-manipulation items-center justify-center rounded-full text-muted-foreground transition-[color,transform,opacity] duration-150 active:scale-90 active:opacity-70",
                    active && "text-foreground",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="active-pill-mobile"
                      className="absolute inset-0 rounded-full bg-foreground/10 dark:bg-white/[0.08]"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <link.icon className="relative size-5" />
                </NavLink>
              );
            })}
          </LayoutGroup>
        </nav>
      </div>
    </>
  );
}
