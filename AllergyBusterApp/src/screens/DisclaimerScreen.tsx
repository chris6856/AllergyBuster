import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {borderRadius, colors, fontSizes, fontWeights, spacing} from '../constants/theme';
import {useDisclaimerAccepted} from '../hooks/useDisclaimerAccepted';

export function DisclaimerScreen() {
  const {accept} = useDisclaimerAccepted();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.heading}>Important Notice</Text>
        <View style={styles.bodyArea}>
          <Text style={styles.body}>
            AllergyBuster is an informational tool to help you identify
            potential allergens in food products and restaurants. The information
            provided does not constitute medical advice, diagnosis, or treatment.
          </Text>

          <Text style={styles.body}>
            Allergen data is sourced from third-party databases and may not
            always be complete or up to date. Always verify allergen information
            on product packaging or with restaurant staff, and consult your
            doctor or allergist for personalised medical guidance.
          </Text>

          <Text style={styles.body}>
            By tapping "I Understand" you acknowledge that this app is not a
            substitute for professional medical advice and that you will not rely
            solely on it to make health decisions.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={accept}
          accessibilityLabel="I understand and accept the disclaimer"
          accessibilityRole="button">
          <Text style={styles.buttonText}>I Understand</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  heading: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  bodyArea: {
    marginBottom: spacing.md,
  },
  body: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.white,
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
  },
});
