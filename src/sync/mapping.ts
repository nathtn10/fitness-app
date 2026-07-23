/**
 * Mapping between domain records and server row DTOs.
 *
 * Server rows are "the domain record + ownership + sync metadata" (see
 * src/api/rows.ts), so mapping is mostly adding/removing a known set of
 * envelope fields. Snake_case ↔ camelCase column naming is handled separately
 * in the Supabase adapter; this layer is pure and testable.
 */
import type { SyncMeta, Visibility } from '../api/common';
import type { HasId, RecordMeta, RemoteChange } from './engine';

/** Envelope fields the server adds that are NOT part of a domain record. */
const ENVELOPE_KEYS = [
  'userId',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'visibility',
] as const;

/** Strip server envelope fields, yielding the bare domain record. */
export function stripEnvelope<T extends HasId>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if ((ENVELOPE_KEYS as readonly string[]).includes(key)) continue;
    out[key] = value;
  }
  return out as unknown as T;
}

/** Turn a fetched server row into a RemoteChange for the merge engine. */
export function toRemoteChange<T extends HasId>(
  row: { id: string; updatedAt: string; deletedAt?: string } & Record<string, unknown>,
): RemoteChange<T> {
  if (row.deletedAt) {
    return { id: row.id, updatedAt: row.updatedAt, deletedAt: row.deletedAt };
  }
  return {
    id: row.id,
    updatedAt: row.updatedAt,
    record: stripEnvelope<T>(row),
  };
}

/** Build a server row for pushing: domain record + envelope from the index meta. */
export function toRow<T extends HasId>(
  record: T,
  meta: RecordMeta,
  userId: string,
  visibility?: Visibility,
): T & SyncMeta & { visibility?: Visibility } {
  return {
    ...record,
    userId,
    updatedAt: meta.updatedAt,
    createdAt: meta.updatedAt,
    ...(meta.deletedAt ? { deletedAt: meta.deletedAt } : {}),
    ...(visibility ? { visibility } : {}),
  } as T & SyncMeta & { visibility?: Visibility };
}
