/**
 * Side-by-side progress-photo comparison with measured, honest deltas: days
 * elapsed, bodyweight change, and estimated-1RM movement on lifts trained in
 * the span (no pixel-level "AI body analysis").
 */
import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { comparePhotos } from '../src/domain/photos/compare';
import { getExercise } from '../src/domain/exercises';
import { usePhotos } from '../src/state/photosStore';
import { useStore } from '../src/state/store';
import { Body, Card, H1, H2, Loading, Screen } from '../src/ui/components';
import { formatRelativeDate } from '../src/ui/format';
import { colors, font, spacing } from '../src/ui/theme';

export default function PhotoCompareScreen() {
  const { a, b } = useLocalSearchParams<{ a: string; b: string }>();
  const { loading, photos } = usePhotos();
  const { sessions, profile } = useStore();

  const photoA = photos.find((p) => p.id === a);
  const photoB = photos.find((p) => p.id === b);

  const comparison = useMemo(
    () => (photoA && photoB ? comparePhotos(photoA, photoB, sessions) : null),
    [photoA, photoB, sessions],
  );

  if (loading) return <Loading />;
  if (!photoA || !photoB || !comparison) {
    return (
      <Screen>
        <H1>Compare</H1>
        <Body muted>Select two photos to compare.</Body>
      </Screen>
    );
  }

  // Order earlier -> later for display.
  const [before, after] =
    new Date(photoA.takenAt).getTime() <= new Date(photoB.takenAt).getTime()
      ? [photoA, photoB]
      : [photoB, photoA];

  return (
    <Screen>
      <H1>Compare</H1>

      <View style={styles.pair}>
        <View style={styles.col}>
          <Image source={{ uri: before.uri }} style={styles.image} />
          <Text style={styles.caption}>{formatRelativeDate(before.takenAt)}</Text>
          {before.bodyweightKg ? (
            <Text style={styles.captionMuted}>{before.bodyweightKg} kg</Text>
          ) : null}
        </View>
        <View style={styles.col}>
          <Image source={{ uri: after.uri }} style={styles.image} />
          <Text style={styles.caption}>{formatRelativeDate(after.takenAt)}</Text>
          {after.bodyweightKg ? (
            <Text style={styles.captionMuted}>{after.bodyweightKg} kg</Text>
          ) : null}
        </View>
      </View>

      <Card>
        <H2>What changed</H2>
        <Body>
          {comparison.days} day{comparison.days === 1 ? '' : 's'} between these
          photos.
        </Body>
        {comparison.weightDeltaKg != null ? (
          <Body>
            Bodyweight{' '}
            {comparison.weightDeltaKg >= 0
              ? `+${comparison.weightDeltaKg}`
              : comparison.weightDeltaKg}{' '}
            kg
          </Body>
        ) : (
          <Body muted>Add bodyweight to photos to see weight change.</Body>
        )}
      </Card>

      {comparison.strengthChanges.length > 0 ? (
        <Card>
          <H2>Strength change (est. 1RM)</H2>
          {comparison.strengthChanges.map((c) => (
            <View key={c.exerciseId} style={styles.changeRow}>
              <Text style={styles.changeName}>
                {getExercise(c.exerciseId)?.name ?? c.exerciseId}
              </Text>
              <Text
                style={[
                  styles.changeDelta,
                  { color: c.delta >= 0 ? colors.success : colors.danger },
                ]}
              >
                {c.delta >= 0 ? '+' : ''}
                {c.delta} {profile.unit}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pair: { flexDirection: 'row', gap: spacing.sm, marginVertical: spacing.md },
  col: { flex: 1 },
  image: {
    width: '100%',
    height: 260,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
  },
  caption: { color: colors.text, fontSize: font.small, marginTop: spacing.xs },
  captionMuted: { color: colors.textMuted, fontSize: font.tiny },
  changeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  changeName: { color: colors.text, fontSize: font.body },
  changeDelta: { fontSize: font.body, fontWeight: '700' },
});
