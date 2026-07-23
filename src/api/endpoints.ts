/**
 * Edge Function request/response contracts.
 *
 * Simple CRUD goes through Supabase/PostgREST directly (guarded by RLS). These
 * endpoints cover the operations that need server-side logic: offline sync,
 * feed assembly, the hosted AI coach, anonymized gym busyness, and account
 * data lifecycle.
 */
import type { PageQuery } from './common';
import type {
  ActivityRow,
  DailyActivityRow,
  GymRow,
  GymVisitRow,
  MealRow,
  ProgressPhotoRow,
  WorkoutSessionRow,
} from './rows';
import type { FeedComment, FeedItem } from './social';

// --- Sync ----------------------------------------------------------------

/**
 * All syncable tables keyed by name. Each value is the row type. Deletes are
 * represented as rows carrying `deletedAt` (tombstones), not omissions.
 */
export interface SyncTables {
  workoutSessions: WorkoutSessionRow;
  activities: ActivityRow;
  meals: MealRow;
  progressPhotos: ProgressPhotoRow;
  gyms: GymRow;
  gymVisits: GymVisitRow;
  dailyActivity: DailyActivityRow;
}

export type SyncTableName = keyof SyncTables;

/** A partial set of changed rows per table (used in both push and pull). */
export type ChangeSet = {
  [K in SyncTableName]?: SyncTables[K][];
};

/** Push locally-dirty rows. Server upserts by id; last-write-wins on updatedAt. */
export interface SyncPushRequest {
  changes: ChangeSet;
  /** Client device id, for telemetry and loop-prevention. */
  deviceId: string;
}

export interface SyncPushResponse {
  /** Rows the server rejected (e.g. an older updatedAt lost the merge). */
  conflicts: { table: SyncTableName; id: string; reason: string }[];
  /** New server watermark to store as the next pull cursor. */
  cursor: string;
}

/** Pull everything changed since the last cursor (ISO timestamp watermark). */
export interface SyncPullRequest {
  since: string | null;
  limit?: number;
}

export interface SyncPullResponse {
  changes: ChangeSet;
  cursor: string;
  /** True if more pages remain; call again with the returned cursor. */
  hasMore: boolean;
}

// --- Feed ----------------------------------------------------------------

export interface FeedQuery extends PageQuery {
  /** 'following' = people you follow; 'discover' = public highlights. */
  scope: 'following' | 'discover';
}

export interface FeedResponse {
  items: FeedItem[];
  nextCursor: string | null;
}

export interface CreatePostRequest {
  kind: FeedItem['post']['kind'];
  refId: string | null;
  caption?: string;
  visibility: FeedItem['post']['visibility'];
}

export interface AddCommentRequest {
  postId: string;
  body: string;
}

export interface ReactRequest {
  postId: string;
  emoji: string;
  /** true to add, false to remove. */
  on: boolean;
}

export type CommentsResponse = { comments: FeedComment[]; nextCursor: string | null };

// --- AI coach (hosted, cross-domain) -------------------------------------

export type CoachScope =
  | 'analyze'
  | 'today'
  | 'recovery'
  | 'explain'
  | 'nutrition'
  | 'freeform';

/**
 * The server assembles cross-domain context (recent workouts, activities,
 * sleep/steps, readiness) from the user's own rows under RLS, then calls the
 * LLM. The client never sends the raw data or holds the model key.
 */
export interface CoachRequest {
  scope: CoachScope;
  /** Free-text question for 'freeform', or a follow-up on any scope. */
  question?: string;
  /** For 'explain': the catalog exercise id. */
  exerciseId?: string;
  /** Opt-in: let the model consider these domains for cross-domain advice. */
  includeDomains?: ('strength' | 'cardio' | 'nutrition' | 'recovery' | 'steps')[];
}

export interface CoachResponse {
  answer: string;
  /** Machine-readable structure when the scope produces one (optional). */
  structured?: unknown;
  /** What data the answer was grounded in, for transparency. */
  usedContext: string[];
  /** Set when the hosted model was unavailable and a local fallback is advised. */
  degraded?: boolean;
}

// --- Gym busyness (anonymized, crowd-aggregated) -------------------------

export interface BusynessQuery {
  /** Shared place id (geohash-derived), linking many users' gyms to one place. */
  placeId: string;
  /** Local day-of-week 0-6 and hour 0-23; defaults to "now". */
  dayOfWeek?: number;
  hour?: number;
}

export interface BusynessResponse {
  level: 'unknown' | 'quiet' | 'moderate' | 'busy' | 'packed';
  score: number;
  byHour: { hour: number; score: number }[];
  /** Distinct users contributing; results below the k-anonymity floor are hidden. */
  contributors: number;
}

// --- Account lifecycle ---------------------------------------------------

/** GDPR/CCPA export: returns a short-lived signed URL to a full data archive. */
export interface DataExportResponse {
  url: string;
  expiresAt: string;
}
