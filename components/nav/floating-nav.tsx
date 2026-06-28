"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, LayoutGroup } from "framer-motion";
import {
  BarChart3,
  Calendar,
  LayoutGrid,
  ListTodo,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { NavLink } from "@/components/nav/nav-link";
import { UserMenu } from "@/components/nav/user-menu";
import type { SessionUser } from "@/lib/auth";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { MomentumGlass } from "@/components/glass/liquid-glass";
import {
  DeclarativeGlassLens,
  primaryGlassSceneId,
  useDeclarativeSceneSupport,
} from "@/components/glass/declarative-glass-scene";

const links = [
  { href: "/dashboard", label: "Home", icon: LayoutGrid },
  { href: "/applications", label: "Applications", icon: ListTodo },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/import", label: "Import", icon: Upload },
];

export function FloatingNav({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const sceneId = primaryGlassSceneId(pathname);
  const useRouteScene = useDeclarativeSceneSupport(sceneId);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const useDesktopScene = useRouteScene && !isMobile;
  const useMobileScene = useRouteScene && isMobile;

  return (
    <>
      {/* Desktop top floating pill */}
      <header className="pointer-events-none fixed inset-x-0 top-4 z-40 hidden justify-center px-6 md:flex">
        <MomentumGlass
          variant="nav"
          data-glass-scene-mode={useDesktopScene ? "declarative" : "native"}
          className="native-liquid-glass pointer-events-auto glass-nav px-3 py-2"
        >
          {useDesktopScene && sceneId && (
            <DeclarativeGlassLens sceneId={sceneId} viewportInsetY={16} />
          )}
          <div className="relative z-10 flex items-center gap-2">
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
        </MomentumGlass>
      </header>

      {/* Mobile top bar — wordmark + user menu */}
      <header className="pointer-events-none fixed inset-x-0 top-3 z-40 flex items-center justify-between px-3 md:hidden">
        <MomentumGlass
          variant="nav"
          data-glass-scene-mode={useMobileScene ? "declarative" : "native"}
          className="native-liquid-glass pointer-events-auto relative rounded-full glass-nav px-4 py-2 text-xs font-semibold tracking-tight"
        >
          {useMobileScene && sceneId && (
            <DeclarativeGlassLens
              sceneId={sceneId}
              horizontal="left"
              viewportInsetX={12}
              viewportInsetY={12}
              mobile
            />
          )}
          <span className="relative z-10">Momentum</span>
        </MomentumGlass>
        <MomentumGlass
          variant="nav"
          data-glass-scene-mode={useMobileScene ? "declarative" : "native"}
          className="native-liquid-glass pointer-events-auto relative rounded-full glass-nav p-1.5"
        >
          {useMobileScene && sceneId && (
            <DeclarativeGlassLens
              sceneId={sceneId}
              horizontal="right"
              viewportInsetX={12}
              viewportInsetY={12}
              mobile
            />
          )}
          <div className="relative z-10 flex items-center gap-1">
            <ThemeToggle />
            <UserMenu user={user} />
          </div>
        </MomentumGlass>
      </header>

      {/* Mobile bottom pill — primary nav links */}
      <div className="pointer-events-none fixed inset-x-0 bottom-3 z-40 flex justify-center px-2 md:hidden">
        <MomentumGlass
          variant="nav"
          data-glass-scene-mode={useMobileScene ? "declarative" : "native"}
          className="native-liquid-glass pointer-events-auto relative glass-nav p-1.5"
          role="navigation"
          aria-label="Primary navigation"
        >
          {useMobileScene && sceneId && (
            <DeclarativeGlassLens
              sceneId={sceneId}
              vertical="bottom"
              viewportInsetY={12}
              mobile
            />
          )}
          <div className="relative z-10 flex items-center">
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
          </div>
        </MomentumGlass>
      </div>
    </>
  );
}
