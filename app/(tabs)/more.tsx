import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { WeightUnit } from '../../src/domain/types';
import { LIMITS } from '../../src/lib/sanitize';
import { useStore } from '../../src/state/store';
import {
  Body,
  Card,
  H1,
  H2,
  Loading,
  Screen,
} from '../../src/ui/components';
import { colors, font, radius, spacing } from '../../src/ui/theme';

const ROADMAP: { icon: string; title: string; detail: string }[] = [
  {
    icon: '🏃',
    title: 'Cardio & Outdoor (GPS)',
    detail:
      'Strava-style run/ride tracking: distance, pace, elevation, calories, routes, and personal records. Built on expo-location.',
  },
  {
    icon: '📍',
    title: 'Gym Integration',
    detail:
      'Auto-detect gym check-ins via geofencing and surface busyness insights from crowd data or gym APIs.',
  },
  {
    icon: '👟',
    title: 'Daily Activity',
    detail:
      'Sync steps and active energy from Apple HealthKit and Google Fit, and fold them into your daily goals.',
  },
  {
    icon: '🤝',
    title: 'Social Sharing',
    detail:
      'Optionally share workouts, routes, and achievements with friends and clubs.',
  },
];

export default function MoreScreen() {
  const { loading, profile, updateProfile, sessions } = useStore();
  const [name, setName] = useState(profile.displayName);

  if (loading) return <Loading />;

  const setUnit = (unit: WeightUnit) => updateProfile({ unit });

  return (
    <Screen>
      <H1>More</H1>

      <Card>
        <H2>Profile</H2>
        <Text style={styles.fieldLabel}>Display name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          onBlur={() => updateProfile({ displayName: name.trim() || 'Athlete' })}
          placeholder="Your name"
          placeholderTextColor={colors.textMuted}
          maxLength={LIMITS.displayName}
        />

        <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>
          Weight unit
        </Text>
        <View style={styles.unitRow}>
          {(['kg', 'lb'] as WeightUnit[]).map((u) => (
            <Pressable
              key={u}
              style={[styles.unitChip, profile.unit === u && styles.unitActive]}
              onPress={() => setUnit(u)}
            >
              <Text
                style={[
                  styles.unitText,
                  profile.unit === u && { color: '#fff' },
                ]}
              >
                {u.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <H2>Your data</H2>
        <Body muted>
          {sessions.length} workout{sessions.length === 1 ? '' : 's'} logged and
          stored on this device.
        </Body>
      </Card>

      <H2>Roadmap</H2>
      <Body muted>
        The strength section is live. These sections are designed and coming
        next.
      </Body>
      <View style={{ height: spacing.sm }} />
      {ROADMAP.map((item) => (
        <Card key={item.title}>
          <Text style={styles.roadmapTitle}>
            {item.icon} {item.title}
          </Text>
          <Body muted>{item.detail}</Body>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fieldLabel: {
    color: colors.textMuted,
    fontSize: font.small,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: font.body,
  },
  unitRow: { flexDirection: 'row', gap: spacing.sm },
  unitChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unitActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  unitText: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  roadmapTitle: {
    color: colors.text,
    fontSize: font.h3,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
});
