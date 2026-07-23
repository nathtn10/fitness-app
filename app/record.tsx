/**
 * Live activity recording screen. Shows real-time distance, time, pace,
 * elevation, and calories while the GPS watcher records the track. Pause keeps
 * the watcher alive but stops appending points; finish saves and routes to the
 * activity detail with any new PRs celebrated.
 */
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { computeMetrics } from '../src/domain/cardio/metrics';
import { useCardio } from '../src/state/cardioStore';
import { useStore } from '../src/state/store';
import { Body, Button, Card, H2, Screen } from '../src/ui/components';
import {
  ACTIVITY_EMOJI,
  ACTIVITY_LABEL,
  formatClock,
  formatDistance,
  formatPace,
} from '../src/ui/cardioFormat';
import { colors, font, spacing } from '../src/ui/theme';

export default function RecordScreen() {
  const router = useRouter();
  const { recording, pause, resume, discard, finish } = useCardio();
  const { profile } = useStore();
  const [, setTick] = useState(0);

  // Re-render every second so the clock advances even without new GPS points.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const metrics = useMemo(
    () =>
      recording
        ? computeMetrics(recording.points, recording.type, profile.bodyweightKg)
        : null,
    // Recompute as points grow; length is a cheap proxy for the array changing.
    [recording?.points.length, recording?.type, profile.bodyweightKg, recording],
  );

  // Guard against landing here with no active recording.
  useEffect(() => {
    if (!recording) router.replace('/cardio');
  }, [recording, router]);
  if (!recording || !metrics) return null;

  const isPaused = recording.status === 'paused';

  const handleFinish = () => {
    const gps = recording.points.length;
    if (gps < 2) {
      Alert.alert(
        'Not enough data',
        'No GPS points were recorded yet. Discard this activity?',
        [
          { text: 'Keep recording', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              discard();
              router.replace('/cardio');
            },
          },
        ],
      );
      return;
    }
    const prs = finish(profile.bodyweightKg);
    const id = recording.id;
    if (prs.length > 0) {
      Alert.alert(
        '🎉 New records!',
        prs
          .map((p) => {
            const label =
              p.kind === 'longestDistance'
                ? 'Longest distance'
                : p.kind === 'longestDuration'
                  ? 'Longest duration'
                  : p.kind === 'mostElevation'
                    ? 'Most elevation'
                    : 'Fastest pace';
            return `• ${label}`;
          })
          .join('\n'),
        [{ text: 'Nice!', onPress: () => router.replace(`/activity/${id}`) }],
      );
    } else {
      router.replace(`/activity/${id}`);
    }
  };

  const handleDiscard = () => {
    Alert.alert('Discard activity?', 'This recording will not be saved.', [
      { text: 'Keep recording', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          discard();
          router.replace('/cardio');
        },
      },
    ]);
  };

  return (
    <Screen scroll={false}>
      <View style={styles.header}>
        <Text style={styles.type}>
          {ACTIVITY_EMOJI[recording.type]} {ACTIVITY_LABEL[recording.type]}
        </Text>
        {isPaused ? <Text style={styles.paused}>PAUSED</Text> : null}
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroValue}>
          {formatDistance(metrics.distanceMeters)}
        </Text>
        <Text style={styles.heroLabel}>distance</Text>
      </View>

      <View style={styles.grid}>
        <Metric label="Time" value={formatClock(metrics.movingSeconds)} />
        <Metric label="Pace" value={formatPace(metrics.avgPaceSecPerKm)} />
        <Metric
          label="Elevation"
          value={`${Math.round(metrics.elevationGainMeters)} m`}
        />
        <Metric label="Calories" value={`${metrics.calories}`} />
      </View>

      <Card>
        <Body muted>
          {recording.points.length} GPS points · location stays on your device.
        </Body>
      </Card>

      <View style={{ flex: 1 }} />

      {isPaused ? (
        <Button title="▶ Resume" variant="success" onPress={resume} />
      ) : (
        <Button title="⏸ Pause" onPress={pause} />
      )}
      <View style={{ height: spacing.sm }} />
      <Button title="Finish" variant="success" onPress={handleFinish} />
      <View style={{ height: spacing.sm }} />
      <Button title="Discard" variant="danger" onPress={handleDiscard} />
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  type: { color: colors.text, fontSize: font.h2, fontWeight: '800' },
  paused: { color: colors.warning, fontSize: font.body, fontWeight: '800' },
  hero: { alignItems: 'center', marginVertical: spacing.xl },
  heroValue: { color: colors.text, fontSize: 56, fontWeight: '800' },
  heroLabel: { color: colors.textMuted, fontSize: font.body },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metric: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  metricValue: { color: colors.text, fontSize: font.h2, fontWeight: '800' },
  metricLabel: { color: colors.textMuted, fontSize: font.small },
});
