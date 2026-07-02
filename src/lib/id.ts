/** Lightweight unique-id generator (no native crypto dependency needed). */
let seq = 0;

export function createId(prefix = 'id'): string {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${seq.toString(36)}`;
}
