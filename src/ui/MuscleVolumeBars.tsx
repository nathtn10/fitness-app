/** Per-muscle weekly working-set bars vs. target. Reusable across screens. */
import { StyleSheet, Text, View } from 'react-native';
import { muscleGroupLabel } from '../domain/exercises';
import { DEFAULT_WEEKLY_SET_TARGETS } from '../domain/strength/suggestions';
import { ALL_MUSCLE_GROUPS, type MuscleGroup } from '../domain/types';
import { colors, font, radius, spacing } from './theme';

export function MuscleVolumeBars({
  weeklySets,
  targets = {},
}: {
  weeklySets: Partial<Record<MuscleGroup, number>>;
  targets?: Partial<Record<MuscleGroup, number>>;
}) {
  return (
    <View>
      {ALL_MUSCLE_GROUPS.map((group) => {
        const done = weeklySets[group] ?? 0;
        const target = targets[group] ?? DEFAULT_WEEKLY_SET_TARGETS[group];
        const ratio = target > 0 ? Math.min(1, done / target) : 0;
        const barColor =
          ratio >= 0.9
            ? colors.success
            : ratio >= 0.6
              ? colors.warning
              : colors.danger;
        return (
          <View key={group} style={styles.row}>
            <Text style={styles.label}>{muscleGroupLabel(group)}</Text>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: `${ratio * 100}%`, backgroundColor: barColor },
                ]}
              />
            </View>
            <Text style={styles.count}>
              {Math.round(done)}/{target}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.xs },
  label: { color: colors.text, fontSize: font.small, width: 84 },
  track: {
    flex: 1,
    height: 10,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginHorizontal: spacing.sm,
  },
  fill: { height: '100%', borderRadius: radius.pill },
  count: {
    color: colors.textMuted,
    fontSize: font.tiny,
    width: 44,
    textAlign: 'right',
  },
});
