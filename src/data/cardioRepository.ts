/** Persistence for cardio activities. Stored newest-first. */
import type { Activity } from '../domain/cardio/types';
import { readJSON, writeJSON } from './storage';

const ACTIVITIES_KEY = 'fitness.activities.v1';

export async function loadActivities(): Promise<Activity[]> {
  return readJSON<Activity[]>(ACTIVITIES_KEY, []);
}

export async function saveActivities(activities: Activity[]): Promise<void> {
  await writeJSON(ACTIVITIES_KEY, activities);
}
