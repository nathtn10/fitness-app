/**
 * Minimal app-event bus.
 *
 * Used so the sync layer can tell the domain stores "storage changed, reload"
 * without the two knowing about each other. The sync provider emits
 * `syncApplied` after a pull writes to the repositories; each store subscribes
 * and re-reads itself, so pulled data appears in the UI immediately.
 */
type Handler = () => void;

const syncAppliedHandlers = new Set<Handler>();

/** Subscribe to "sync applied changes to storage". Returns an unsubscribe fn. */
export function onSyncApplied(handler: Handler): () => void {
  syncAppliedHandlers.add(handler);
  return () => {
    syncAppliedHandlers.delete(handler);
  };
}

export function emitSyncApplied(): void {
  for (const handler of [...syncAppliedHandlers]) {
    try {
      handler();
    } catch {
      // a misbehaving listener must not break the others
    }
  }
}
