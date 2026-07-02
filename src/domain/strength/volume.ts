/**
 * Training-volume accounting.
 *
 * "Volume load" is weight x reps summed over sets. We also count *working sets*
 * per muscle group, which is the metric most hypertrophy guidelines are written
 * against (e.g. "10-20 sets per muscle per week"). Secondary muscles get
 * partial credit because they contribute less to the movement.
 */
import { getExercise } from '../exercises';
import type { MuscleGroup, SetEntry, WorkoutSession } from '../types';

/** Fraction of a set credited to secondary muscles. */
export const SECONDARY_MUSCLE_CREDIT = 0.5;

/** Whether a set counts as a working set (completed, non-warmup, real reps). */
export function isWorkingSet(set: SetEntry): boolean {
  return set.completed && !set.isWarmup && set.reps > 0;
}

/** Volume load (weight x reps) for a single set. Warmups count as 0. */
export function setVolume(set: SetEntry): number {
  if (!isWorkingSet(set)) return 0;
  return set.weight * set.reps;
}

/** Total volume load across every working set in a session. */
export function sessionVolume(session: WorkoutSession): number {
  return session.exercises.reduce(
    (total, log) => total + log.sets.reduce((s, set) => s + setVolume(set), 0),
    0,
  );
}

/** Count of working sets in a session. */
export function sessionWorkingSets(session: WorkoutSession): number {
  return session.exercises.reduce(
    (total, log) => total + log.sets.filter(isWorkingSet).length,
    0,
  );
}

/**
 * Working sets attributed to each muscle group for a session.
 *
 * Each working set contributes 1.0 to every primary muscle and
 * SECONDARY_MUSCLE_CREDIT to every secondary muscle of its exercise.
 */
export function setsPerMuscleGroup(
  session: WorkoutSession,
): Partial<Record<MuscleGroup, number>> {
  const counts: Partial<Record<MuscleGroup, number>> = {};
  const add = (group: MuscleGroup, amount: number) => {
    counts[group] = (counts[group] ?? 0) + amount;
  };

  for (const log of session.exercises) {
    const exercise = getExercise(log.exerciseId);
    if (!exercise) continue;
    const workingSets = log.sets.filter(isWorkingSet).length;
    if (workingSets === 0) continue;
    for (const group of exercise.primaryMuscles) add(group, workingSets);
    for (const group of exercise.secondaryMuscles) {
      add(group, workingSets * SECONDARY_MUSCLE_CREDIT);
    }
  }
  return counts;
}

/** Merge several per-muscle-group set maps by summing matching groups. */
export function mergeMuscleGroupCounts(
  maps: Partial<Record<MuscleGroup, number>>[],
): Partial<Record<MuscleGroup, number>> {
  const merged: Partial<Record<MuscleGroup, number>> = {};
  for (const map of maps) {
    for (const [group, value] of Object.entries(map) as [MuscleGroup, number][]) {
      merged[group] = (merged[group] ?? 0) + value;
    }
  }
  return merged;
}
