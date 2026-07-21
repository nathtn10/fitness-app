/**
 * Shared API primitives for the (Supabase-backed) backend contract.
 *
 * These types are the client/server boundary: the app implements a
 * `FitnessApiClient` against them, and the same shapes describe the Postgres
 * rows and Edge Function payloads. They are pure TypeScript with no runtime
 * dependencies so they can be shared with server code verbatim.
 *
 * See BACKEND.md for the full design these contracts belong to.
 */

/** Who can see a shareable record. Enforced server-side by RLS, not the client. */
export type Visibility = 'private' | 'followers' | 'public';

export const VISIBILITY_VALUES: readonly Visibility[] = [
  'private',
  'followers',
  'public',
];

/**
 * Fields the server owns on every synced row. Client-generated `id` (a UUID)
 * makes writes idempotent; `updatedAt` drives last-write-wins sync; `deletedAt`
 * implements soft deletes so tombstones propagate to other devices.
 */
export interface SyncMeta {
  /** Client-generated UUID v4. Stable across devices. */
  id: string;
  /** Owning user (auth.users.id). */
  userId: string;
  /** ISO-8601. Server-authoritative. */
  createdAt: string;
  /** ISO-8601. Bumped on every write; the sync cursor compares against this. */
  updatedAt: string;
  /** ISO-8601 tombstone; present means the row is deleted. */
  deletedAt?: string;
}

/** A row that can be shared into the social graph. */
export interface Shareable {
  visibility: Visibility;
}

/** Standard cursor pagination for feeds and lists. */
export interface Page<T> {
  items: T[];
  /** Opaque cursor to pass as `cursor` for the next page; null at the end. */
  nextCursor: string | null;
}

export interface PageQuery {
  limit?: number;
  cursor?: string | null;
}

/** Uniform error shape returned by Edge Functions. */
export interface ApiError {
  code: string;
  message: string;
  /** Optional field-level validation details. */
  fields?: Record<string, string>;
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };
