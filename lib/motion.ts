/**
 * Motion tokens.
 *
 * `EASE_OUT` is the curve this codebase already used, inlined in a dozen call
 * sites. It is named here rather than replaced with a different "correct"
 * ease-out: two nearly identical curves would be the defect, not the fix.
 *
 * Durations are tiered by how often a surface is seen. The more frequently
 * something appears, the shorter its motion — a chart the user meets on every
 * dashboard load has a far smaller budget than one they open a few times a
 * week. Nothing here reaches the 300ms ceiling for interface motion.
 */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Seen many times a day. Near-imperceptible or nothing. */
export const DURATION_AMBIENT = 0.2;

/** Occasional surfaces: analytics charts, list changes, panels. */
export const DURATION_STANDARD = 0.3;
