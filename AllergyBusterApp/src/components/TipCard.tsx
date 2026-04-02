import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {borderRadius, colors, fontSizes, spacing} from '../constants/theme';

interface Props {
  text?: string;
  isLoading?: boolean;
}

export function TipCard({text, isLoading}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.icon}>💡</Text>
        <Text style={styles.heading}>Tip of the Day</Text>
      </View>

      {isLoading ? (
        <View style={styles.skeleton}>
          <View style={[styles.skeletonLine, {width: '95%'}]} />
          <View style={[styles.skeletonLine, {width: '80%'}]} />
          <View style={[styles.skeletonLine, {width: '60%'}]} />
        </View>
      ) : (
        <Text style={styles.tipText}>{text}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    elevation: 1,
    shadowColor: colors.black,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.07,
    shadowRadius: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  icon: {
    fontSize: 18,
    marginRight: spacing.xs,
  },
  heading: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tipText: {
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  skeleton: {
    gap: spacing.xs,
  },
  skeletonLine: {
    height: 14,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.border,
  },
});
