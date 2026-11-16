import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {borderRadius, colors, fontSizes, spacing} from '../constants/theme';
import {AllergenInfo} from '../types/product';
import {useAllergyProfile} from '../providers/AllergyProfileProvider';
import {matchProfile, profileLabel} from '../utils/allergenMatching';

interface Props {
  allergens: AllergenInfo;
  /** Single-line form for list rows. */
  compact?: boolean;
}

/**
 * Personal verdict against the user's allergy profile. Renders nothing when
 * there is no profile, or when the product has no allergen data at all (the
 * caller's existing "no allergens found" state covers that case).
 */
export function ProfileMatchSummary({allergens, compact = false}: Props) {
  const {profile, hasProfile} = useAllergyProfile();
  if (!hasProfile || (allergens.declared.length === 0 && allergens.traces.length === 0)) {
    return null;
  }

  const match = matchProfile(allergens, profile.allergens);
  const declaredText = match.declared.map(profileLabel).join(', ');
  const tracesText = match.traces.map(profileLabel).join(', ');
  const noMatch = match.declared.length === 0 && match.traces.length === 0;

  if (compact) {
    if (noMatch) {
      return (
        <Text style={[styles.compact, styles.okText]}>✓ None of your allergens listed</Text>
      );
    }
    return (
      <View>
        {match.declared.length > 0 && (
          <Text style={[styles.compact, styles.dangerText]}>⚠ Contains your allergens: {declaredText}</Text>
        )}
        {match.traces.length > 0 && (
          <Text style={[styles.compact, styles.warningText]}>⚠ May contain your allergens: {tracesText}</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container} accessible accessibilityRole="summary">
      {match.declared.length > 0 && (
        <View style={[styles.box, styles.dangerBox]}>
          <Text style={styles.boxTitle}>⚠ Contains your allergens</Text>
          <Text style={styles.boxBody}>{declaredText}</Text>
        </View>
      )}
      {match.traces.length > 0 && (
        <View style={[styles.box, styles.warningBox]}>
          <Text style={styles.boxTitle}>⚠ May contain your allergens</Text>
          <Text style={styles.boxBody}>{tracesText}</Text>
        </View>
      )}
      {noMatch && (
        <View style={[styles.box, styles.okBox]}>
          <Text style={styles.boxTitle}>✓ None of your allergens listed</Text>
          <Text style={styles.boxBody}>
            Other allergens are shown below. Always check the package label.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  box: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  dangerBox: {
    backgroundColor: colors.danger,
  },
  warningBox: {
    backgroundColor: colors.warning,
  },
  okBox: {
    backgroundColor: colors.primary,
  },
  boxTitle: {
    color: colors.white,
    fontSize: fontSizes.md,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  boxBody: {
    color: colors.white,
    fontSize: fontSizes.sm,
    lineHeight: 18,
  },
  compact: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  dangerText: {
    color: colors.danger,
  },
  warningText: {
    color: colors.warning,
  },
  okText: {
    color: colors.primary,
  },
});
