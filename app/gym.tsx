/**
 * Gym detail screen: enable auto-detection, manage saved gyms, and view live
 * check-in status, busyness, and visit history. Reached from the Home dashboard
 * and the More tab (gym detection is ambient, so it isn't a bottom tab).
 */
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  busynessByHour,
  busynessLabel,
  estimateBusyness,
} from '../src/domain/gym/busyness';
import { useGym } from '../src/state/gymStore';
import { BarChart } from '../src/ui/BarChart';
import {
  Body,
  Button,
  Card,
  H1,
  H2,
  Loading,
  Screen,
} from '../src/ui/components';
import { formatRelativeDate } from '../src/ui/format';
import { LIMITS } from '../src/lib/sanitize';
import { colors, font, radius, spacing } from '../src/ui/theme';

export default function GymScreen() {
  const {
    loading,
    gyms,
    visits,
    checkIn,
    settings,
    addGymHere,
    removeGym,
    setDetectionEnabled,
    refreshNow,
  } = useGym();
  const [name, setName] = useState('');

  const now = new Date();
  const currentGym = gyms.find((g) => g.id === checkIn.currentGymId) ?? null;

  // Busyness for the currently-relevant gym (checked-in, else first saved).
  const focusGym = currentGym ?? gyms[0] ?? null;
  const focusVisits = useMemo(
    () => (focusGym ? visits.filter((v) => v.gymId === focusGym.id) : []),
    [visits, focusGym],
  );
  const busyness = focusGym ? estimateBusyness(focusVisits, now) : null;
  const hourly = useMemo(
    () => (focusGym ? busynessByHour(focusVisits, now.getDay()) : []),
    [focusVisits, focusGym, now],
  );

  if (loading) return <Loading />;

  const handleAdd = async () => {
    const gym = await addGymHere(name);
    if (!gym) {
      Alert.alert(
        'Location needed',
        'We need location permission and a GPS fix to save your gym here.',
      );
      return;
    }
    setName('');
  };

  const handleToggle = async () => {
    const ok = await setDetectionEnabled(!settings.detectionEnabled);
    if (!ok) {
      Alert.alert(
        'Permission needed',
        'Enable location permission to use gym auto-detect.',
      );
    }
  };

  return (
    <Screen>
      <H1>Gym</H1>

      {/* Live status */}
      <Card>
        <H2>Status</H2>
        {currentGym ? (
          <>
            <Body>📍 You&apos;re at {currentGym.name}</Body>
            {checkIn.since ? (
              <Body muted>
                Since {new Date(checkIn.since).toLocaleTimeString()}
              </Body>
            ) : null}
          </>
        ) : (
          <Body muted>Not at a gym right now.</Body>
        )}
        <View style={{ height: spacing.md }} />
        <Button title="Check my location now" variant="ghost" onPress={refreshNow} />
      </Card>

      {/* Auto-detect toggle */}
      <Card>
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <H2>Auto-detect</H2>
            <Body muted>
              Detects check-ins while the app is open, using on-device
              geofencing. Location never leaves your phone.
            </Body>
          </View>
          <Pressable
            style={[styles.switch, settings.detectionEnabled && styles.switchOn]}
            onPress={handleToggle}
          >
            <Text style={styles.switchText}>
              {settings.detectionEnabled ? 'ON' : 'OFF'}
            </Text>
          </Pressable>
        </View>
      </Card>

      {/* Busyness */}
      {focusGym && busyness ? (
        <Card>
          <H2>{focusGym.name} · busyness</H2>
          <Body>{busynessLabel(busyness.level)}</Body>
          <Body muted>
            {busyness.level === 'unknown'
              ? 'Visit a few times and patterns will appear here.'
              : 'Based on your visit history for this day and hour.'}
          </Body>
          {busyness.level !== 'unknown' ? (
            <>
              <View style={{ height: spacing.md }} />
              <BarChart
                color={colors.warning}
                data={hourly
                  .filter((h) => h.hour >= 5 && h.hour <= 23)
                  .map((h) => ({
                    label: h.hour % 3 === 0 ? String(h.hour) : '',
                    value: h.score,
                  }))}
              />
              <Body muted>Typical busyness by hour (today)</Body>
            </>
          ) : null}
        </Card>
      ) : null}

      {/* Saved gyms */}
      <H2>Your gyms</H2>
      <Card>
        <TextInput
          style={styles.input}
          placeholder="Gym name (e.g. Iron Temple)"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
          maxLength={LIMITS.displayName}
        />
        <View style={{ height: spacing.sm }} />
        <Button title="+ Save my current location as a gym" onPress={handleAdd} />
      </Card>

      {gyms.length === 0 ? (
        <Body muted>No gyms saved yet.</Body>
      ) : (
        gyms.map((g) => (
          <Card key={g.id}>
            <View style={styles.gymRow}>
              <View style={{ flex: 1 }}>
                <Body>{g.name}</Body>
                <Body muted>{g.radiusMeters}m radius</Body>
              </View>
              <Pressable onPress={() => removeGym(g.id)}>
                <Text style={styles.remove}>Remove</Text>
              </Pressable>
            </View>
          </Card>
        ))
      )}

      {/* Visit history */}
      {visits.length > 0 ? (
        <>
          <H2>Recent visits</H2>
          {visits.slice(0, 8).map((v) => {
            const gym = gyms.find((g) => g.id === v.gymId);
            return (
              <Card key={v.id}>
                <Body>{gym?.name ?? 'Gym'}</Body>
                <Body muted>
                  {formatRelativeDate(v.arrivedAt, now)} ·{' '}
                  {new Date(v.arrivedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {v.departedAt
                    ? ` – ${new Date(v.departedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`
                    : ' · in progress'}
                </Body>
              </Card>
            );
          })}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  toggleRow: { flexDirection: 'row', alignItems: 'center' },
  switch: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  switchOn: { backgroundColor: colors.success, borderColor: colors.success },
  switchText: { color: colors.text, fontWeight: '800', fontSize: font.small },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: font.body,
  },
  gymRow: { flexDirection: 'row', alignItems: 'center' },
  remove: { color: colors.danger, fontSize: font.small, fontWeight: '600' },
});
