import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {AllergenInfo} from '../types/product';
import {AllergenCard} from './AllergenCard';
import {colors, fontSizes, spacing} from '../constants/theme';

interface Props {
  allergens: AllergenInfo;
}

export function AllergenList({allergens}: Props) {
  const hasDeclared = allergens.declared.length > 0;
  const hasTraces = allergens.traces.length > 0;

  if (!hasDeclared && !hasTraces) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          No major allergens detected. Always verify on product packaging.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
    padding: spacing.md,
    alignItems: 'center',
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
