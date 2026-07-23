/**
 * AI-style training suggestions.
 *
 * This is a transparent, rule-based recommendation engine (not a black-box
 * model) that analyzes recent training and surfaces actionable guidance:
 *
 *  - Undertrained muscle groups vs. weekly volume targets.
 *  - Push/pull and upper/lower imbalances that invite injury over time.
 *  - Stalled lifts (no estimated-1RM progress) that may need a deload/variation.
 *  - Freshly-hammered groups that likely need recovery before more volume.
 *
 * Everything is deterministic and takes `now` as an argument so it is fully
 * unit-testable. The output is ranked by priority for direct display.
 */
import { getExercise, muscleGroupLabel } from '../exercises';
import type { MuscleGroup, UserProfile, WorkoutSession } from '../types';
import { estimateOneRepMax } from './oneRepMax';
import { isWorkingSet } from './volume';
import {
  muscleGroupSetsInRange,
  oneRepMaxTrend,
  sessionsInLastDays,
} from './progress';

export type SuggestionType =
  | 'undertrained'
  | 'imbalance'
  | 'stalled'
  | 'recovery'
  | 'wellBalanced';

export interface Suggestion {
  id: string;
  type: SuggestionType;
  /** 1 = highest priority. Used for ranking/sorting. */
  priority: number;
  title: string;
  detail: string;
  muscleGroups: MuscleGroup[];
}

/** Default weekly working-set targets (middle of common hypertrophy ranges). */
export const DEFAULT_WEEKLY_SET_TARGETS: Record<MuscleGroup, number> = {
  chest: 12,
  back: 14,
  lats: 12,
  traps: 8,
  shoulders: 12,
  biceps: 10,
  triceps: 10,
  forearms: 6,
  quads: 12,
  hamstrings: 10,
  glutes: 10,
  calves: 8,
  core: 8,
};

/** Muscle groups that make up the "push" and "pull" categories. */
const PUSH_GROUPS: MuscleGroup[] = ['chest', 'shoulders', 'triceps'];
const PULL_GROUPS: MuscleGroup[] = ['back', 'lats', 'biceps', 'traps'];
const UPPER_GROUPS: MuscleGroup[] = [
  'chest',
  'back',
  'lats',
  'traps',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
];
const LOWER_GROUPS: MuscleGroup[] = ['quads', 'hamstrings', 'glutes', 'calves'];

function sumGroups(
  counts: Partial<Record<MuscleGroup, number>>,
  groups: MuscleGroup[],
): number {
  return groups.reduce((total, g) => total + (counts[g] ?? 0), 0);
}

export interface SuggestionOptions {
  /** How many days count as "this week" for volume comparison. Default 7. */
  windowDays?: number;
  /** Lookback for detecting stalled lifts. Default 28 days. */
  stallWindowDays?: number;
}

/**
 * Generate ranked suggestions from a user's session history.
 *
 * @param sessions Full session history (any order).
 * @param profile  User profile; `weeklySetTargets` overrides defaults.
 * @param now      Reference "current" time (injected for testability).
 */
export function generateSuggestions(
  sessions: WorkoutSession[],
  profile: UserProfile,
  now: Date,
  options: SuggestionOptions = {},
): Suggestion[] {
  const windowDays = options.windowDays ?? 7;
  const stallWindowDays = options.stallWindowDays ?? 28;
  const suggestions: Suggestion[] = [];

  // A brand-new user with no logged training gets no (arbitrary) advice.
  if (sessions.length === 0) return suggestions;

  const targets: Record<MuscleGroup, number> = {
    ...DEFAULT_WEEKLY_SET_TARGETS,
    ...profile.weeklySetTargets,
  };

  const recent = sessionsInLastDays(sessions, windowDays, now);
  const setsThisWeek = muscleGroupSetsInRange(recent);

  // --- 1. Undertrained muscle groups -------------------------------------
  // Rank the groups furthest below target. Only flag meaningful shortfalls.
  const shortfalls = (Object.keys(targets) as MuscleGroup[])
    .map((group) => {
      const done = setsThisWeek[group] ?? 0;
      const target = targets[group];
      const ratio = target > 0 ? done / target : 1;
      return { group, done, target, ratio };
    })
    .filter((x) => x.ratio < 0.6)
    .sort((a, b) => a.ratio - b.ratio);

  for (const s of shortfalls.slice(0, 3)) {
    const remaining = Math.max(0, Math.ceil(s.target - s.done));
    suggestions.push({
      id: `undertrained-${s.group}`,
      type: 'undertrained',
      priority: 1,
      title: `Focus on ${muscleGroupLabel(s.group)}`,
      detail:
        s.done === 0
          ? `You haven't trained ${muscleGroupLabel(
              s.group,
            ).toLowerCase()} in the last ${windowDays} days. Aim for about ${s.target} sets this week.`
          : `Only ${Math.round(s.done)} of ~${s.target} weekly sets for ${muscleGroupLabel(
              s.group,
            ).toLowerCase()}. Add roughly ${remaining} more set${
              remaining === 1 ? '' : 's'
            }.`,
      muscleGroups: [s.group],
    });
  }

  // --- 2. Push/pull & upper/lower balance --------------------------------
  const push = sumGroups(setsThisWeek, PUSH_GROUPS);
  const pull = sumGroups(setsThisWeek, PULL_GROUPS);
  addBalanceSuggestion(suggestions, 'push', 'pull', push, pull, PUSH_GROUPS, PULL_GROUPS);

  const upper = sumGroups(setsThisWeek, UPPER_GROUPS);
  const lower = sumGroups(setsThisWeek, LOWER_GROUPS);
  addBalanceSuggestion(
    suggestions,
    'upper body',
    'lower body',
    upper,
    lower,
    UPPER_GROUPS,
    LOWER_GROUPS,
  );

  // --- 3. Stalled lifts ---------------------------------------------------
  const stalledExercises = findStalledExercises(sessions, now, stallWindowDays);
  for (const exerciseId of stalledExercises.slice(0, 2)) {
    const exercise = getExercise(exerciseId);
    if (!exercise) continue;
    suggestions.push({
      id: `stalled-${exerciseId}`,
      type: 'stalled',
      priority: 2,
      title: `${exercise.name} has stalled`,
      detail: `Your estimated 1RM on ${exercise.name} hasn't improved in the last ${stallWindowDays} days. Consider a deload week, a rep-range change, or a variation.`,
      muscleGroups: exercise.primaryMuscles,
    });
  }

  // --- 4. Recovery: groups trained hard in the last ~2 days --------------
  const veryRecent = sessionsInLastDays(sessions, 2, now);
  const setsVeryRecent = muscleGroupSetsInRange(veryRecent);
  for (const group of Object.keys(setsVeryRecent) as MuscleGroup[]) {
    const done = setsVeryRecent[group] ?? 0;
    if (done >= targets[group] * 0.75) {
      suggestions.push({
        id: `recovery-${group}`,
        type: 'recovery',
        priority: 3,
        title: `Let ${muscleGroupLabel(group)} recover`,
        detail: `You've done ${Math.round(
          done,
        )} sets for ${muscleGroupLabel(
          group,
        ).toLowerCase()} in the last 2 days. Give it 48h before training it hard again.`,
        muscleGroups: [group],
      });
    }
  }

  // --- 5. Nothing to flag → positive reinforcement -----------------------
  if (suggestions.length === 0 && recent.length > 0) {
    suggestions.push({
      id: 'well-balanced',
      type: 'wellBalanced',
      priority: 4,
      title: 'Training looks well balanced',
      detail:
        'Your recent volume is on target across muscle groups with no obvious imbalances. Keep progressing.',
      muscleGroups: [],
    });
  }

  return suggestions.sort((a, b) => a.priority - b.priority);
}

function addBalanceSuggestion(
  out: Suggestion[],
  labelA: string,
  labelB: string,
  volA: number,
  volB: number,
  groupsA: MuscleGroup[],
  groupsB: MuscleGroup[],
): void {
  const total = volA + volB;
  if (total < 6) return; // not enough data this week to judge balance
  const larger = Math.max(volA, volB);
  const smaller = Math.min(volA, volB);
  // Flag when one side is at least 60% bigger than the other.
  if (smaller === 0 || larger / smaller >= 1.6) {
    const laggingLabel = volA < volB ? labelA : labelB;
    const laggingGroups = volA < volB ? groupsA : groupsB;
    out.push({
      id: `imbalance-${laggingLabel.replace(/\s+/g, '-')}`,
      type: 'imbalance',
      priority: 2,
      title: `${cap(laggingLabel)} is lagging`,
      detail: `Your ${labelA}/${labelB} set ratio is roughly ${Math.round(
        volA,
      )}:${Math.round(
        volB,
      )}. Add volume to your ${laggingLabel} work to even things out.`,
      muscleGroups: laggingGroups,
    });
  }
}

/**
 * Exercises whose best estimated 1RM has not improved across the trend within
 * the lookback window, given at least 3 data points to judge from.
 */
function findStalledExercises(
  sessions: WorkoutSession[],
  now: Date,
  windowDays: number,
): string[] {
  const recent = sessionsInLastDays(sessions, windowDays, now);
  const exerciseIds = new Set<string>();
  for (const session of recent) {
    for (const log of session.exercises) {
      if (log.sets.some(isWorkingSet)) exerciseIds.add(log.exerciseId);
    }
  }

  const stalled: string[] = [];
  for (const exerciseId of exerciseIds) {
    const trend = oneRepMaxTrend(recent, exerciseId);
    if (trend.length < 3) continue;
    const best = Math.max(...trend.map((p) => p.estimatedOneRepMax));
    const latest = trend[trend.length - 1].estimatedOneRepMax;
    // Stalled if the most recent effort is no better than the window's best
    // (allowing a tiny epsilon), i.e. no new ground gained lately.
    if (latest <= best - 0.01 || latest <= trend[0].estimatedOneRepMax + 0.01) {
      stalled.push(exerciseId);
    }
  }
  return stalled;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Estimate a suggested working weight for a target rep count on an exercise. */
export function suggestWorkingWeight(
  sessions: WorkoutSession[],
  exerciseId: string,
  targetReps: number,
): number | undefined {
  let bestE1RM = 0;
  for (const session of sessions) {
    for (const log of session.exercises) {
      if (log.exerciseId !== exerciseId) continue;
      for (const set of log.sets) {
        if (!isWorkingSet(set)) continue;
        bestE1RM = Math.max(bestE1RM, estimateOneRepMax(set.weight, set.reps));
      }
    }
  }
  if (bestE1RM <= 0) return undefined;
  return bestE1RM / (1 + targetReps / 30);
}
