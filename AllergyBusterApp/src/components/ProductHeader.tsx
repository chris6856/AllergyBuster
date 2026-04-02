import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import {colors, fontSizes, spacing} from '../constants/theme';

interface Props {
  name: string;
  brand: string;
  imageUrl?: string;
  source: 'openfoodfacts' | 'edamam';
}

export function ProductHeader({name, brand, imageUrl, source}: Props) {
  return (
    <View style={styles.container}>
      {imageUrl ? (
        <Image source={{uri: imageUrl}} style={styles.image} resizeMode="contain" />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.placeholderIcon}>🛒</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>{name}</Text>
        {brand ? <Text style={styles.brand}>{brand}</Text> : null}
        <Text style={styles.source}>
          Source: {source === 'openfoodfacts' ? 'Open Food Facts' : 'Edamam'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 36,
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  name: {
    fontSize: fontSizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  brand: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  source: {
    fontSize: fontSizes.xs,
    color: colors.textDisabled,
  },
});
