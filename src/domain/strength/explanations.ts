/**
 * On-device "AI" coaching content: plain-language exercise explanations and a
 * "what should I train today" recommendation.
 *
 * This is deliberately rule-based and local — no network, no hosted LLM, no
 * data leaving the device (see SECURITY.md). Explanations are composed from a
 * per-exercise guidance table plus the exercise's own metadata, so every
 * catalog entry gets a useful writeup even without hand-authored text.
 *
 * When a hosted LLM is added later, `explainExercise` is the seam to swap:
 * the UI depends on the returned shape, not on how the text is produced.
 */
import { getExercise, muscleGroupLabel } from '../exercises';
import type { Exercise, MuscleGroup, UserProfile, WorkoutSession } from '../types';
import { generateSuggestions } from './suggestions';

export interface ExerciseExplanation {
  name: string;
  summary: string;
  /** Ordered execution cues. */
  cues: string[];
  /** Common mistakes to avoid. */
  mistakes: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
}

interface Guidance {
  summary: string;
  cues: string[];
  mistakes: string[];
}

/** Hand-authored guidance for the primary lifts. */
const EXERCISE_GUIDANCE: Record<string, Guidance> = {
  'barbell-bench-press': {
    summary:
      'The benchmark upper-body pressing lift. Drives chest, front delts, and triceps.',
    cues: [
      'Set your shoulder blades back and down, and keep them pinned.',
      'Lower the bar to mid-chest with elbows about 45–75° from your torso.',
      'Keep your feet planted and drive the bar up and slightly back.',
    ],
    mistakes: [
      'Flaring elbows straight out to 90° (stresses the shoulders).',
      'Bouncing the bar off the chest.',
    ],
  },
  'back-squat': {
    summary:
      'The king of lower-body lifts. Builds quads and glutes with heavy full-body tension.',
    cues: [
      'Brace your core as if about to be punched before you unrack.',
      'Sit down and back, driving your knees out over your toes.',
      'Descend to at least parallel, then drive up through mid-foot.',
    ],
    mistakes: [
      'Knees caving inward under load.',
      'Letting the chest collapse forward out of the hole.',
    ],
  },
  deadlift: {
    summary:
      'A full posterior-chain pull. Trains hamstrings, glutes, and back from the floor.',
    cues: [
      'Bar over mid-foot, shins close, shoulders just ahead of the bar.',
      'Take the slack out of the bar, then push the floor away.',
      'Keep the bar dragging up your legs; lock out with glutes, not lower back.',
    ],
    mistakes: [
      'Rounding the lower back under load.',
      'Jerking the bar off the floor instead of building tension first.',
    ],
  },
  'overhead-press': {
    summary: 'A strict standing shoulder press that also demands core stability.',
    cues: [
      'Start with the bar on your front delts, elbows slightly ahead.',
      'Squeeze your glutes and brace to avoid over-arching.',
      'Press up and slightly back, finishing with the bar over mid-foot.',
    ],
    mistakes: [
      'Leaning back into a incline-press position.',
      'Pressing around the chin instead of moving the head back and through.',
    ],
  },
  'pull-up': {
    summary: 'A vertical pull that builds the lats, upper back, and biceps.',
    cues: [
      'Start from a full dead hang with shoulders engaged.',
      'Drive your elbows down and back, leading with the chest.',
      'Pull until your chin clears the bar, then lower under control.',
    ],
    mistakes: ['Kipping or swinging for reps.', 'Cutting the range of motion short.'],
  },
};

/**
 * Produce a plain-language explanation for an exercise. Uses hand-authored
 * guidance when available, otherwise composes a useful writeup from metadata.
 */
export function explainExercise(exercise: Exercise): ExerciseExplanation {
  const guidance = EXERCISE_GUIDANCE[exercise.id];
  const primaryMuscles = exercise.primaryMuscles.map(muscleGroupLabel);
  const secondaryMuscles = exercise.secondaryMuscles.map(muscleGroupLabel);

  if (guidance) {
    return {
      name: exercise.name,
      summary: guidance.summary,
      cues: guidance.cues,
      mistakes: guidance.mistakes,
      primaryMuscles,
      secondaryMuscles,
    };
  }

  // Generic fallback composed from the exercise's own metadata.
  const kind = exercise.category === 'compound' ? 'compound' : 'isolation';
  const muscleText = primaryMuscles.join(' and ') || 'the target muscle';
  return {
    name: exercise.name,
    summary: `A ${kind} ${exercise.equipment} exercise that primarily trains ${muscleText}.`,
    cues: [
      'Move through a full, controlled range of motion.',
      'Keep tension on the target muscle rather than using momentum.',
      exercise.category === 'compound'
        ? 'Brace your core and keep a stable, neutral spine.'
        : 'Pause briefly at the peak contraction for a stronger stimulus.',
    ],
    mistakes: [
      'Using too much weight and losing form.',
      'Rushing reps instead of controlling the lowering phase.',
    ],
    primaryMuscles,
    secondaryMuscles,
  };
}

export interface TodayFocus {
  /** Muscle groups worth prioritizing today. */
  prioritize: MuscleGroup[];
  /** Muscle groups that were hit hard recently and should rest. */
  rest: MuscleGroup[];
  /** A friendly one-line recommendation. */
  message: string;
}

/**
 * Recommend what to train today from recent history. Prioritizes undertrained
 * groups and warns off ones still recovering. Reuses the suggestions engine so
 * the logic stays in one place.
 */
export function recommendTodayFocus(
  sessions: WorkoutSession[],
  profile: UserProfile,
  now: Date,
): TodayFocus {
  const suggestions = generateSuggestions(sessions, profile, now);

  const prioritize = new Set<MuscleGroup>();
  const rest = new Set<MuscleGroup>();
  for (const s of suggestions) {
    if (s.type === 'undertrained' || s.type === 'imbalance') {
      for (const g of s.muscleGroups) prioritize.add(g);
    } else if (s.type === 'recovery') {
      for (const g of s.muscleGroups) rest.add(g);
    }
  }
  // Don't recommend prioritizing something that also needs rest.
  for (const g of rest) prioritize.delete(g);

  const prioritizeList = [...prioritize].slice(0, 4);
  const restList = [...rest];

  let message: string;
  if (sessions.length === 0) {
    message = 'Log your first workout and I’ll tailor recommendations to you.';
  } else if (prioritizeList.length > 0) {
    message = `Good day to focus on ${prioritizeList
      .map(muscleGroupLabel)
      .join(', ')}.`;
  } else if (restList.length > 0) {
    message = `You’ve trained hard recently — consider a lighter day or rest.`;
  } else {
    message = 'Your training is well balanced. Train by feel or push a weak point.';
  }

  return { prioritize: prioritizeList, rest: restList, message };
}

/** Convenience: explain by exercise id, or undefined if unknown. */
export function explainExerciseById(
  exerciseId: string,
): ExerciseExplanation | undefined {
  const exercise = getExercise(exerciseId);
  return exercise ? explainExercise(exercise) : undefined;
}
