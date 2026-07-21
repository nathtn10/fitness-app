/**
 * Progress-photo comparison.
 *
 * We deliberately do NOT do black-box "AI body analysis" of pixels. Instead we
 * pair two photos with the *measured* changes between their dates — bodyweight
 * delta and estimated-1RM movement on the lifts trained in that span. That's
 * honest, explainable cross-domain insight rather than a guess from an image.
 */
import { daysBetween } from '../dates';
import { estimateOneRepMax } from '../strength/oneRepMax';
import { isWorkingSet } from '../strength/volume';
import type { WorkoutSession } from '../types';
import type { ProgressPhoto } from './types';

export interface StrengthChange {
  exerciseId: string;
  from: number;
  to: number;
  delta: number;
}

export interface PhotoComparison {
  days: number;
  weightDeltaKg?: number;
  /** Estimated-1RM changes for lifts trained across the span, biggest first. */
  strengthChanges: StrengthChange[];
}

/** Best estimated 1RM for an exercise across sessions up to (and incl.) a date. */
function bestE1RMUpTo(
  sessions: WorkoutSession[],
  exerciseId: string,
  isoDate: string,
): number {
  const cutoff = new Date(isoDate).getTime();
  let best = 0;
  for (const session of sessions) {
    if (new Date(session.startedAt).getTime() > cutoff) continue;
    for (const log of session.exercises) {
      if (log.exerciseId !== exerciseId) continue;
      for (const set of log.sets) {
        if (!isWorkingSet(set)) continue;
        best = Math.max(best, estimateOneRepMax(set.weight, set.reps));
      }
    }
  }
  return best;
}

/**
 * Compare two photos (chronological order enforced) with the measured changes
 * between them. `topN` caps how many strength changes are returned.
 */
export function comparePhotos(
  a: ProgressPhoto,
  b: ProgressPhoto,
  sessions: WorkoutSession[],
  topN = 4,
): PhotoComparison {
  // Ensure `before` is the earlier photo.
  const [before, after] =
    new Date(a.takenAt).getTime() <= new Date(b.takenAt).getTime()
      ? [a, b]
      : [b, a];

  const days = Math.abs(daysBetween(after.takenAt, before.takenAt));

  const weightDeltaKg =
    before.bodyweightKg != null && after.bodyweightKg != null
      ? Math.round((after.bodyweightKg - before.bodyweightKg) * 10) / 10
      : undefined;

  // Exercises trained anywhere up to the later photo.
  const exerciseIds = new Set<string>();
  for (const session of sessions) {
    if (new Date(session.startedAt).getTime() > new Date(after.takenAt).getTime()) {
      continue;
    }
    for (const log of session.exercises) exerciseIds.add(log.exerciseId);
  }

  const strengthChanges: StrengthChange[] = [];
  for (const exerciseId of exerciseIds) {
    const from = bestE1RMUpTo(sessions, exerciseId, before.takenAt);
    const to = bestE1RMUpTo(sessions, exerciseId, after.takenAt);
    if (from === 0 && to === 0) continue;
    const delta = Math.round((to - from) * 10) / 10;
    if (delta !== 0) strengthChanges.push({ exerciseId, from, to, delta });
  }

  strengthChanges.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));

  return { days, weightDeltaKg, strengthChanges: strengthChanges.slice(0, topN) };
}
