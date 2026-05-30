/**
 * AppBackground — flat theme background for signed-in app pages.
 * Dark mode uses pure #000; light mode follows --background.
 */
export function AppBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 bg-background dark:bg-black"
    />
  );
}
