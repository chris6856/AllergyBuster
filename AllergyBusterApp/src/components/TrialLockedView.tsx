import React, {useState} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {usePurchase} from '../providers/PurchaseProvider';
import {FREE_SCANS, LIFETIME_PRICE_DISPLAY} from '../constants/purchases';
import {borderRadius, colors, fontSizes, spacing} from '../constants/theme';

export function TrialLockedView() {
  const {product, purchase, restore} = usePurchase();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const price = product?.displayPrice ?? LIFETIME_PRICE_DISPLAY;

  const handleUnlock = async () => {
    setIsPurchasing(true);
    await purchase();
    setIsPurchasing(false);
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    await restore();
    setIsRestoring(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🔒</Text>
      <Text style={styles.title}>You've Used Your Free Scans</Text>
      <Text style={styles.body}>
        You've completed {FREE_SCANS} free scans. Unlock lifetime access to keep scanning and searching
        products and restaurants.
      </Text>
      <TouchableOpacity
        style={[styles.button, isPurchasing && styles.buttonDisabled]}
        onPress={handleUnlock}
        disabled={isPurchasing}
        accessibilityRole="button"
        accessibilityLabel={`Unlock for ${price}`}>
        {isPurchasing ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.buttonText}>Unlock for {price}</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.restore}
        onPress={handleRestore}
        disabled={isRestoring}
        accessibilityRole="button"
        accessibilityLabel="Restore purchase">
        {isRestoring ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.restoreText}>Restore purchase</Text>}
      </TouchableOpacity>
      <Text style={styles.reassure}>
        Your saved products, shopping lists and allergy profile are still available.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  icon: {
    fontSize: 56,
    marginBottom: spacing.md,
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
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    minWidth: 200,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  restore: {
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  restoreText: {
    color: colors.primary,
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
  reassure: {
    marginTop: spacing.lg,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  buttonText: {
    color: colors.white,
    fontSize: fontSizes.md,
    fontWeight: '700',
  },
});
