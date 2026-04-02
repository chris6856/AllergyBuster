import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {borderRadius, colors, fontSizes, spacing} from '../constants/theme';

export function NoNetworkBanner() {
  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="alert"
      accessibilityLabel="No network connection. Please check your internet and try again.">
      <Text style={styles.icon}>📡</Text>
      <Text style={styles.text}>No network connection. Please check your internet and try again.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    margin: spacing.md,
  },
  icon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  text: {
    flex: 1,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    lineHeight: 18,
  },
});
