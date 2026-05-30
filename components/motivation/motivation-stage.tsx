"use client";

import dynamic from "next/dynamic";

const JobsOverlay = dynamic(() => import("./jobs-overlay").then((m) => m.JobsOverlay), {
  ssr: false,
});
const StreakCelebration = dynamic(
  () => import("./streak-celebration").then((m) => m.StreakCelebration),
  { ssr: false },
);

/**
 * Mounted once at the top of the protected layout. Subscribes to the motivation
 * store and renders the cinematic overlay + streak celebration as a portal.
 */
export function MotivationStage() {
  return (
    <>
      <JobsOverlay />
      <StreakCelebration />
    </>
  );
}
