import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {borderRadius, colors, fontSizes, spacing} from '../constants/theme';

interface Props {
  name: string;
  variant?: 'declared' | 'trace';
}

export function AllergenCard({name, variant = 'declared'}: Props) {
  const isDeclared = variant === 'declared';
  return (
    <View style={[styles.tag, isDeclared ? styles.declared : styles.trace]}>
      <Text style={[styles.text, isDeclared ? styles.declaredText : styles.traceText]}>
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    borderRadius: borderRadius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  declared: {
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  trace: {
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  text: {
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  declaredText: {
    color: colors.danger,
  },
  traceText: {
    color: colors.warning,
  },
});
