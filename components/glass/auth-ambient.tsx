/**
 * AuthAmbient — subtle violet + cyan blooms behind auth pages so the glass
 * has colored content to lens through. Sits over the pure-black auth shell;
 * deliberately avoids the teal/green hue band (180°) that previously caused
 * a green tint while scrolling.
 */
export function AuthAmbient() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div
        className="animate-float-slow absolute -left-[20%] -top-[25%] h-[55vmax] w-[55vmax] rounded-full opacity-55 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, hsl(275 85% 65% / 0.35), transparent 70%)",
        }}
      />
      <div
        className="animate-float-slow-reverse absolute -right-[20%] -top-[15%] h-[55vmax] w-[55vmax] rounded-full opacity-55 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, hsl(215 95% 65% / 0.32), transparent 70%)",
          animationDelay: "-4s",
        }}
      />
      {/* Vertical fade so blooms only colour the top of the page; the rest
          stays pure #000 to preserve the deep auth shell feel. */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black" />
    </div>
  );
}
