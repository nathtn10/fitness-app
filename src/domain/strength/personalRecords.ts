/**
 * Personal-record (PR) detection.
 *
 * We track three complementary PRs per exercise:
 *  - heaviestWeight: the most weight moved for at least one rep.
 *  - bestEstimatedOneRepMax: strongest single effort, normalized across rep
 *    ranges via the 1RM estimate.
 *  - bestSetVolume: the highest weight x reps in a single set.
 *
 * `detectNewPRs` compares a freshly finished session against prior history so
 * the UI can celebrate records the moment they happen.
 */
import type { SetEntry, WorkoutSession } from '../types';
import { estimateOneRepMax } from './oneRepMax';
import { isWorkingSet } from './volume';

export interface ExercisePRs {
  exerciseId: string;
  heaviestWeight: number;
  bestEstimatedOneRepMax: number;
  bestSetVolume: number;
  /** ISO timestamp of the session in which the best estimated 1RM was set. */
  achievedAt?: string;
}

function emptyPRs(exerciseId: string): ExercisePRs {
  return {
    exerciseId,
    heaviestWeight: 0,
    bestEstimatedOneRepMax: 0,
    bestSetVolume: 0,
  };
}

function foldSet(prs: ExercisePRs, set: SetEntry, when: string): void {
  if (!isWorkingSet(set)) return;
  if (set.weight > prs.heaviestWeight) prs.heaviestWeight = set.weight;

  const e1rm = estimateOneRepMax(set.weight, set.reps);
  if (e1rm > prs.bestEstimatedOneRepMax) {
    prs.bestEstimatedOneRepMax = e1rm;
    prs.achievedAt = when;
  }

  const volume = set.weight * set.reps;
  if (volume > prs.bestSetVolume) prs.bestSetVolume = volume;
}

/** Compute best-ever PRs for every exercise across a list of sessions. */
export function computePersonalRecords(
  sessions: WorkoutSession[],
): Map<string, ExercisePRs> {
  const byExercise = new Map<string, ExercisePRs>();
  for (const session of sessions) {
    for (const log of session.exercises) {
      let prs = byExercise.get(log.exerciseId);
      if (!prs) {
        prs = emptyPRs(log.exerciseId);
        byExercise.set(log.exerciseId, prs);
      }
      for (const set of log.sets) foldSet(prs, set, session.startedAt);
    }
  }
  return byExercise;
}

export type PRKind = 'heaviestWeight' | 'estimatedOneRepMax' | 'setVolume';

export interface NewPR {
  exerciseId: string;
  kind: PRKind;
  previous: number;
  current: number;
}

/**
 * Detect PRs achieved in `session` relative to `history` (which must NOT
 * include `session`). Returns one entry per record kind that improved.
 */
export function detectNewPRs(
  session: WorkoutSession,
  history: WorkoutSession[],
): NewPR[] {
  const priorPRs = computePersonalRecords(history);
  const sessionPRs = computePersonalRecords([session]);
  const results: NewPR[] = [];

  for (const [exerciseId, current] of sessionPRs) {
    const prior = priorPRs.get(exerciseId) ?? emptyPRs(exerciseId);

    if (current.heaviestWeight > prior.heaviestWeight) {
      results.push({
        exerciseId,
        kind: 'heaviestWeight',
        previous: prior.heaviestWeight,
        current: current.heaviestWeight,
      });
    }
    if (current.bestEstimatedOneRepMax > prior.bestEstimatedOneRepMax) {
      results.push({
        exerciseId,
        kind: 'estimatedOneRepMax',
        previous: prior.bestEstimatedOneRepMax,
        current: current.bestEstimatedOneRepMax,
      });
    }
    if (current.bestSetVolume > prior.bestSetVolume) {
      results.push({
        exerciseId,
        kind: 'setVolume',
        previous: prior.bestSetVolume,
        current: current.bestSetVolume,
      });
    }
  }
  return results;
}
