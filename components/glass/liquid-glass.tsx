"use client";

import {
  Glass,
  type GlassOptics,
  type GlassProps,
} from "@samasante/liquid-glass";

type MomentumGlassVariant = "card" | "panel" | "menu" | "nav" | "sheet";

const BASE_OPTICS = {
  mapSize: 192,
  clipToShape: true,
  softEdge: true,
  saturate: 1.16,
  sheenDark: false,
  splay: 0.08,
  glowSpread: 0.9,
  glowFalloff: 0.8,
  sheenFalloff: 1.5,
  sheenAngle: 48,
} satisfies Partial<GlassOptics>;

const OPTICS: Record<MomentumGlassVariant, Partial<GlassOptics>> = {
  card: {
    ...BASE_OPTICS,
    depth: 0.62,
    curvature: 0.22,
    dispersion: 0.36,
    strength: 0.065,
    bend: 0.58,
    bendWidth: 0.15,
    frost: 5,
    brightness: 0,
    specular: 0,
    glow: 0,
    sheen: 0,
    sheenWidth: 2.5,
  },
  panel: {
    ...BASE_OPTICS,
    depth: 0.5,
    curvature: 0.14,
    dispersion: 0.28,
    strength: 0.04,
    bend: 0.48,
    bendWidth: 0.12,
    frost: 6,
    brightness: 0,
    specular: 0,
    glow: 0,
    sheen: 0,
    sheenWidth: 3,
  },
  menu: {
    ...BASE_OPTICS,
    mapSize: 256,
    softEdge: false,
    depth: 0,
    curvature: 0,
    dispersion: 0,
    strength: 0,
    splay: 0,
    bend: 0,
    bendWidth: 0.14,
    frost: 5,
    brightness: 0,
    specular: 0,
    glow: 0,
    sheen: 0,
    sheenWidth: 2.5,
  },
  nav: {
    ...BASE_OPTICS,
    mapSize: 256,
    depth: 0.78,
    curvature: 0.24,
    dispersion: 0.5,
    strength: 0.095,
    bend: 0.72,
    bendWidth: 0.14,
    frost: 4,
    brightness: 0,
    specular: 0,
    glow: 0,
    sheen: 0,
    sheenWidth: 2.5,
  },
  sheet: {
    ...BASE_OPTICS,
    depth: 0.5,
    curvature: 0.14,
    dispersion: 0.28,
    strength: 0.04,
    bend: 0.48,
    bendWidth: 0.12,
    frost: 6,
    brightness: 0,
    specular: 0,
    glow: 0,
    sheen: 0,
    sheenWidth: 3,
  },
};

interface MomentumGlassProps extends GlassProps {
  variant?: MomentumGlassVariant;
}

export function MomentumGlass({
  variant = "card",
  children,
  optics,
  style,
  ...props
}: MomentumGlassProps) {
  return (
    <Glass
      optics={{ ...OPTICS[variant], ...optics }}
      style={{ display: undefined, ...style }}
      {...props}
      data-glass-variant={variant}
    >
      {children}
    </Glass>
  );
}
