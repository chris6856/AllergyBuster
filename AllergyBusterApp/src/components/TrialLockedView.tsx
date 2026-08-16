import React, {useState} from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {usePurchase} from '../providers/PurchaseProvider';
import {LIFETIME_PRICE_DISPLAY} from '../constants/purchases';
import {borderRadius, colors, fontSizes, spacing} from '../constants/theme';

export function TrialLockedView() {
  const {product, purchase} = usePurchase();
  const [isPurchasing, setIsPurchasing] = useState(false);

  const price = product?.displayPrice ?? LIFETIME_PRICE_DISPLAY;

  const handleUnlock = async () => {
    setIsPurchasing(true);
    await purchase();
    setIsPurchasing(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🔒</Text>
      <Text style={styles.title}>You've Used Your Free Scans</Text>
      <Text style={styles.body}>
        You've completed 6 free scans. Unlock lifetime access to keep scanning for allergens.
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
  buttonText: {
    color: colors.white,
    fontSize: fontSizes.md,
    fontWeight: '700',
  },
});
