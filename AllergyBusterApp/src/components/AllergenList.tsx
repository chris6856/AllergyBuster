import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {AllergenInfo} from '../types/product';
import {AllergenCard} from './AllergenCard';
import {ProfileMatchSummary} from './ProfileMatchSummary';
import {colors, fontSizes, spacing} from '../constants/theme';

interface Props {
  allergens: AllergenInfo;
  /**
   * False when the source had no ingredient list and no allergen tags. An
   * empty allergen list then means "unknown", not "none found".
   */
  hasIngredientData?: boolean;
}

export function AllergenList({allergens, hasIngredientData = true}: Props) {
  const hasDeclared = allergens.declared.length > 0;
  const hasTraces = allergens.traces.length > 0;

  if (!hasDeclared && !hasTraces && !hasIngredientData) {
    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.safeIcon, styles.unknownIcon]}>
          <Text style={styles.safeCheck}>?</Text>
        </View>
        <Text style={[styles.safeTitle, styles.unknownTitle]}>No Ingredient Information</Text>
        <Text style={styles.emptyText}>
          This product's ingredient details haven't been added to the product
          databases we search yet, so we can't check it. Scan the ingredient label,
          or read the package before use.
        </Text>
      </View>
    );
  }

  if (!hasDeclared && !hasTraces) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.safeIcon}>
          <Text style={styles.safeCheck}>✓</Text>
        </View>
        <Text style={styles.safeTitle}>No Allergens Found</Text>
        <Text style={styles.emptyText}>
          Always verify on product packaging.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ProfileMatchSummary allergens={allergens} />

      {hasDeclared && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Contains</Text>
          <View style={styles.tags}>
            {allergens.declared.map(name => (
              <AllergenCard key={name} name={name} variant="declared" />
            ))}
          </View>
        </View>
      )}

      {hasTraces && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>May Contain (Traces)</Text>
          <View style={styles.tags}>
            {allergens.traces.map(name => (
              <AllergenCard key={name} name={name} variant="trace" />
            ))}
          </View>
        </View>
      )}

      <Text style={styles.caveat}>
        Allergen data is community-sourced. Always verify on product packaging.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  safeIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  safeCheck: {
    fontSize: 36,
    color: colors.white,
    fontWeight: '700',
    lineHeight: 42,
  },
  unknownIcon: {
    backgroundColor: colors.warning,
  },
  unknownTitle: {
    color: colors.warning,
  },
  safeTitle: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  caveat: {
    fontSize: fontSizes.xs,
    color: colors.textDisabled,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
});
