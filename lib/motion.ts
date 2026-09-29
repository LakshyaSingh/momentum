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
 * week. Interface motion stays under the 300ms ceiling; the one exception is
 * DURATION_REVEAL, the dashboard's count-up on first render.
 */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Seen many times a day. Near-imperceptible or nothing. */
export const DURATION_AMBIENT = 0.2;

/** Occasional surfaces: analytics charts, list changes, panels. */
export const DURATION_STANDARD = 0.3;

/**
 * A number or ring moving from one value to the next (5 → 6), as opposed to
 * counting up from zero on first render. The first render earns the long count
 * (DURATION_REVEAL); a change the user just caused must read as immediate.
 */
export const DURATION_REVEAL = 1.1;
export const DURATION_UPDATE = DURATION_STANDARD;
