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

/*
 * Variants that sit directly on the flat app background (`AppBackground` paints
 * a solid fill; nothing renders between it and these surfaces). Displacing a
 * uniform backdrop is an identity operation — every sample returns the same
 * colour — so the package's SVG lens is pure cost there: an 11-primitive
 * backdrop-filter graph with three feDisplacementMap passes, re-evaluated at
 * device-pixel resolution every frame the surface is invalidated.
 *
 * That matters because backdrop-filter cost scales with the DEVICE pixel count.
 * On a 1080p external panel (DPR 1, ~2.1 Mpx) the full stack fits the frame
 * budget; on an internal Retina panel (DPR 2, ~6-8 Mpx) at 120 Hz it needs
 * roughly 3.5-4.5x the fill rate in 83% of the time, and the UI visibly drops
 * frames — worst of all while the application sheet slides in over it.
 *
 * On a dashboard-density page cards + panels are ~97% of the total filtered
 * area, so skipping the lens here removes nearly all of the displacement work.
 * Surfaces that DO float over live content — nav, sheet, menus — keep the real
 * lens, because there the refraction is visible.
 *
 * The rest of the package's output is already inert under Momentum's optics:
 * the brightness layer is not rendered at `brightness: 0`, and the specular
 * edge layer resolves to fully transparent shadows at `specular: 0`. So the
 * lens's only visible contribution on these variants is its blur + saturate,
 * which we reproduce exactly below. See tasks/lessons.md.
 *
 * `sheet` is the deliberate exception, and the reasoning is worth recording
 * because it looks like it belongs in this set.
 *
 * On cost, it plainly does. A sheet never floats over live content — Radix
 * paints a full-viewport overlay (`bg-background/40 backdrop-blur-md`) between
 * the page and the sheet — so its lens displaces an already-blurred, dimmed
 * field, which is close to an identity operation. Meanwhile it is the largest
 * filtered rectangle in the app: 512 x 1064 CSS px, or 2.2 Mpx of device pixels
 * on a DPR-2 laptop panel against 0.54 Mpx on a DPR-1 external display. On a
 * short viewport its content also scrolls, re-invalidating that rectangle as it
 * moves. iOS WebKit compounds it further by processing SVG displacement in
 * software (tasks/lessons.md).
 *
 * It keeps the lens anyway, because the rim refraction on the sheet is wanted
 * and the cost argument above is arithmetic, not measurement — the jank it
 * predicts has never actually been profiled on a DPR-2 panel. Do not flatten
 * this variant on the strength of the reasoning alone. If sheet scrolling is
 * measured to drop frames, adding "sheet" to this set is the one-word fix, and
 * the only visual loss is the rim: with brightness/specular/glow/sheen already
 * at 0, blur + saturate below reproduce everything else exactly.
 *
 * The package offers no middle setting. `filterResolution` is a supersample
 * (higher = more expensive, never less) and `maxDpr` is declared in its types
 * but unimplemented — the identifier does not appear in its shipped JS.
 */
const FLAT_BACKDROP_VARIANTS = new Set<MomentumGlassVariant>(["card", "panel"]);

/** The package-only props, stripped before spreading onto a plain div. */
const LENS_ONLY_PROPS = [
  "refract",
  "behind",
  "src",
  "draw",
  "width",
  "height",
  "size",
  "radius",
  "center",
  "live",
  "filterResolution",
  "lenses",
  "videoRef",
] as const;

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
  const merged = { ...OPTICS[variant], ...optics };

  // A caller that explicitly asks for displacement (or hands us something to
  // refract) always gets the real lens, whatever the variant.
  const wantsLens =
    Boolean(props.refract ?? props.src ?? props.draw) ||
    (optics?.strength ?? 0) > 0 ||
    (optics?.dispersion ?? 0) > 0;

  if (FLAT_BACKDROP_VARIANTS.has(variant) && !wantsLens) {
    const divProps = { ...props } as Record<string, unknown>;
    for (const key of LENS_ONLY_PROPS) delete divProps[key];

    const frost = Math.max(0, merged.frost ?? 0);
    const saturate = merged.saturate ?? 1;
    const backdrop =
      [frost > 0 ? `blur(${frost}px)` : "", saturate !== 1 ? `saturate(${saturate})` : ""]
        .filter(Boolean)
        .join(" ") || "none";

    return (
      <div
        {...(divProps as React.HTMLAttributes<HTMLDivElement>)}
        data-glass-variant={variant}
        style={{
          ...style,
          backdropFilter: backdrop,
          WebkitBackdropFilter: backdrop,
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <Glass
      optics={merged}
      style={{ display: undefined, ...style }}
      {...props}
      data-glass-variant={variant}
    >
      {children}
    </Glass>
  );
}
