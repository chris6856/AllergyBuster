import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {borderRadius, colors, fontSizes, spacing} from '../constants/theme';

interface Props {
  message?: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export function NoResultsBanner({
  message = 'No results found.',
  ctaLabel,
  onCta,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🔍</Text>
      <Text style={styles.message}>{message}</Text>
      {ctaLabel && onCta && (
        <TouchableOpacity
          style={styles.button}
          onPress={onCta}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}>
          <Text style={styles.buttonText}>{ctaLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  message: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  buttonText: {
    color: colors.white,
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
});
