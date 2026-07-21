/**
 * One editable row (weight + reps + done + delete) within the workout logger.
 *
 * Input is clamped to a sane range before it reaches the store. This isn't
 * just UX polish — unbounded numbers here would corrupt PRs, volume totals,
 * and (later) anything synced to a shared feed, so we validate at the point
 * of entry rather than trusting the raw text field.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { SetEntry } from '../domain/types';
import { colors, font, radius, spacing } from './theme';

const MAX_WEIGHT = 2000; // kg or lb — far beyond any real lift, blocks garbage input
const MAX_REPS = 999;

function clampNumber(raw: string, max: number): number {
  const n = parseFloat(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, max);
}

export function SetRow({
  index,
  set,
  onChange,
  onDelete,
}: {
  index: number;
  set: SetEntry;
  onChange: (patch: Partial<SetEntry>) => void;
  onDelete: () => void;
}) {
  const [weight, setWeight] = useState(set.weight ? String(set.weight) : '');
  const [reps, setReps] = useState(set.reps ? String(set.reps) : '');

  return (
    <View style={[styles.setRow, set.isWarmup && styles.warmupRow]}>
      <Text style={[styles.setCol, styles.colIdx, styles.setText]}>
        {set.isWarmup ? 'W' : index}
      </Text>
      <TextInput
        style={[styles.setCol, styles.colInput, styles.input]}
        keyboardType="numeric"
        value={weight}
        placeholder="0"
        placeholderTextColor={colors.textMuted}
        maxLength={8}
        onChangeText={(t) => {
          setWeight(t);
          onChange({ weight: clampNumber(t, MAX_WEIGHT) });
        }}
      />
      <TextInput
        style={[styles.setCol, styles.colInput, styles.input]}
        keyboardType="numeric"
        value={reps}
        placeholder="0"
        placeholderTextColor={colors.textMuted}
        maxLength={4}
        onChangeText={(t) => {
          setReps(t);
          onChange({ reps: Math.round(clampNumber(t, MAX_REPS)) });
        }}
      />
      <Pressable
        style={[styles.setCol, styles.colDone]}
        onPress={() => onChange({ completed: !set.completed })}
      >
        <Text
          style={[
            styles.check,
            { color: set.completed ? colors.success : colors.textMuted },
          ]}
        >
          {set.completed ? '✓' : '○'}
        </Text>
      </Pressable>
      <Pressable style={[styles.setCol, styles.colDel]} onPress={onDelete}>
        <Text style={styles.remove}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  warmupRow: { opacity: 0.8 },
  setCol: {},
  colIdx: { width: 28, textAlign: 'center', color: colors.text },
  colInput: { flex: 1, marginHorizontal: spacing.xs },
  colDone: { width: 40, alignItems: 'center' },
  colDel: { width: 28, alignItems: 'center' },
  setText: { color: colors.textMuted, fontSize: font.small },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    color: colors.text,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    textAlign: 'center',
    fontSize: font.body,
  },
  check: { fontSize: 20, fontWeight: '800' },
  remove: { color: colors.danger, fontSize: font.small, fontWeight: '600' },
});
