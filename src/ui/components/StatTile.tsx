import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, spacing } from '../theme';

export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  statTile: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    minWidth: 90,
  },
  statValue: { color: colors.text, fontSize: font.h2, fontWeight: '800' },
  statLabel: { color: colors.textMuted, fontSize: font.small, marginTop: 2 },
  statHint: { color: colors.textMuted, fontSize: font.tiny, marginTop: 2 },
});
