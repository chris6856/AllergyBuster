import React from 'react';
import {
  ScrollView,
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
        <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
          <Text style={styles.body}>
            AllergyBuster is designed to help you identify potential allergens in
            food products and restaurant menu items. However, please read the
            following carefully before using this app.
          </Text>

          <Text style={styles.sectionHeading}>Non-Medical Advice</Text>
          <Text style={styles.body}>
            The information provided by AllergyBuster is for informational
            purposes only and does not constitute medical advice, diagnosis, or
            treatment. Always seek the guidance of your doctor, allergist, or
            other qualified health professional with any questions you may have
            regarding a medical condition or allergy.
          </Text>

          <Text style={styles.sectionHeading}>Data Accuracy</Text>
          <Text style={styles.body}>
            Allergen information is sourced from third-party databases and
            community-contributed data. AllergyBuster cannot guarantee the
            accuracy, completeness, or timeliness of any allergen information
            displayed. Always verify allergen information directly on product
            packaging or with restaurant staff before consuming any food.
          </Text>

          <Text style={styles.sectionHeading}>Life-Threatening Allergies</Text>
          <Text style={styles.body}>
            If you have a severe or life-threatening allergy, do not rely solely
            on this app. Cross-contamination and labelling errors can occur.
            Always carry your prescribed emergency medication (such as an
            epinephrine auto-injector) and consult your healthcare provider for
            personalised advice.
          </Text>

          <Text style={styles.sectionHeading}>No Liability</Text>
          <Text style={styles.body}>
            By using AllergyBuster, you acknowledge that the developers and
            publishers of this app accept no liability for any harm, injury, or
            adverse reaction resulting from reliance on information provided by
            this app.
          </Text>
        </ScrollView>

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
  scrollArea: {
    marginBottom: spacing.md,
  },
  sectionHeading: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.danger,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
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
