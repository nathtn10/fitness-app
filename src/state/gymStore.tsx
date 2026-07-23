/**
 * Gym detection state: saved gyms, visit history, live check-in status, and
 * settings. Kept in its own provider (separate from the workout store) so each
 * domain stays independently readable and testable.
 *
 * When detection is enabled and at least one gym is saved, this watches
 * foreground location and runs the pure geofence state machine on each reading,
 * recording arrivals/departures as visits. All detection is on-device.
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
import {
  DEFAULT_CHECK_IN,
  DEFAULT_GYM_SETTINGS,
  loadCheckInState,
  loadGymSettings,
  loadGymVisits,
  loadGyms,
  saveCheckInState,
  saveGymSettings,
  saveGymVisits,
  saveGyms,
  type GymSettings,
} from '../data/gymRepository';
import { advanceGeofence } from '../domain/gym/geofence';
import type {
  GeoCoordinate,
  Gym,
  GymCheckInState,
  GymVisit,
} from '../domain/gym/types';
import { onSyncApplied } from '../lib/events';
import { createId } from '../lib/id';
import { LIMITS, sanitizeText } from '../lib/sanitize';
import {
  getCurrentCoordinate,
  requestForegroundPermission,
  watchCoordinate,
  type LocationSubscription,
} from '../services/location';

interface GymStoreValue {
  loading: boolean;
  gyms: Gym[];
  visits: GymVisit[];
  checkIn: GymCheckInState;
  settings: GymSettings;

  addGymHere: (name: string, radiusMeters?: number) => Promise<Gym | null>;
  removeGym: (gymId: string) => void;
  setDetectionEnabled: (enabled: boolean) => Promise<boolean>;
  /** Take a one-off location reading and update check-in status. */
  refreshNow: () => Promise<void>;
  /** Re-read gyms & visits from storage (e.g. after a sync pull). */
  reload: () => Promise<void>;
}

const GymContext = createContext<GymStoreValue | null>(null);

export function GymProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [gyms, setGymsState] = useState<Gym[]>([]);
  const [visits, setVisitsState] = useState<GymVisit[]>([]);
  const [checkIn, setCheckInState] = useState<GymCheckInState>(DEFAULT_CHECK_IN);
  const [settings, setSettingsState] = useState<GymSettings>(
    DEFAULT_GYM_SETTINGS,
  );

  // Refs mirror state for use inside the async location callback, which would
  // otherwise capture stale values.
  const gymsRef = useRef(gyms);
  const checkInRef = useRef(checkIn);
  const subRef = useRef<LocationSubscription | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [g, v, c, s] = await Promise.all([
        loadGyms(),
        loadGymVisits(),
        loadCheckInState(),
        loadGymSettings(),
      ]);
      if (cancelled) return;
      setGymsState(g);
      gymsRef.current = g;
      setVisitsState(v);
      setCheckInState(c);
      checkInRef.current = c;
      setSettingsState(s);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const reload = useCallback(async () => {
    const [g, v] = await Promise.all([loadGyms(), loadGymVisits()]);
    setGymsState(g);
    gymsRef.current = g;
    setVisitsState(v);
  }, []);

  // Re-read after a sync pull writes new data to storage.
  useEffect(() => onSyncApplied(() => void reload()), [reload]);

  const setGyms = useCallback((next: Gym[]) => {
    setGymsState(next);
    gymsRef.current = next;
    void saveGyms(next);
  }, []);

  const setCheckIn = useCallback((next: GymCheckInState) => {
    setCheckInState(next);
    checkInRef.current = next;
    void saveCheckInState(next);
  }, []);

  const appendVisit = useCallback((visit: GymVisit) => {
    setVisitsState((prev) => {
      const next = [visit, ...prev];
      void saveGymVisits(next);
      return next;
    });
  }, []);

  const closeVisit = useCallback((gymId: string, departedAt: string) => {
    setVisitsState((prev) => {
      const idx = prev.findIndex(
        (v) => v.gymId === gymId && !v.departedAt,
      );
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], departedAt };
      void saveGymVisits(next);
      return next;
    });
  }, []);

  const processCoordinate = useCallback(
    (coord: GeoCoordinate, now = new Date()) => {
      const result = advanceGeofence(
        coord,
        gymsRef.current,
        checkInRef.current,
        now,
      );
      for (const event of result.events) {
        if (event.type === 'arrived') {
          appendVisit({
            id: createId('visit'),
            gymId: event.gymId,
            arrivedAt: event.at,
          });
        } else {
          closeVisit(event.gymId, event.at);
        }
      }
      setCheckIn(result.state);
    },
    [appendVisit, closeVisit, setCheckIn],
  );

  // Start/stop the foreground watcher based on the detection setting.
  useEffect(() => {
    let active = true;
    const stop = () => {
      subRef.current?.remove();
      subRef.current = null;
    };

    if (settings.detectionEnabled && gyms.length > 0) {
      (async () => {
        const sub = await watchCoordinate((coord) => processCoordinate(coord));
        if (!active) {
          sub?.remove();
          return;
        }
        subRef.current = sub;
      })();
    } else {
      stop();
    }

    return () => {
      active = false;
      stop();
    };
  }, [settings.detectionEnabled, gyms.length, processCoordinate]);

  const addGymHere = useCallback(
    async (name: string, radiusMeters = 120): Promise<Gym | null> => {
      const granted = await requestForegroundPermission();
      if (!granted) return null;
      const coord = await getCurrentCoordinate();
      if (!coord) return null;
      const gym: Gym = {
        id: createId('gym'),
        name: sanitizeText(name, LIMITS.displayName) || 'My Gym',
        latitude: coord.latitude,
        longitude: coord.longitude,
        radiusMeters: Math.min(1000, Math.max(30, radiusMeters)),
      };
      setGyms([...gymsRef.current, gym]);
      return gym;
    },
    [setGyms],
  );

  const removeGym = useCallback(
    (gymId: string) => {
      setGyms(gymsRef.current.filter((g) => g.id !== gymId));
    },
    [setGyms],
  );

  const setDetectionEnabled = useCallback(
    async (enabled: boolean): Promise<boolean> => {
      if (enabled) {
        const granted = await requestForegroundPermission();
        if (!granted) return false;
      }
      const next = { ...settings, detectionEnabled: enabled };
      setSettingsState(next);
      void saveGymSettings(next);
      return true;
    },
    [settings],
  );

  const refreshNow = useCallback(async () => {
    const granted = await requestForegroundPermission();
    if (!granted) return;
    const coord = await getCurrentCoordinate();
    if (coord) processCoordinate(coord);
  }, [processCoordinate]);

  const value = useMemo<GymStoreValue>(
    () => ({
      loading,
      gyms,
      visits,
      checkIn,
      settings,
      addGymHere,
      removeGym,
      setDetectionEnabled,
      refreshNow,
      reload,
    }),
    [
      loading,
      gyms,
      visits,
      checkIn,
      settings,
      addGymHere,
      removeGym,
      setDetectionEnabled,
      refreshNow,
      reload,
    ],
  );

  return <GymContext.Provider value={value}>{children}</GymContext.Provider>;
}

export function useGym(): GymStoreValue {
  const ctx = useContext(GymContext);
  if (!ctx) throw new Error('useGym must be used within a GymProvider');
  return ctx;
}
