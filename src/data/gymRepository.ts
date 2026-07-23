/**
 * Persistence for gym detection: saved gyms, visit history, the current
 * check-in state, and detection settings. Kept separate from the workout
 * repository so each domain owns its own storage keys.
 */
import type { Gym, GymCheckInState, GymVisit } from '../domain/gym/types';
import { readJSON, writeJSON } from './storage';

const GYMS_KEY = 'fitness.gyms.v1';
const VISITS_KEY = 'fitness.gymVisits.v1';
const CHECKIN_KEY = 'fitness.gymCheckIn.v1';
const SETTINGS_KEY = 'fitness.gymSettings.v1';

export interface GymSettings {
  /** Whether foreground gym auto-detection is enabled. */
  detectionEnabled: boolean;
}

export const DEFAULT_GYM_SETTINGS: GymSettings = { detectionEnabled: false };
export const DEFAULT_CHECK_IN: GymCheckInState = { currentGymId: null };

export async function loadGyms(): Promise<Gym[]> {
  return readJSON<Gym[]>(GYMS_KEY, []);
}
export async function saveGyms(gyms: Gym[]): Promise<void> {
  await writeJSON(GYMS_KEY, gyms);
}

export async function loadGymVisits(): Promise<GymVisit[]> {
  return readJSON<GymVisit[]>(VISITS_KEY, []);
}
export async function saveGymVisits(visits: GymVisit[]): Promise<void> {
  await writeJSON(VISITS_KEY, visits);
}

export async function loadCheckInState(): Promise<GymCheckInState> {
  return readJSON<GymCheckInState>(CHECKIN_KEY, DEFAULT_CHECK_IN);
}
export async function saveCheckInState(state: GymCheckInState): Promise<void> {
  await writeJSON(CHECKIN_KEY, state);
}

export async function loadGymSettings(): Promise<GymSettings> {
  return readJSON<GymSettings>(SETTINGS_KEY, DEFAULT_GYM_SETTINGS);
}
export async function saveGymSettings(settings: GymSettings): Promise<void> {
  await writeJSON(SETTINGS_KEY, settings);
}
