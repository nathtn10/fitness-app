/**
 * Built-in exercise catalog.
 *
 * Each exercise maps to the muscle groups it trains, which drives volume
 * accounting, muscle-balance analysis, and the AI focus suggestions.
 */
import type { Exercise, MuscleGroup } from './types';

export const EXERCISE_CATALOG: Exercise[] = [
  // ----- Push -----
  {
    id: 'barbell-bench-press',
    name: 'Barbell Bench Press',
    category: 'compound',
    movement: 'push',
    equipment: 'barbell',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['triceps', 'shoulders'],
  },
  {
    id: 'incline-dumbbell-press',
    name: 'Incline Dumbbell Press',
    category: 'compound',
    movement: 'push',
    equipment: 'dumbbell',
    primaryMuscles: ['chest', 'shoulders'],
    secondaryMuscles: ['triceps'],
  },
  {
    id: 'overhead-press',
    name: 'Overhead Press',
    category: 'compound',
    movement: 'push',
    equipment: 'barbell',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: ['triceps', 'traps'],
  },
  {
    id: 'triceps-pushdown',
    name: 'Triceps Pushdown',
    category: 'isolation',
    movement: 'isolation',
    equipment: 'cable',
    primaryMuscles: ['triceps'],
    secondaryMuscles: [],
  },
  {
    id: 'lateral-raise',
    name: 'Lateral Raise',
    category: 'isolation',
    movement: 'isolation',
    equipment: 'dumbbell',
    primaryMuscles: ['shoulders'],
    secondaryMuscles: [],
  },
  // ----- Pull -----
  {
    id: 'deadlift',
    name: 'Deadlift',
    category: 'compound',
    movement: 'hinge',
    equipment: 'barbell',
    primaryMuscles: ['hamstrings', 'glutes', 'back'],
    secondaryMuscles: ['lats', 'traps', 'forearms', 'core'],
  },
  {
    id: 'pull-up',
    name: 'Pull-Up',
    category: 'compound',
    movement: 'pull',
    equipment: 'bodyweight',
    primaryMuscles: ['lats', 'back'],
    secondaryMuscles: ['biceps', 'forearms'],
  },
  {
    id: 'barbell-row',
    name: 'Barbell Row',
    category: 'compound',
    movement: 'pull',
    equipment: 'barbell',
    primaryMuscles: ['back', 'lats'],
    secondaryMuscles: ['biceps', 'forearms', 'traps'],
  },
  {
    id: 'lat-pulldown',
    name: 'Lat Pulldown',
    category: 'compound',
    movement: 'pull',
    equipment: 'cable',
    primaryMuscles: ['lats'],
    secondaryMuscles: ['biceps', 'back'],
  },
  {
    id: 'barbell-curl',
    name: 'Barbell Curl',
    category: 'isolation',
    movement: 'isolation',
    equipment: 'barbell',
    primaryMuscles: ['biceps'],
    secondaryMuscles: ['forearms'],
  },
  {
    id: 'face-pull',
    name: 'Face Pull',
    category: 'isolation',
    movement: 'pull',
    equipment: 'cable',
    primaryMuscles: ['shoulders', 'traps'],
    secondaryMuscles: ['back'],
  },
  // ----- Legs -----
  {
    id: 'back-squat',
    name: 'Back Squat',
    category: 'compound',
    movement: 'squat',
    equipment: 'barbell',
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['hamstrings', 'core'],
  },
  {
    id: 'front-squat',
    name: 'Front Squat',
    category: 'compound',
    movement: 'squat',
    equipment: 'barbell',
    primaryMuscles: ['quads'],
    secondaryMuscles: ['glutes', 'core'],
  },
  {
    id: 'romanian-deadlift',
    name: 'Romanian Deadlift',
    category: 'compound',
    movement: 'hinge',
    equipment: 'barbell',
    primaryMuscles: ['hamstrings', 'glutes'],
    secondaryMuscles: ['back', 'forearms'],
  },
  {
    id: 'leg-press',
    name: 'Leg Press',
    category: 'compound',
    movement: 'squat',
    equipment: 'machine',
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['hamstrings'],
  },
  {
    id: 'walking-lunge',
    name: 'Walking Lunge',
    category: 'compound',
    movement: 'lunge',
    equipment: 'dumbbell',
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['hamstrings'],
  },
  {
    id: 'leg-curl',
    name: 'Leg Curl',
    category: 'isolation',
    movement: 'isolation',
    equipment: 'machine',
    primaryMuscles: ['hamstrings'],
    secondaryMuscles: [],
  },
  {
    id: 'calf-raise',
    name: 'Standing Calf Raise',
    category: 'isolation',
    movement: 'isolation',
    equipment: 'machine',
    primaryMuscles: ['calves'],
    secondaryMuscles: [],
  },
  // ----- Core -----
  {
    id: 'hanging-leg-raise',
    name: 'Hanging Leg Raise',
    category: 'isolation',
    movement: 'core',
    equipment: 'bodyweight',
    primaryMuscles: ['core'],
    secondaryMuscles: ['forearms'],
  },
  {
    id: 'plank',
    name: 'Plank',
    category: 'isolation',
    movement: 'core',
    equipment: 'bodyweight',
    primaryMuscles: ['core'],
    secondaryMuscles: [],
  },
];

const EXERCISE_BY_ID: Map<string, Exercise> = new Map(
  EXERCISE_CATALOG.map((exercise) => [exercise.id, exercise]),
);

/** Look up an exercise definition by id. Returns undefined if unknown. */
export function getExercise(id: string): Exercise | undefined {
  return EXERCISE_BY_ID.get(id);
}

/** Human-readable label for a muscle group. */
export function muscleGroupLabel(group: MuscleGroup): string {
  switch (group) {
    case 'lats':
      return 'Lats';
    case 'core':
      return 'Core';
    default:
      return group.charAt(0).toUpperCase() + group.slice(1);
  }
}
