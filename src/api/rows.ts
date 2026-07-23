/**
 * Server row shapes: the on-device domain records plus the sync/ownership
 * fields the backend adds. Reusing the domain types keeps a single source of
 * truth — the cloud row is "the domain record + who owns it + sync metadata".
 */
import type { Activity } from '../domain/cardio/types';
import type { Gym, GymVisit } from '../domain/gym/types';
import type { NutritionGoals } from '../domain/nutrition/goals';
import type { Meal } from '../domain/nutrition/types';
import type { ProgressPhoto } from '../domain/photos/types';
import type { MuscleGroup, WeightUnit, WorkoutSession } from '../domain/types';
import type { Shareable, SyncMeta, Visibility } from './common';

// --- User-owned, shareable training data ---------------------------------

/** A workout session as stored server-side (payload in `data` jsonb). */
export type WorkoutSessionRow = WorkoutSession & SyncMeta & Shareable;

export type ActivityRow = Activity & SyncMeta & Shareable;

export type MealRow = Meal & SyncMeta & Shareable;

// --- User-owned, always-private data -------------------------------------

/** Progress photos are private; the local `uri` becomes a Storage path. */
export type ProgressPhotoRow = Omit<ProgressPhoto, 'uri'> &
  SyncMeta & {
    /** Path within the private `progress-photos` bucket. */
    storagePath: string;
  };

export type GymRow = Gym & SyncMeta;

/** Visits feed the anonymized busyness aggregation; never shared directly. */
export type GymVisitRow = GymVisit & SyncMeta;

/** Daily steps / active energy ingested from HealthKit or Google Fit. */
export interface DailyActivityRow extends SyncMeta {
  /** Local calendar date, YYYY-MM-DD. One row per user per day per source. */
  date: string;
  steps: number;
  activeKcal: number;
  distanceMeters: number;
  source: 'healthkit' | 'googlefit' | 'manual';
}

// --- Profile & preferences -----------------------------------------------

export interface ProfileRow {
  /** Equals auth.users.id. */
  id: string;
  username: string;
  displayName: string;
  unit: WeightUnit;
  bodyweightKg?: number;
  weeklySetTargets: Partial<Record<MuscleGroup, number>>;
  nutritionGoals: NutritionGoals;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

/** Per-domain default sharing. Individual records can still override. */
export interface PrivacySettings {
  userId: string;
  defaultVisibility: Visibility;
  shareWorkouts: boolean;
  shareActivities: boolean;
  shareNutrition: boolean;
  shareSteps: boolean;
  /** Whether the account is discoverable/searchable by other users. */
  discoverable: boolean;
}
