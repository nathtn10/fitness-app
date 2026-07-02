import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { muscleGroupLabel } from '../../src/domain/exercises';
import { muscleGroupSetsInRange } from '../../src/domain/strength/progress';
import { sessionsInLastDays } from '../../src/domain/strength/progress';
import {
  DEFAULT_WEEKLY_SET_TARGETS,
  generateSuggestions,
  type Suggestion,
} from '../../src/domain/strength/suggestions';
import { ALL_MUSCLE_GROUPS } from '../../src/domain/types';
import { useStore } from '../../src/state/store';
import { Body, Card, H1, H2, Loading, Screen } from '../../src/ui/components';
import { colors, font, radius, spacing } from '../../src/ui/theme';

const TYPE_ICON: Record<Suggestion['type'], string> = {
  undertrained: '🎯',
  imbalance: '⚖️',
  stalled: '🧱',
  recovery: '😴',
  wellBalanced: '✅',
};

export default function CoachScreen() {
  const { loading, sessions, profile } = useStore();

  const now = new Date();
  const suggestions = useMemo(
    () => generateSuggestions(sessions, profile, now),
    // now recreated each render is fine; suggestions are cheap to compute.
    [sessions, profile],
  );

  const weeklySets = useMemo(
    () => muscleGroupSetsInRange(sessionsInLastDays(sessions, 7, now)),
    [sessions],
  );

  if (loading) return <Loading />;

  return (
    <Screen>
      <H1>Coach</H1>
      <Body muted>
        Transparent, rule-based guidance from your recent training. No black
        boxes — every tip explains itself.
      </Body>
      <View style={{ height: spacing.lg }} />

      {sessions.length === 0 ? (
        <Body muted>Log a workout to get personalized suggestions.</Body>
      ) : (
        <>
          {suggestions.map((s) => (
            <Card key={s.id}>
              <Text style={styles.title}>
                {TYPE_ICON[s.type]} {s.title}
              </Text>
              <Body muted>{s.detail}</Body>
            </Card>
          ))}

          <View style={{ height: spacing.md }} />
          <H2>Weekly volume by muscle</H2>
          <Card>
            {ALL_MUSCLE_GROUPS.map((group) => {
              const done = weeklySets[group] ?? 0;
              const target =
                profile.weeklySetTargets[group] ??
                DEFAULT_WEEKLY_SET_TARGETS[group];
              const ratio = target > 0 ? Math.min(1, done / target) : 0;
              const barColor =
                ratio >= 0.9
                  ? colors.success
                  : ratio >= 0.6
                    ? colors.warning
                    : colors.danger;
              return (
                <View key={group} style={styles.muscleRow}>
                  <Text style={styles.muscleLabel}>
                    {muscleGroupLabel(group)}
                  </Text>
                  <View style={styles.track}>
                    <View
                      style={[
                        styles.fill,
                        { width: `${ratio * 100}%`, backgroundColor: barColor },
                      ]}
                    />
                  </View>
                  <Text style={styles.muscleCount}>
                    {Math.round(done)}/{target}
                  </Text>
                </View>
              );
            })}
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: font.h3,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  muscleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  muscleLabel: { color: colors.text, fontSize: font.small, width: 84 },
  track: {
    flex: 1,
    height: 10,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginHorizontal: spacing.sm,
  },
  fill: { height: '100%', borderRadius: radius.pill },
  muscleCount: {
    color: colors.textMuted,
    fontSize: font.tiny,
    width: 44,
    textAlign: 'right',
  },
});
