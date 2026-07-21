/**
 * Cardio hub: start a GPS activity, and browse records, achievements, and
 * history. Reached from Home and More (kept off the bottom tab bar to avoid
 * crowding it while the section set grows).
 */
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  computeAchievements,
  computeCardioRecords,
} from '../src/domain/cardio/records';
import type { ActivityType } from '../src/domain/cardio/types';
import { useCardio } from '../src/state/cardioStore';
import {
  Body,
  Card,
  H1,
  H2,
  Loading,
  Screen,
} from '../src/ui/components';
import {
  ACTIVITY_EMOJI,
  ACTIVITY_LABEL,
  formatClock,
  formatDistance,
  formatPace,
} from '../src/ui/cardioFormat';
import { formatRelativeDate } from '../src/ui/format';
import { colors, font, radius, spacing } from '../src/ui/theme';

const TYPES: ActivityType[] = ['run', 'ride', 'walk', 'hike'];

export default function CardioScreen() {
  const router = useRouter();
  const { loading, activities, recording, startActivity } = useCardio();

  const records = useMemo(
    () => [...computeCardioRecords(activities).entries()],
    [activities],
  );
  const achievements = useMemo(
    () => computeAchievements(activities),
    [activities],
  );

  if (loading) return <Loading />;

  const onStart = async (type: ActivityType) => {
    if (recording) {
      router.push('/record');
      return;
    }
    const ok = await startActivity(type);
    if (!ok) {
      Alert.alert(
        'Location needed',
        'We need location permission to record your activity.',
      );
      return;
    }
    router.push('/record');
  };

  return (
    <Screen>
      <H1>Activities</H1>

      {recording ? (
        <Card>
          <H2>Recording in progress</H2>
          <Body muted>
            {ACTIVITY_EMOJI[recording.type]} {ACTIVITY_LABEL[recording.type]} ·{' '}
            {recording.points.length} points
          </Body>
          <Pressable style={styles.resume} onPress={() => router.push('/record')}>
            <Text style={styles.resumeText}>Resume</Text>
          </Pressable>
        </Card>
      ) : (
        <Card>
          <H2>Start an activity</H2>
          <View style={styles.startGrid}>
            {TYPES.map((type) => (
              <Pressable
                key={type}
                style={styles.startTile}
                onPress={() => onStart(type)}
              >
                <Text style={styles.startEmoji}>{ACTIVITY_EMOJI[type]}</Text>
                <Text style={styles.startLabel}>{ACTIVITY_LABEL[type]}</Text>
              </Pressable>
            ))}
          </View>
        </Card>
      )}

      {achievements.length > 0 ? (
        <Card>
          <H2>Achievements</H2>
          {achievements.map((a) => (
            <View key={a.id} style={styles.achievement}>
              <Text style={styles.achievementTitle}>{a.title}</Text>
              <Body muted>{a.detail}</Body>
            </View>
          ))}
        </Card>
      ) : null}

      {records.length > 0 ? (
        <>
          <H2>Personal records</H2>
          {records.map(([type, rec]) => (
            <Card key={type}>
              <Body>
                {ACTIVITY_EMOJI[type]} {ACTIVITY_LABEL[type]}
              </Body>
              <View style={styles.recordRow}>
                <Stat
                  label="Longest"
                  value={formatDistance(rec.longestDistanceMeters)}
                />
                <Stat
                  label="Best pace"
                  value={formatPace(rec.bestPaceSecPerKm)}
                />
                <Stat
                  label="Max climb"
                  value={`${Math.round(rec.mostElevationMeters)} m`}
                />
              </View>
            </Card>
          ))}
        </>
      ) : null}

      <H2>History</H2>
      {activities.length === 0 ? (
        <Body muted>No activities yet. Start one above to begin tracking.</Body>
      ) : (
        activities.map((a) => (
          <Pressable key={a.id} onPress={() => router.push(`/activity/${a.id}`)}>
            <Card>
              <Body>
                {ACTIVITY_EMOJI[a.type]} {a.title ?? ACTIVITY_LABEL[a.type]}
              </Body>
              <Body muted>
                {formatRelativeDate(a.startedAt)} ·{' '}
                {formatDistance(a.metrics.distanceMeters)} ·{' '}
                {formatClock(a.metrics.movingSeconds)} ·{' '}
                {formatPace(a.metrics.avgPaceSecPerKm)}
              </Body>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  startGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  startTile: {
    flexBasis: '47%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
  },
  startEmoji: { fontSize: 32 },
  startLabel: {
    color: colors.text,
    fontSize: font.body,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  resume: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  resumeText: { color: '#fff', fontWeight: '700', fontSize: font.body },
  achievement: { marginBottom: spacing.sm },
  achievementTitle: {
    color: colors.text,
    fontSize: font.body,
    fontWeight: '700',
  },
  recordRow: { flexDirection: 'row', marginTop: spacing.sm, gap: spacing.sm },
  stat: { flex: 1 },
  statValue: { color: colors.text, fontSize: font.h3, fontWeight: '700' },
  statLabel: { color: colors.textMuted, fontSize: font.tiny, marginTop: 2 },
});
