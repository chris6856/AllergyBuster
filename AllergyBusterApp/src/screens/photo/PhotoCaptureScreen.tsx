import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors, fontSizes, spacing} from '../../constants/theme';

export function PhotoCaptureScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Photo Capture — coming soon</Text>
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
  text: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
  },
});
