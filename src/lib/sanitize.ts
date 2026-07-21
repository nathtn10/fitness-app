/**
 * Shared input sanitization for free-text fields.
 *
 * All user-entered text (profile name, workout name, and later: notes, food
 * descriptions, voice-log transcripts, social captions) should pass through
 * here before it's stored. This keeps a single place to enforce length caps
 * and strip control characters, which matters more once this data leaves the
 * device: synced to a backend, rendered in a social feed, or fed into an AI
 * prompt, where unbounded or malformed text becomes a real attack surface
 * (storage bloat, rendering breakage, prompt injection).
 */

/** Strips ASCII control characters (0x00-0x1F, 0x7F), keeping newline/tab. */
function stripControlChars(raw: string): string {
  let out = '';
  for (const ch of raw) {
    const code = ch.codePointAt(0) ?? 0;
    const isControl = (code <= 0x1f && ch !== '\n' && ch !== '\t') || code === 0x7f;
    if (!isControl) out += ch;
  }
  return out;
}

export function sanitizeText(raw: string, maxLength: number): string {
  return stripControlChars(raw).trim().slice(0, maxLength);
}

export const LIMITS = {
  displayName: 40,
  workoutName: 60,
  notes: 500,
} as const;
