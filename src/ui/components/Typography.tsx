import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors, font, spacing } from '../theme';

export function H1({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h1}>{children}</Text>;
}

export function H2({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h2}>{children}</Text>;
}

export function Body({
  children,
  muted,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return <Text style={[styles.body, muted && styles.muted]}>{children}</Text>;
}

const styles = StyleSheet.create({
  h1: { color: colors.text, fontSize: font.h1, fontWeight: '800' },
  h2: {
    color: colors.text,
    fontSize: font.h2,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  body: { color: colors.text, fontSize: font.body, lineHeight: 21 },
  muted: { color: colors.textMuted },
});
