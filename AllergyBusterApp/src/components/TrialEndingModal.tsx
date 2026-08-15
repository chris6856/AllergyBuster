import React from 'react';
import {Modal, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useTrialWarning} from '../hooks/useTrialWarning';
import {usePurchase} from '../providers/PurchaseProvider';
import {borderRadius, colors, fontSizes, spacing} from '../constants/theme';
import {LIFETIME_PRICE_DISPLAY} from '../constants/purchases';

const FEATURES = [
  '📷  Barcode scanning',
  '🔍  Ingredient label reading',
  '🍽️  Restaurant allergen research',
  '💡  Daily allergy tips',
  '🔄  Ongoing updates',
];

export function TrialEndingModal() {
  const {visible, dismiss} = useTrialWarning();
  const {purchase, product} = usePurchase();

  if (!visible) {
    return null;
  }

  const price = product?.displayPrice ?? LIFETIME_PRICE_DISPLAY;

  const handleUnlock = async () => {
    dismiss();
    await purchase();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.emoji}>⏰</Text>
          <Text style={styles.title}>1 free scan remaining</Text>
          <Text style={styles.body}>
            Unlock unlimited access to keep everything working:
          </Text>
          <View style={styles.features}>
            {FEATURES.map(f => (
              <Text key={f} style={styles.featureItem}>{f}</Text>
            ))}
          </View>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleUnlock}
            accessibilityRole="button"
            accessibilityLabel={`Unlock for ${price}`}>
            <Text style={styles.primaryButtonText}>Unlock for {price}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={dismiss}
            accessibilityRole="button"
            accessibilityLabel="Remind me later">
            <Text style={styles.secondaryButtonText}>Remind Me Later</Text>
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
  emoji: {
    fontSize: 40,
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
  features: {
    alignSelf: 'stretch',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  featureItem: {
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    lineHeight: 22,
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
