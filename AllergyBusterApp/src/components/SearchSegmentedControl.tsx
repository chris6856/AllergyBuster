import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {borderRadius, colors, fontSizes, spacing} from '../constants/theme';

export type SearchMode = 'products' | 'restaurants';

interface Props {
  mode: SearchMode;
  onChange: (mode: SearchMode) => void;
}

export function SearchSegmentedControl({mode, onChange}: Props) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.segment, mode === 'products' && styles.active]}
        onPress={() => onChange('products')}
        accessibilityRole="button"
        accessibilityState={{selected: mode === 'products'}}
        accessibilityLabel="Search products">
        <Text style={[styles.label, mode === 'products' && styles.activeLabel]}>
          🛒  Products
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.segment, mode === 'restaurants' && styles.active]}
        onPress={() => onChange('restaurants')}
        accessibilityRole="button"
        accessibilityState={{selected: mode === 'restaurants'}}
        accessibilityLabel="Search restaurants">
        <Text style={[styles.label, mode === 'restaurants' && styles.activeLabel]}>
          🍽️  Restaurants
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    padding: 3,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.full,
  },
  active: {
    backgroundColor: colors.surface,
    shadowColor: colors.black,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  label: {
    fontSize: fontSizes.sm,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  activeLabel: {
    color: colors.primary,
    fontWeight: '700',
  },
});
