/**
 * Offline-first sync engine (pure and unit-tested).
 *
 * The domain records (WorkoutSession, Activity, Meal, …) intentionally carry no
 * sync metadata. This engine owns that concern via a per-table **sidecar
 * index** (id → { updatedAt, deletedAt, hash, syncedAt }), detecting local
 * edits by content hash and resolving cross-device conflicts by last-write-wins
 * on `updatedAt`. Nothing here touches the network or storage — callers feed it
 * plain arrays and it returns the next arrays/index, so the whole merge is
 * deterministic and testable. See BACKEND.md § "Offline-first sync".
 */

export interface RecordMeta {
  /** ISO-8601. Bumped when the local content hash changes or a remote wins. */
  updatedAt: string;
  /** ISO-8601 tombstone; present means the record is deleted. */
  deletedAt?: string;
  /** Content hash of the record at `updatedAt` ('' for tombstones). */
  hash: string;
  /** updatedAt value last confirmed pushed/pulled; drives dirty detection. */
  syncedAt?: string;
}

/** Per-table sidecar: record id → sync metadata. */
export type SyncIndex = Record<string, RecordMeta>;

export interface HasId {
  id: string;
}

/** A remote change (already mapped from a server row to a domain record). */
export interface RemoteChange<T extends HasId> {
  id: string;
  updatedAt: string;
  deletedAt?: string;
  /** The record; omitted for tombstones. */
  record?: T;
}

// --- Content hashing ------------------------------------------------------

/** Deterministic JSON with sorted keys, so hashing is stable across runs. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

/** djb2 hash of a record's stable serialization. */
export function hashRecord(record: unknown): string {
  const str = stableStringify(record);
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

// --- Local reconciliation -------------------------------------------------

export interface ReconcileResult {
  index: SyncIndex;
  /** Ids whose local state hasn't been pushed yet (new, changed, or deleted). */
  dirtyIds: string[];
}

function isDirty(meta: RecordMeta): boolean {
  return meta.syncedAt === undefined || meta.updatedAt > meta.syncedAt;
}

/**
 * Detect local creates/edits/deletes by comparing current records against the
 * index. Assigns `updatedAt = now` to anything new or changed, and tombstones
 * ids that vanished from `records`.
 */
export function reconcileLocal<T extends HasId>(
  records: T[],
  index: SyncIndex,
  now: string,
): ReconcileResult {
  const next: SyncIndex = { ...index };
  const present = new Set<string>();

  for (const record of records) {
    present.add(record.id);
    const hash = hashRecord(record);
    const prev = next[record.id];
    if (!prev || prev.deletedAt || prev.hash !== hash) {
      next[record.id] = { updatedAt: now, hash, syncedAt: prev?.syncedAt };
    }
  }

  // Tombstone records that were tracked (not already deleted) but are now gone.
  for (const id of Object.keys(next)) {
    const meta = next[id];
    if (!meta.deletedAt && !present.has(id)) {
      next[id] = { updatedAt: now, hash: '', deletedAt: now, syncedAt: meta.syncedAt };
    }
  }

  const dirtyIds = Object.keys(next).filter((id) => isDirty(next[id]));
  return { index: next, dirtyIds };
}

/** Mark ids as pushed (syncedAt catches up to updatedAt). */
export function markPushed(index: SyncIndex, ids: string[]): SyncIndex {
  const next: SyncIndex = { ...index };
  for (const id of ids) {
    const meta = next[id];
    if (meta) next[id] = { ...meta, syncedAt: meta.updatedAt };
  }
  return next;
}

// --- Remote merge (last-write-wins) --------------------------------------

export interface MergeResult<T extends HasId> {
  records: T[];
  index: SyncIndex;
}

/**
 * Merge remote changes into the local record set. A remote change wins only if
 * strictly newer than the local `updatedAt` (ties keep local, preventing
 * ping-pong). Applied remote state is marked `syncedAt = updatedAt` so it isn't
 * re-pushed.
 */
export function mergeRemote<T extends HasId>(
  records: T[],
  index: SyncIndex,
  remote: RemoteChange<T>[],
): MergeResult<T> {
  const byId = new Map(records.map((r) => [r.id, r]));
  const nextIndex: SyncIndex = { ...index };

  for (const change of remote) {
    const local = nextIndex[change.id];
    if (local && change.updatedAt <= local.updatedAt) continue; // local is newer or equal

    if (change.deletedAt) {
      byId.delete(change.id);
      nextIndex[change.id] = {
        updatedAt: change.updatedAt,
        deletedAt: change.deletedAt,
        hash: '',
        syncedAt: change.updatedAt,
      };
    } else if (change.record) {
      byId.set(change.id, change.record);
      nextIndex[change.id] = {
        updatedAt: change.updatedAt,
        hash: hashRecord(change.record),
        syncedAt: change.updatedAt,
      };
    }
  }

  return { records: [...byId.values()], index: nextIndex };
}

/** Latest `updatedAt` seen in a set of remote changes (for the pull cursor). */
export function maxCursor(
  remote: { updatedAt: string }[],
  current: string | null,
): string | null {
  let max = current;
  for (const change of remote) {
    if (max === null || change.updatedAt > max) max = change.updatedAt;
  }
  return max;
}
