import React, {useState} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {usePurchase} from '../providers/PurchaseProvider';
import {LIFETIME_PRICE_DISPLAY} from '../constants/purchases';
import {borderRadius, colors, fontSizes, spacing} from '../constants/theme';

const BENEFITS = [
  'Unlimited barcode and label scanning, forever',
  'Restaurant allergen safety search, wherever you go',
  'Ask Jeeves for instant allergy answers',
  'One payment — no subscriptions, no recurring charges',
];

export function PaywallScreen() {
  const {product, purchase, restore, error} = usePurchase();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const priceLabel = product?.displayPrice ?? LIFETIME_PRICE_DISPLAY;

  const handlePurchase = async () => {
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.heroIcon}>🔒</Text>
        <Text style={styles.title}>You've Used Your Free Scans</Text>
        <Text style={styles.subtitle}>
          You've completed 6 free scans. Unlock lifetime access with a single
          one-time payment and keep scanning without limits.
        </Text>
      </View>

      <View style={styles.benefits}>
        {BENEFITS.map(benefit => (
          <View key={benefit} style={styles.benefitRow}>
            <Text style={styles.benefitCheck}>✓</Text>
            <Text style={styles.benefitText}>{benefit}</Text>
          </View>
        ))}
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.purchaseButton, isPurchasing && styles.buttonDisabled]}
        onPress={handlePurchase}
        disabled={isPurchasing}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Unlock lifetime access for ${priceLabel}`}>
        {isPurchasing ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.purchaseButtonText}>Unlock Lifetime Access — {priceLabel}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.restoreButton}
        onPress={handleRestore}
        disabled={isRestoring}
        accessibilityRole="button"
        accessibilityLabel="Restore previous purchase">
        <Text style={styles.restoreButtonText}>
          {isRestoring ? 'Checking…' : 'Restore Purchases'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.smallPrint}>
        One-time payment, billed once through your App Store or Google Play account. No
        subscription, no recurring charges.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  heroIcon: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  benefits: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  benefitCheck: {
    fontSize: fontSizes.md,
    color: colors.primary,
    fontWeight: '700',
    marginRight: spacing.sm,
  },
  benefitText: {
    flex: 1,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  errorBox: {
    backgroundColor: colors.dangerLight,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSizes.sm,
    textAlign: 'center',
  },
  purchaseButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    color: colors.white,
    fontSize: fontSizes.lg,
    fontWeight: '700',
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  restoreButtonText: {
    color: colors.primary,
    fontSize: fontSizes.md,
    fontWeight: '600',
  },
  smallPrint: {
    fontSize: fontSizes.xs,
    color: colors.textDisabled,
    textAlign: 'center',
    lineHeight: 16,
  },
});
