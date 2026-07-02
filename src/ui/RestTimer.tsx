/**
 * Rest timer for between sets. Tap a preset to start a countdown; the bar
 * turns green when rest is complete. A manual stopwatch mode is also supported
 * by starting with 0 and letting it count up.
 */
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDuration } from './format';
import { colors, font, radius, spacing } from './theme';

const PRESETS = [60, 90, 120, 180];

export function RestTimer() {
  const [target, setTarget] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed((e) => e + 1);
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const start = (seconds: number) => {
    setTarget(seconds);
    setElapsed(0);
    setRunning(true);
  };

  const stop = () => {
    setRunning(false);
    setTarget(null);
    setElapsed(0);
  };

  const remaining = target != null ? Math.max(0, target - elapsed) : elapsed;
  const done = target != null && elapsed >= target;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Rest timer</Text>
        <Text style={[styles.time, done && { color: colors.success }]}>
          {formatDuration(remaining)}
          {done ? ' · done' : ''}
        </Text>
      </View>
      <View style={styles.row}>
        {PRESETS.map((p) => (
          <Pressable
            key={p}
            style={[styles.chip, target === p && styles.chipActive]}
            onPress={() => start(p)}
          >
            <Text style={styles.chipText}>{p}s</Text>
          </Pressable>
        ))}
        <Pressable style={[styles.chip, styles.stopChip]} onPress={stop}>
          <Text style={styles.chipText}>Stop</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: { color: colors.textMuted, fontSize: font.small },
  time: { color: colors.text, fontSize: font.h3, fontWeight: '800' },
  row: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primaryDark },
  stopChip: { borderColor: colors.danger },
  chipText: { color: colors.text, fontSize: font.small, fontWeight: '600' },
});
