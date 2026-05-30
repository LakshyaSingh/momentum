/**
 * AmbientBackground — slow-floating colour blooms for the marketing landing page.
 * Uses blue + violet + rose only (no teal/green hues) so scrolling never picks
 * up a green cast at the bottom of the page.
 */
export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="animate-float-slow absolute -left-[15%] top-[-20%] h-[55vmax] w-[55vmax] rounded-full opacity-70 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, hsl(var(--bloom-1) / 0.55), transparent 70%)",
        }}
      />
      <div
        className="animate-float-slow-reverse absolute right-[-15%] top-[10%] h-[60vmax] w-[60vmax] rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, hsl(var(--bloom-2) / 0.45), transparent 70%)",
        }}
      />
      <div
        className="animate-float-slow absolute bottom-[5%] right-[10%] h-[45vmax] w-[45vmax] rounded-full opacity-45 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, hsl(var(--bloom-3) / 0.3), transparent 70%)",
          animationDelay: "-7s",
        }}
      />
      {/* Fade the lower viewport to background so the footer stays clean */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent via-55% to-background" />
    </div>
  );
}
