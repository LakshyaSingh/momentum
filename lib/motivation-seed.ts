/**
 * Seed for the motivational quote overlay. The store resolves it into a
 * concrete quote while avoiding recent repeats, so any large range works.
 *
 * Shared so that both `createApplication` and `applyQueuedJob` produce the
 * celebration the same way — applying from the queue is a real application and
 * should feel identical to logging one directly.
 */
export function pickMotivationSeed() {
  return {
    quoteId: Math.floor(Math.random() * 1000),
  };
}
