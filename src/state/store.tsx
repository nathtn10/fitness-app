/**
 * Global app state: workout history, the active (in-progress) session, and the
 * user profile. Backed by the repository for persistence.
 *
 * Screens consume this via the `useStore` hook. All mutations go through the
 * action functions so persistence stays consistent.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  DEFAULT_PROFILE,
  loadProfile,
  loadSessions,
  saveProfile,
  saveSessions,
} from '../data/repository';
import { detectNewPRs, type NewPR } from '../domain/strength/personalRecords';
import type {
  ExerciseLog,
  SetEntry,
  UserProfile,
  WorkoutSession,
} from '../domain/types';
import { createId } from '../lib/id';

interface StoreValue {
  loading: boolean;
  sessions: WorkoutSession[];
  profile: UserProfile;
  activeSession: WorkoutSession | null;

  startWorkout: (name?: string) => void;
  cancelWorkout: () => void;
  finishWorkout: () => NewPR[];

  addExercise: (exerciseId: string) => void;
  removeExercise: (logId: string) => void;
  addSet: (logId: string, set?: Partial<SetEntry>) => void;
  updateSet: (logId: string, setId: string, patch: Partial<SetEntry>) => void;
  removeSet: (logId: string, setId: string) => void;

  updateProfile: (patch: Partial<UserProfile>) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(
    null,
  );

  // Initial load from persistence.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [loadedSessions, loadedProfile] = await Promise.all([
        loadSessions(),
        loadProfile(),
      ]);
      if (cancelled) return;
      setSessions(loadedSessions);
      setProfile(loadedProfile);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Helper to mutate the active session immutably.
  const mutateActive = useCallback(
    (fn: (s: WorkoutSession) => WorkoutSession) => {
      setActiveSession((prev) => (prev ? fn(prev) : prev));
    },
    [],
  );

  const startWorkout = useCallback(
    (name?: string) => {
      setActiveSession({
        id: createId('session'),
        startedAt: new Date().toISOString(),
        name: name?.trim() || 'Workout',
        unit: profile.unit,
        exercises: [],
      });
    },
    [profile.unit],
  );

  const cancelWorkout = useCallback(() => setActiveSession(null), []);

  const finishWorkout = useCallback((): NewPR[] => {
    if (!activeSession) return [];
    const finished: WorkoutSession = {
      ...activeSession,
      endedAt: new Date().toISOString(),
    };
    const prs = detectNewPRs(finished, sessions);
    const next = [finished, ...sessions];
    setSessions(next);
    void saveSessions(next);
    setActiveSession(null);
    return prs;
  }, [activeSession, sessions]);

  const addExercise = useCallback(
    (exerciseId: string) => {
      mutateActive((s) => {
        const log: ExerciseLog = {
          id: createId('log'),
          exerciseId,
          sets: [],
        };
        return { ...s, exercises: [...s.exercises, log] };
      });
    },
    [mutateActive],
  );

  const removeExercise = useCallback(
    (logId: string) => {
      mutateActive((s) => ({
        ...s,
        exercises: s.exercises.filter((l) => l.id !== logId),
      }));
    },
    [mutateActive],
  );

  const addSet = useCallback(
    (logId: string, set: Partial<SetEntry> = {}) => {
      mutateActive((s) => ({
        ...s,
        exercises: s.exercises.map((log) => {
          if (log.id !== logId) return log;
          // Prefill from the previous set for faster logging.
          const prev = log.sets[log.sets.length - 1];
          const newSet: SetEntry = {
            id: createId('set'),
            weight: set.weight ?? prev?.weight ?? 0,
            reps: set.reps ?? prev?.reps ?? 0,
            rpe: set.rpe ?? prev?.rpe,
            restSeconds: set.restSeconds ?? prev?.restSeconds,
            isWarmup: set.isWarmup ?? false,
            completed: set.completed ?? true,
          };
          return { ...log, sets: [...log.sets, newSet] };
        }),
      }));
    },
    [mutateActive],
  );

  const updateSet = useCallback(
    (logId: string, setId: string, patch: Partial<SetEntry>) => {
      mutateActive((s) => ({
        ...s,
        exercises: s.exercises.map((log) =>
          log.id !== logId
            ? log
            : {
                ...log,
                sets: log.sets.map((st) =>
                  st.id === setId ? { ...st, ...patch } : st,
                ),
              },
        ),
      }));
    },
    [mutateActive],
  );

  const removeSet = useCallback(
    (logId: string, setId: string) => {
      mutateActive((s) => ({
        ...s,
        exercises: s.exercises.map((log) =>
          log.id !== logId
            ? log
            : { ...log, sets: log.sets.filter((st) => st.id !== setId) },
        ),
      }));
    },
    [mutateActive],
  );

  const updateProfile = useCallback((patch: Partial<UserProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      void saveProfile(next);
      return next;
    });
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      loading,
      sessions,
      profile,
      activeSession,
      startWorkout,
      cancelWorkout,
      finishWorkout,
      addExercise,
      removeExercise,
      addSet,
      updateSet,
      removeSet,
      updateProfile,
    }),
    [
      loading,
      sessions,
      profile,
      activeSession,
      startWorkout,
      cancelWorkout,
      finishWorkout,
      addExercise,
      removeExercise,
      addSet,
      updateSet,
      removeSet,
      updateProfile,
    ],
  );

  return (
    <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
  );
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within a StoreProvider');
  return ctx;
}
