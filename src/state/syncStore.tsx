/**
 * Sync orchestrator (Phase 0).
 *
 * Ties the pure sync engine to the backend adapter and the existing per-domain
 * repositories. `syncNow()` does a pull → merge → reconcile → push cycle for the
 * five synced domains and persists the sidecar sync index + pull cursor.
 *
 * Pull-before-push means a device merges remote changes first, so its push is
 * based on fresh data (mitigating stale overwrites under the adapter's simple
 * upsert). Inert when the backend is disabled or no user is signed in.
 *
 * Note: syncNow writes to the repositories (AsyncStorage); the in-memory domain
 * stores pick up pulled changes on next app launch. Live re-hydration of the
 * stores is a follow-up.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { getApiClient } from '../api/supabaseClient';
import type { ChangeSet } from '../api';
import { loadActivities, saveActivities } from '../data/cardioRepository';
import { loadGymVisits, loadGyms, saveGymVisits, saveGyms } from '../data/gymRepository';
import { loadMeals, saveMeals } from '../data/nutritionRepository';
import { loadSessions, saveSessions } from '../data/repository';
import { readJSON, writeJSON } from '../data/storage';
import {
  markPushed,
  mergeRemote,
  reconcileLocal,
  type RemoteChange,
  type SyncIndex,
} from '../sync/engine';
import { toRemoteChange, toRow } from '../sync/mapping';
import { PHASE0_TABLES, TABLES, type Phase0Table } from '../sync/tables';
import { uuidv4 } from '../lib/uuid';
import { useAuth } from './authStore';

interface RepoBinding {
  // `any[]` avoids function-parameter variance friction between the specific
  // repository types and the generic sync engine; the engine only needs `id`.
  load: () => Promise<any[]>;
  save: (records: any[]) => Promise<void>;
  /** Default visibility for shareable tables; undefined for private-only. */
  visibility?: 'private' | 'followers' | 'public';
}

const REPOS: Record<Phase0Table, RepoBinding> = {
  workoutSessions: { load: loadSessions, save: saveSessions, visibility: 'private' },
  activities: { load: loadActivities, save: saveActivities, visibility: 'private' },
  meals: { load: loadMeals, save: saveMeals, visibility: 'private' },
  gyms: { load: loadGyms, save: saveGyms },
  gymVisits: { load: loadGymVisits, save: saveGymVisits },
};

const SYNC_STATE_KEY = 'fitness.syncState.v1';

interface PersistedSyncState {
  cursor: string | null;
  index: Record<string, SyncIndex>;
  deviceId: string;
}

async function loadSyncState(): Promise<PersistedSyncState> {
  const s = await readJSON<PersistedSyncState | null>(SYNC_STATE_KEY, null);
  if (s) return s;
  return { cursor: null, index: {}, deviceId: uuidv4() };
}

export type SyncStatus = 'idle' | 'syncing' | 'error';

interface SyncStoreValue {
  status: SyncStatus;
  lastSyncedAt: string | null;
  lastError: string | null;
  syncNow: () => Promise<void>;
}

const SyncContext = createContext<SyncStoreValue | null>(null);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { enabled, session } = useAuth();
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const syncNow = useCallback(async () => {
    if (!enabled || !session) return;
    const userId = session.userId;
    setStatus('syncing');
    setLastError(null);
    try {
      const api = getApiClient();
      const state = await loadSyncState();
      const index: Record<string, SyncIndex> = { ...state.index };

      // 1) PULL remote changes and merge into local repositories.
      const pull = await api.pull({ since: state.cursor });
      if (!pull.ok) throw new Error(pull.error.message);
      for (const table of PHASE0_TABLES) {
        const rows = (pull.data.changes as ChangeSet)[table] as
          | Record<string, unknown>[]
          | undefined;
        if (!rows?.length) continue;
        const remote: RemoteChange<{ id: string }>[] = rows.map((r) =>
          toRemoteChange(r as { id: string; updatedAt: string; deletedAt?: string }),
        );
        const local = await REPOS[table].load();
        const merged = mergeRemote(local, index[table] ?? {}, remote);
        index[table] = merged.index;
        await REPOS[table].save(merged.records);
      }

      // 2) RECONCILE local edits and PUSH dirty rows.
      const now = new Date().toISOString();
      const changes: ChangeSet = {};
      const dirtyByTable: Record<string, string[]> = {};
      for (const table of PHASE0_TABLES) {
        const records = await REPOS[table].load();
        const rec = reconcileLocal(records, index[table] ?? {}, now);
        index[table] = rec.index;
        dirtyByTable[table] = rec.dirtyIds;
        if (!rec.dirtyIds.length) continue;
        const byId = new Map(records.map((r) => [r.id, r]));
        const rows = rec.dirtyIds.map((id) => {
          const meta = rec.index[id];
          const record = byId.get(id) ?? { id };
          return toRow(record, meta, userId, REPOS[table].visibility);
        });
        (changes as Record<string, unknown[]>)[table] = rows;
      }

      if (Object.keys(changes).length > 0) {
        const push = await api.push({ changes, deviceId: state.deviceId });
        if (!push.ok) throw new Error(push.error.message);
        for (const table of PHASE0_TABLES) {
          if (dirtyByTable[table]?.length) {
            index[table] = markPushed(index[table], dirtyByTable[table]);
          }
        }
      }

      await writeJSON<PersistedSyncState>(SYNC_STATE_KEY, {
        cursor: pull.data.cursor,
        index,
        deviceId: state.deviceId,
      });
      setLastSyncedAt(now);
      setStatus('idle');
    } catch (e) {
      setLastError(e instanceof Error ? e.message : 'Sync failed');
      setStatus('error');
    }
  }, [enabled, session]);

  const value = useMemo<SyncStoreValue>(
    () => ({ status, lastSyncedAt, lastError, syncNow }),
    [status, lastSyncedAt, lastError, syncNow],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncStoreValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used within a SyncProvider');
  return ctx;
}
