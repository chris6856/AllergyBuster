import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {borderRadius, colors, fontSizes, spacing} from '../constants/theme';
import {useAllergyProfile} from '../providers/AllergyProfileProvider';
import {isProfileAllergen} from '../utils/allergenMatching';

interface Props {
  name: string;
  variant?: 'declared' | 'trace';
}

/**
 * Allergen tag. With no allergy profile it renders as before (red = contains,
 * amber = may contain). Once a profile exists, allergens in the profile are
 * emphasised (solid fill + ⚠) and all others are muted.
 */
export function AllergenCard({name, variant = 'declared'}: Props) {
  const {profile, hasProfile} = useAllergyProfile();
  const isDeclared = variant === 'declared';
  const isMine = hasProfile && isProfileAllergen(name, profile.allergens);
  const isMuted = hasProfile && !isMine;

  const baseLabel = isDeclared ? `Contains ${name}` : `May contain ${name}`;
  const accessibilityLabel = isMine ? `${baseLabel}, in your allergy profile` : baseLabel;

  return (
    <View
      style={[
        styles.tag,
        isDeclared ? styles.declared : styles.trace,
        isMine && (isDeclared ? styles.mineDeclared : styles.mineTrace),
        isMuted && styles.muted,
      ]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}>
      <Text
        style={[
          styles.text,
          isDeclared ? styles.declaredText : styles.traceText,
          isMine && styles.mineText,
          isMuted && styles.mutedText,
        ]}>
        {isMine ? `⚠ ${name}` : name}
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
  mineDeclared: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  mineTrace: {
    backgroundColor: colors.warning,
    borderColor: colors.warning,
  },
  muted: {
    backgroundColor: colors.background,
    borderColor: colors.border,
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
  mineText: {
    color: colors.white,
    fontWeight: '700',
  },
  mutedText: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
