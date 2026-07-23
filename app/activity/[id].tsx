/**
 * Activity detail: route sketch, full metrics, and per-kilometer splits.
 */
import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { computeSplits } from '../../src/domain/cardio/metrics';
import { useCardio } from '../../src/state/cardioStore';
import { RoutePreview } from '../../src/ui/RoutePreview';
import { Body, Card, H1, H2, Loading, Screen } from '../../src/ui/components';
import {
  ACTIVITY_EMOJI,
  ACTIVITY_LABEL,
  formatClock,
  formatDistance,
  formatPace,
  formatSpeed,
} from '../../src/ui/cardioFormat';
import { formatRelativeDate } from '../../src/ui/format';
import { colors, font, spacing } from '../../src/ui/theme';

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { loading, activities } = useCardio();
  const activity = activities.find((a) => a.id === id);

  const splits = useMemo(
    () => (activity ? computeSplits(activity.points, 1000) : []),
    [activity],
  );

  if (loading) return <Loading />;
  if (!activity) {
    return (
      <Screen>
        <H1>Activity</H1>
        <Body muted>This activity could not be found.</Body>
      </Screen>
    );
  }

  const m = activity.metrics;

  return (
    <Screen>
      <H1>
        {ACTIVITY_EMOJI[activity.type]} {activity.title ?? ACTIVITY_LABEL[activity.type]}
      </H1>
      <Body muted>
        {formatRelativeDate(activity.startedAt)} ·{' '}
        {new Date(activity.startedAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Body>

      <View style={{ height: spacing.md }} />
      <RoutePreview points={activity.points} />
      <View style={{ height: spacing.md }} />

      <Card>
        <View style={styles.grid}>
          <Metric label="Distance" value={formatDistance(m.distanceMeters)} />
          <Metric label="Moving time" value={formatClock(m.movingSeconds)} />
          <Metric label="Avg pace" value={formatPace(m.avgPaceSecPerKm)} />
          <Metric label="Avg speed" value={formatSpeed(m.avgSpeedKmh)} />
          <Metric
            label="Elevation"
            value={`${Math.round(m.elevationGainMeters)} m`}
          />
          <Metric label="Calories" value={`${m.calories}`} />
        </View>
      </Card>

      {splits.length > 0 ? (
        <>
          <H2>Splits</H2>
          <Card>
            {splits.map((s) => (
              <View key={s.index} style={styles.splitRow}>
                <Text style={styles.splitKm}>{s.index}</Text>
                <Text style={styles.splitPace}>{formatPace(s.paceSecPerKm)}</Text>
                <Text style={styles.splitDist}>
                  {(s.distanceMeters / 1000).toFixed(2)} km
                </Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metric: { flexBasis: '30%', flexGrow: 1 },
  metricValue: { color: colors.text, fontSize: font.h3, fontWeight: '700' },
  metricLabel: { color: colors.textMuted, fontSize: font.tiny, marginTop: 2 },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  splitKm: { color: colors.textMuted, width: 32, fontSize: font.small },
  splitPace: {
    flex: 1,
    color: colors.text,
    fontSize: font.body,
    fontWeight: '600',
  },
  splitDist: { color: colors.textMuted, fontSize: font.small },
});
