/** Test factories for building sessions/sets without repetitive boilerplate. */
import type {
  ExerciseLog,
  SetEntry,
  UserProfile,
  WorkoutSession,
} from '../types';

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

export function makeSet(overrides: Partial<SetEntry> = {}): SetEntry {
  return {
    id: nextId('set'),
    weight: 100,
    reps: 5,
    completed: true,
    isWarmup: false,
    ...overrides,
  };
}

export function makeLog(
  exerciseId: string,
  sets: SetEntry[],
  overrides: Partial<ExerciseLog> = {},
): ExerciseLog {
  return {
    id: nextId('log'),
    exerciseId,
    sets,
    ...overrides,
  };
}

export function makeSession(
  startedAt: string,
  exercises: ExerciseLog[],
  overrides: Partial<WorkoutSession> = {},
): WorkoutSession {
  return {
    id: nextId('session'),
    startedAt,
    endedAt: startedAt,
    name: 'Test Session',
    unit: 'kg',
    exercises,
    ...overrides,
  };
}

export function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    displayName: 'Tester',
    unit: 'kg',
    weeklySetTargets: {},
    ...overrides,
  };
}
