/**
 * Persistence for workout sessions and the user profile.
 *
 * Sessions are stored newest-first. This repository is the single source of
 * truth the state store reads from and writes through.
 */
import type { UserProfile, WorkoutSession } from '../domain/types';
import { readJSON, writeJSON } from './storage';

const SESSIONS_KEY = 'fitness.sessions.v1';
const PROFILE_KEY = 'fitness.profile.v1';

export const DEFAULT_PROFILE: UserProfile = {
  displayName: 'Athlete',
  unit: 'kg',
  weeklySetTargets: {},
};

export async function loadSessions(): Promise<WorkoutSession[]> {
  return readJSON<WorkoutSession[]>(SESSIONS_KEY, []);
}

export async function saveSessions(sessions: WorkoutSession[]): Promise<void> {
  await writeJSON(SESSIONS_KEY, sessions);
}

export async function loadProfile(): Promise<UserProfile> {
  return readJSON<UserProfile>(PROFILE_KEY, DEFAULT_PROFILE);
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await writeJSON(PROFILE_KEY, profile);
}
