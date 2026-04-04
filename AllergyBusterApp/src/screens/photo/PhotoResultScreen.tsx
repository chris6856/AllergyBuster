import React, {useState} from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {AllergenList} from '../../components/AllergenList';
import {NoResultsBanner} from '../../components/NoResultsBanner';
import {borderRadius, colors, fontSizes, spacing} from '../../constants/theme';
import {PhotoStackScreenProps} from '../../navigation/navigationTypes';
import {MainTabNavigationProp} from '../../navigation/navigationTypes';
import {extractAllergensFromOcr} from '../../utils/ocrAllergenExtractor';

type Props = PhotoStackScreenProps<'PhotoResult'>;

export function PhotoResultScreen({route}: Props) {
  const {rawOcrText} = route.params;
  const navigation = useNavigation<MainTabNavigationProp>();
  const parentNav = useNavigation<Props['navigation']>();
  const [showRawText, setShowRawText] = useState(false);

  const {detected, rawText} = extractAllergensFromOcr(rawOcrText);

  // No usable text detected at all
  if (!rawText.trim()) {
    return (
      <ScrollView>
        <NoResultsBanner
          message="We couldn't read any text from the label. Try again in better lighting, holding the camera flat over the ingredient list."
          ctaLabel="Search Instead"
          onCta={() =>
            navigation.navigate('SearchTab', {
              screen: 'TextSearch',
              params: {initialMode: 'products'},
            })
          }
        />
      </ScrollView>
    );
  }

  const allergens = {declared: detected, traces: []};

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Allergen results panel */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Detected Allergens</Text>
        <AllergenList allergens={allergens} />
      </View>

      {/* Collapsible raw text — hidden by default */}
      <TouchableOpacity
        style={styles.toggleRow}
        onPress={() => setShowRawText(v => !v)}
        accessibilityRole="button"
        accessibilityLabel="Toggle recognised label text">
        <Text style={styles.toggleLabel}>
          {showRawText ? '▲  Hide label text' : '▼  Show recognised label text'}
        </Text>
      </TouchableOpacity>

      {showRawText && (
        <View style={styles.section}>
          <Text style={styles.caveat}>
            Verify this matches the label — OCR may miss text on curved or
            glossy packaging.
          </Text>
          <View style={styles.rawTextBox}>
            <Text style={styles.rawText} selectable>
              {rawText}
            </Text>
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => parentNav.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Capture again">
          <Text style={styles.secondaryButtonText}>📷  Scan Again</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={() =>
            navigation.navigate('SearchTab', {
              screen: 'TextSearch',
              params: {initialMode: 'products'},
            })
          }
          accessibilityRole="button"
          accessibilityLabel="Search by name">
          <Text style={styles.primaryButtonText}>🔍  Search by Name</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  section: {
    backgroundColor: colors.surface,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  toggleRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  caveat: {
    fontSize: fontSizes.xs,
    color: colors.textDisabled,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  rawTextBox: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rawText: {
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  actionButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
});
