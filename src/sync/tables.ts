/**
 * Per-table serialization between the camelCase DTO rows (src/api/rows.ts) and
 * the snake_case Postgres rows (supabase/schema.sql).
 *
 * Each table stores the full domain record in a `data` jsonb column plus a few
 * extracted/indexed summary columns (started_at, total_volume, …) used for feed
 * and querying. Phase 0 syncs the five owner-private/shareable domains that
 * already have local repositories; progress photos (needs file upload) and
 * daily activity (Phase 4) are intentionally excluded here.
 */
import { mealNutrients } from '../domain/nutrition/nutrients';
import { sessionVolume, sessionWorkingSets } from '../domain/strength/volume';
import { stripEnvelope } from './mapping';

/** DTO row = domain record + envelope (userId/updatedAt/…); see rows.ts. */
type CamelRow = Record<string, unknown> & {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  visibility?: string;
};

export interface TableSerializer {
  /** Postgres table name. */
  db: string;
  /** Camel DTO row → snake DB row. */
  toDb(row: CamelRow): Record<string, unknown>;
  /** Snake DB row → camel DTO row (domain fields + envelope). */
  fromDb(dbRow: Record<string, any>): CamelRow;
}

/** Tables synced in Phase 0. */
export type Phase0Table =
  | 'workoutSessions'
  | 'activities'
  | 'meals'
  | 'gyms'
  | 'gymVisits';

function baseToDb(
  row: CamelRow,
  extra: (domain: any) => Record<string, unknown>,
): Record<string, unknown> {
  const domain = stripEnvelope<any>(row);
  return {
    id: row.id,
    user_id: row.userId,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    deleted_at: row.deletedAt ?? null,
    ...(row.visibility ? { visibility: row.visibility } : {}),
    ...extra(domain),
    data: domain,
  };
}

function baseFromDb(dbRow: Record<string, any>): CamelRow {
  return {
    ...(dbRow.data ?? {}),
    id: dbRow.id,
    userId: dbRow.user_id,
    createdAt: dbRow.created_at,
    updatedAt: dbRow.updated_at,
    deletedAt: dbRow.deleted_at ?? undefined,
    visibility: dbRow.visibility,
  };
}

export const TABLES: Record<Phase0Table, TableSerializer> = {
  workoutSessions: {
    db: 'workout_sessions',
    toDb: (row) =>
      baseToDb(row, (d) => ({
        started_at: d.startedAt,
        ended_at: d.endedAt ?? null,
        total_volume: sessionVolume(d),
        working_sets: sessionWorkingSets(d),
      })),
    fromDb: baseFromDb,
  },
  activities: {
    db: 'activities',
    toDb: (row) =>
      baseToDb(row, (d) => ({
        type: d.type,
        started_at: d.startedAt,
        distance_m: d.metrics?.distanceMeters ?? 0,
        moving_s: d.metrics?.movingSeconds ?? 0,
        elevation_m: d.metrics?.elevationGainMeters ?? 0,
        calories: d.metrics?.calories ?? 0,
      })),
    fromDb: baseFromDb,
  },
  meals: {
    db: 'meals',
    toDb: (row) =>
      baseToDb(row, (d) => {
        const n = mealNutrients(d);
        return {
          logged_at: d.loggedAt,
          type: d.type,
          name: d.name ?? '',
          calories: n.calories,
          protein_g: n.proteinG,
          carbs_g: n.carbsG,
          fat_g: n.fatG,
        };
      }),
    fromDb: baseFromDb,
  },
  gyms: {
    db: 'gyms',
    toDb: (row) =>
      baseToDb(row, (d) => ({
        name: d.name,
        latitude: d.latitude,
        longitude: d.longitude,
        radius_m: d.radiusMeters,
      })),
    fromDb: baseFromDb,
  },
  gymVisits: {
    db: 'gym_visits',
    toDb: (row) =>
      baseToDb(row, (d) => ({
        gym_id: d.gymId,
        arrived_at: d.arrivedAt,
        departed_at: d.departedAt ?? null,
      })),
    fromDb: baseFromDb,
  },
};

export const PHASE0_TABLES = Object.keys(TABLES) as Phase0Table[];
