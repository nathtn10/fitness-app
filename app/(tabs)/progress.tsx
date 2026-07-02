import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getExercise } from '../../src/domain/exercises';
import { computePersonalRecords } from '../../src/domain/strength/personalRecords';
import {
  oneRepMaxTrend,
  weeklyVolume,
} from '../../src/domain/strength/progress';
import { useStore } from '../../src/state/store';
import { BarChart } from '../../src/ui/BarChart';
import {
  Body,
  Card,
  H1,
  H2,
  Loading,
  Screen,
} from '../../src/ui/components';
import { formatVolume, formatWeight } from '../../src/ui/format';
import { colors, font, radius, spacing } from '../../src/ui/theme';

export default function ProgressScreen() {
  const { loading, sessions, profile } = useStore();

  const prs = useMemo(
    () => [...computePersonalRecords(sessions).values()],
    [sessions],
  );
  const volume = useMemo(() => weeklyVolume(sessions), [sessions]);

  // Exercises that have at least one logged set, for the 1RM trend selector.
  const trackedExercises = useMemo(() => {
    const ids = new Set<string>();
    for (const s of sessions) for (const l of s.exercises) ids.add(l.exerciseId);
    return [...ids];
  }, [sessions]);

  const [selected, setSelected] = useState<string | null>(null);
  const activeExercise = selected ?? trackedExercises[0] ?? null;
  const trend = useMemo(
    () => (activeExercise ? oneRepMaxTrend(sessions, activeExercise) : []),
    [sessions, activeExercise],
  );

  if (loading) return <Loading />;

  if (sessions.length === 0) {
    return (
      <Screen>
        <H1>Progress</H1>
        <Body muted>
          Log a few workouts and your personal records, weekly volume, and
          strength trends will show up here.
        </Body>
      </Screen>
    );
  }

  return (
    <Screen>
      <H1>Progress</H1>

      <Card>
        <H2>Weekly volume</H2>
        <BarChart
          data={volume.slice(-8).map((p) => ({
            label: p.week.split('-W')[1] ?? p.week,
            value: p.volume,
          }))}
        />
        <Body muted>
          Last {Math.min(8, volume.length)} weeks · total this week{' '}
          {formatVolume(volume[volume.length - 1]?.volume ?? 0, profile.unit)}
        </Body>
      </Card>

      <Card>
        <H2>Estimated 1RM trend</H2>
        <View style={styles.chips}>
          {trackedExercises.map((id) => (
            <Pressable
              key={id}
              style={[
                styles.chip,
                activeExercise === id && styles.chipActive,
              ]}
              onPress={() => setSelected(id)}
            >
              <Text style={styles.chipText}>
                {getExercise(id)?.name ?? id}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={{ height: spacing.sm }} />
        <BarChart
          color={colors.accent}
          data={trend.slice(-10).map((p) => ({
            label: p.date.slice(5),
            value: p.estimatedOneRepMax,
          }))}
        />
        {trend.length > 0 ? (
          <Body muted>
            Best estimated 1RM:{' '}
            {formatWeight(
              Math.max(...trend.map((p) => p.estimatedOneRepMax)),
              profile.unit,
            )}
          </Body>
        ) : null}
      </Card>

      <H2>Personal records</H2>
      {prs
        .filter((p) => p.bestEstimatedOneRepMax > 0)
        .sort((a, b) => b.bestEstimatedOneRepMax - a.bestEstimatedOneRepMax)
        .map((p) => (
          <Card key={p.exerciseId}>
            <Body>{getExercise(p.exerciseId)?.name ?? p.exerciseId}</Body>
            <View style={styles.prRow}>
              <PRStat
                label="Est. 1RM"
                value={formatWeight(p.bestEstimatedOneRepMax, profile.unit)}
              />
              <PRStat
                label="Heaviest"
                value={formatWeight(p.heaviestWeight, profile.unit)}
              />
              <PRStat
                label="Best set vol."
                value={formatVolume(p.bestSetVolume, profile.unit)}
              />
            </View>
          </Card>
        ))}
    </Screen>
  );
}

function PRStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.prStat}>
      <Text style={styles.prValue}>{value}</Text>
      <Text style={styles.prLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { borderColor: colors.accent, backgroundColor: colors.surface },
  chipText: { color: colors.text, fontSize: font.small },
  prRow: { flexDirection: 'row', marginTop: spacing.sm, gap: spacing.sm },
  prStat: { flex: 1 },
  prValue: { color: colors.text, fontSize: font.h3, fontWeight: '700' },
  prLabel: { color: colors.textMuted, fontSize: font.tiny, marginTop: 2 },
});
