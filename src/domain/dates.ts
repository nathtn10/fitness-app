/** Small date helpers used by progress aggregation. Pure and timezone-local. */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** ISO date (YYYY-MM-DD) for a timestamp, in local time. */
export function toISODate(timestamp: string | Date): string {
  const d = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * A stable key for the ISO week containing a date (Monday-based).
 * Returns e.g. "2026-W27". Weeks are used to bucket weekly volume.
 */
export function isoWeekKey(timestamp: string | Date): string {
  const d = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp);
  // Copy to UTC midnight to avoid DST edge cases in the arithmetic.
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // nearest Thursday
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
  const week =
    1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * MS_PER_DAY));
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Whole days between two timestamps (a - b), truncated toward zero. */
export function daysBetween(a: string | Date, b: string | Date): number {
  const da = typeof a === 'string' ? new Date(a) : a;
  const db = typeof b === 'string' ? new Date(b) : b;
  return Math.trunc((da.getTime() - db.getTime()) / MS_PER_DAY);
}
