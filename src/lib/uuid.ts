/**
 * UUID v4 generation for sync-safe record ids.
 *
 * Client-generated UUIDs make offline creates idempotent (re-pushing is a no-op
 * upsert) and collision-free across devices — see BACKEND.md § "Data model".
 * Uses expo-crypto's CSPRNG; falls back to a non-cryptographic generator only
 * if the native module is unavailable (e.g. a plain-Node test run).
 */
import * as Crypto from 'expo-crypto';

export function uuidv4(): string {
  try {
    // expo-crypto exposes a spec-compliant randomUUID on supported platforms.
    if (typeof Crypto.randomUUID === 'function') return Crypto.randomUUID();
  } catch {
    // fall through to the polyfill
  }
  return fallbackUuid();
}

/** RFC-4122-shaped v4 uuid using Math.random. Not cryptographically strong. */
function fallbackUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
