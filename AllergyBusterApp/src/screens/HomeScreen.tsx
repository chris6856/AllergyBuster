import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors, fontSizes, spacing} from '../constants/theme';

export function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>AllergyBuster</Text>
      <Text style={styles.subtitle}>Home — coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
});
