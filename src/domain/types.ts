/**
 * Core domain types shared across the app.
 *
 * These types are intentionally free of any React Native / persistence concerns
 * so they can be reused by the UI, the data layer, and unit tests alike.
 */

/** Muscle groups we track for volume balance and AI suggestions. */
export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'lats'
  | 'traps'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core';

export const ALL_MUSCLE_GROUPS: readonly MuscleGroup[] = [
  'chest',
  'back',
  'lats',
  'traps',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
];

/** Broad movement categories, useful for push/pull and upper/lower balance. */
export type MovementPattern =
  | 'push'
  | 'pull'
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'carry'
  | 'core'
  | 'isolation';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'kettlebell'
  | 'band'
  | 'other';

export type ExerciseCategory = 'compound' | 'isolation';

/** Weight unit. All stored weights are in this unit per-session. */
export type WeightUnit = 'kg' | 'lb';

/** A catalog exercise definition (not a logged instance). */
export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  movement: MovementPattern;
  equipment: Equipment;
  /** Primary muscles trained; receive full volume credit. */
  primaryMuscles: MuscleGroup[];
  /** Secondary muscles; receive partial volume credit (see volume.ts). */
  secondaryMuscles: MuscleGroup[];
}

/**
 * A single logged set within an exercise.
 *
 * `weight` is expressed in the parent session's unit. `restSeconds` is the rest
 * taken *after* this set (i.e. before the next one starts).
 */
export interface SetEntry {
  id: string;
  weight: number;
  reps: number;
  /** Optional Rate of Perceived Exertion, 1-10. */
  rpe?: number;
  /** Rest taken after this set, in seconds. */
  restSeconds?: number;
  /** Warmup sets are excluded from PRs and working-volume calculations. */
  isWarmup?: boolean;
  completed: boolean;
}

/** All sets logged for one exercise within a session. */
export interface ExerciseLog {
  id: string;
  exerciseId: string;
  sets: SetEntry[];
  notes?: string;
}

/** A completed or in-progress workout session. */
export interface WorkoutSession {
  id: string;
  /** ISO-8601 timestamp of when the session started. */
  startedAt: string;
  /** ISO-8601 timestamp of when the session ended, if finished. */
  endedAt?: string;
  name: string;
  unit: WeightUnit;
  exercises: ExerciseLog[];
  notes?: string;
}

/** User preferences and goals. */
export interface UserProfile {
  displayName: string;
  unit: WeightUnit;
  bodyweightKg?: number;
  /** Target working sets per muscle group per week. */
  weeklySetTargets: Partial<Record<MuscleGroup, number>>;
}
