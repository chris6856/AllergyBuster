import React from 'react';
import {Modal, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import InAppReview from 'react-native-in-app-review';
import {useRatingPrompt} from '../hooks/useRatingPrompt';
import {borderRadius, colors, fontSizes, spacing} from '../constants/theme';

export function RatingPromptModal() {
  const {visible, dismiss} = useRatingPrompt();

  if (!visible) {
    return null;
  }

  const handleRate = async () => {
    if (InAppReview.isAvailable()) {
      await InAppReview.RequestInAppReview();
    }
    dismiss();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.stars}>⭐️⭐️⭐️⭐️⭐️</Text>
          <Text style={styles.title}>Glad we could help!</Text>
          <Text style={styles.body}>
            Every review helps another family discover AllergyBuster. Would you mind leaving us a quick rating?
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleRate}
            accessibilityRole="button"
            accessibilityLabel="Rate AllergyBuster">
            <Text style={styles.primaryButtonText}>Rate Us</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={dismiss}
            accessibilityRole="button"
            accessibilityLabel="Not now">
            <Text style={styles.secondaryButtonText}>Not Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
  },
  stars: {
    fontSize: fontSizes.xxl,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  body: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: fontSizes.md,
    fontWeight: '700',
  },
  secondaryButton: {
    paddingVertical: spacing.sm,
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
});
