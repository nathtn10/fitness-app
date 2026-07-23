/**
 * Cardio state: activity history plus the live recording session.
 *
 * While recording, the foreground GPS watcher appends track points; pausing
 * simply stops appending (the watcher keeps running so resume is instant).
 * Finishing computes metrics, detects PRs, and persists the activity.
 * Its own provider, separate from workouts and gym.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { loadActivities, saveActivities } from '../data/cardioRepository';
import { computeMetrics } from '../domain/cardio/metrics';
import { detectNewCardioPRs, type NewCardioPR } from '../domain/cardio/records';
import type { Activity, ActivityType, TrackPoint } from '../domain/cardio/types';
import { onSyncApplied } from '../lib/events';
import { createId } from '../lib/id';
import {
  requestForegroundPermission,
  watchTrackPoints,
  type LocationSubscription,
} from '../services/location';

export interface Recording {
  id: string;
  type: ActivityType;
  startedAt: string;
  points: TrackPoint[];
  status: 'recording' | 'paused';
}

interface CardioStoreValue {
  loading: boolean;
  activities: Activity[];
  recording: Recording | null;

  startActivity: (type: ActivityType) => Promise<boolean>;
  pause: () => void;
  resume: () => void;
  discard: () => void;
  finish: (weightKg?: number) => NewCardioPR[];
  /** Re-read activities from storage (e.g. after a sync pull). */
  reload: () => Promise<void>;
}

const CardioContext = createContext<CardioStoreValue | null>(null);

export function CardioProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [recording, setRecording] = useState<Recording | null>(null);

  const recordingRef = useRef<Recording | null>(null);
  const subRef = useRef<LocationSubscription | null>(null);

  const reload = useCallback(async () => {
    const loaded = await loadActivities();
    setActivities(loaded);
    setLoading(false);
  }, []);

  // Re-read after a sync pull writes new data to storage.
  useEffect(() => onSyncApplied(() => void reload()), [reload]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await loadActivities();
      if (cancelled) return;
      setActivities(loaded);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setRec = useCallback((next: Recording | null) => {
    recordingRef.current = next;
    setRecording(next);
  }, []);

  const stopWatch = useCallback(() => {
    subRef.current?.remove();
    subRef.current = null;
  }, []);

  const appendPoint = useCallback((point: TrackPoint) => {
    const current = recordingRef.current;
    if (!current || current.status !== 'recording') return;
    const next: Recording = { ...current, points: [...current.points, point] };
    recordingRef.current = next;
    setRecording(next);
  }, []);

  const startActivity = useCallback(
    async (type: ActivityType): Promise<boolean> => {
      const granted = await requestForegroundPermission();
      if (!granted) return false;
      const rec: Recording = {
        id: createId('activity'),
        type,
        startedAt: new Date().toISOString(),
        points: [],
        status: 'recording',
      };
      setRec(rec);
      const sub = await watchTrackPoints(appendPoint);
      subRef.current = sub;
      if (!sub) {
        // Couldn't start the watcher; abandon the recording.
        setRec(null);
        return false;
      }
      return true;
    },
    [appendPoint, setRec],
  );

  const pause = useCallback(() => {
    const current = recordingRef.current;
    if (!current) return;
    setRec({ ...current, status: 'paused' });
  }, [setRec]);

  const resume = useCallback(() => {
    const current = recordingRef.current;
    if (!current) return;
    setRec({ ...current, status: 'recording' });
  }, [setRec]);

  const discard = useCallback(() => {
    stopWatch();
    setRec(null);
  }, [setRec, stopWatch]);

  const finish = useCallback(
    (weightKg?: number): NewCardioPR[] => {
      const current = recordingRef.current;
      if (!current) return [];
      stopWatch();

      const activity: Activity = {
        id: current.id,
        type: current.type,
        startedAt: current.startedAt,
        endedAt: new Date().toISOString(),
        points: current.points,
        metrics: computeMetrics(current.points, current.type, weightKg),
      };
      const prs = detectNewCardioPRs(activity, activities);
      const next = [activity, ...activities];
      setActivities(next);
      void saveActivities(next);
      setRec(null);
      return prs;
    },
    [activities, setRec, stopWatch],
  );

  // Clean up the watcher if the provider unmounts mid-recording.
  useEffect(() => stopWatch, [stopWatch]);

  const value = useMemo<CardioStoreValue>(
    () => ({
      loading,
      activities,
      recording,
      startActivity,
      pause,
      resume,
      discard,
      finish,
      reload,
    }),
    [loading, activities, recording, startActivity, pause, resume, discard, finish, reload],
  );

  return (
    <CardioContext.Provider value={value}>{children}</CardioContext.Provider>
  );
}

export function useCardio(): CardioStoreValue {
  const ctx = useContext(CardioContext);
  if (!ctx) throw new Error('useCardio must be used within a CardioProvider');
  return ctx;
}
