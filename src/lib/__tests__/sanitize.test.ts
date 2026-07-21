import { LIMITS, sanitizeText } from '../sanitize';

describe('sanitizeText', () => {
  it('trims surrounding whitespace', () => {
    expect(sanitizeText('  Push Day  ', 60)).toBe('Push Day');
  });

  it('enforces the max length', () => {
    expect(sanitizeText('x'.repeat(100), 10)).toHaveLength(10);
  });

  it('strips ASCII control characters but keeps normal text', () => {
    const withControls = `Leg${String.fromCharCode(0)}${String.fromCharCode(
      7,
    )} Day${String.fromCharCode(127)}`;
    expect(sanitizeText(withControls, 60)).toBe('Leg Day');
  });

  it('preserves emoji and unicode', () => {
    expect(sanitizeText('Chest 💪 день', 60)).toBe('Chest 💪 день');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(sanitizeText('   \t  ', 60)).toBe('');
  });

  it('exposes sane default limits', () => {
    expect(LIMITS.displayName).toBeGreaterThan(0);
    expect(LIMITS.workoutName).toBeGreaterThan(0);
  });
});
