/** Display formatting for cardio metrics (distance, pace, speed, duration). */
import type { ActivityType } from '../domain/cardio/types';

export function formatDistance(meters: number, imperial = false): string {
  if (imperial) {
    const miles = meters / 1609.344;
    return `${miles.toFixed(2)} mi`;
  }
  const km = meters / 1000;
  return `${km.toFixed(2)} km`;
}

/** Pace as mm:ss per km (or per mile). */
export function formatPace(secPerKm: number, imperial = false): string {
  if (secPerKm <= 0) return '--';
  const secPerUnit = imperial ? secPerKm * 1.609344 : secPerKm;
  const m = Math.floor(secPerUnit / 60);
  const s = Math.round(secPerUnit % 60);
  const unit = imperial ? '/mi' : '/km';
  return `${m}:${String(s).padStart(2, '0')} ${unit}`;
}

export function formatSpeed(kmh: number, imperial = false): string {
  if (imperial) return `${(kmh / 1.609344).toFixed(1)} mph`;
  return `${kmh.toFixed(1)} km/h`;
}

/** Duration as h:mm:ss or m:ss. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export const ACTIVITY_LABEL: Record<ActivityType, string> = {
  run: 'Run',
  ride: 'Ride',
  walk: 'Walk',
  hike: 'Hike',
};

export const ACTIVITY_EMOJI: Record<ActivityType, string> = {
  run: '🏃',
  ride: '🚴',
  walk: '🚶',
  hike: '🥾',
};
