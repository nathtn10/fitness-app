import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, font, radius, spacing } from '../theme';

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger' | 'success';
  disabled?: boolean;
}) {
  const bg =
    variant === 'primary'
      ? colors.primary
      : variant === 'danger'
        ? colors.danger
        : variant === 'success'
          ? colors.success
          : 'transparent';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.85 : 1 },
        variant === 'ghost' && styles.buttonGhost,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === 'ghost' && { color: colors.primary },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonGhost: { borderWidth: 1, borderColor: colors.primary },
  buttonText: { color: '#fff', fontSize: font.body, fontWeight: '700' },
});
