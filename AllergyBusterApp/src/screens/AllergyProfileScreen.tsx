import React from 'react';
import {ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {PROFILE_ALLERGEN_OPTIONS} from '../constants/allergens';
import {borderRadius, colors, fontSizes, spacing} from '../constants/theme';
import {useAllergyProfile} from '../providers/AllergyProfileProvider';
import {sortByProfileOrder} from '../utils/allergenMatching';
import {RootNavigationProp} from '../navigation/navigationTypes';

/**
 * "My Allergies": choose the allergens AllergyBuster should alert on.
 * Every toggle saves immediately, so nothing is lost if the app is
 * backgrounded (App.tsx resets navigation to Home on return).
 */
export function AllergyProfileScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const {profile, setAllergens} = useAllergyProfile();
  const selected = profile.allergens;

  const toggle = (key: string) => {
    const next = selected.includes(key)
      ? selected.filter(k => k !== key)
      : sortByProfileOrder([...selected, key]);
    setAllergens(next).catch(() => {});
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Choose the allergens that matter to you or your family. Scan results will
          highlight these first and tell you clearly when a product lists one of them.
        </Text>

        {PROFILE_ALLERGEN_OPTIONS.map(option => {
          const isOn = selected.includes(option.key);
          return (
            <TouchableOpacity
              key={option.key}
              style={[styles.row, isOn && styles.rowOn]}
              onPress={() => toggle(option.key)}
              activeOpacity={0.75}
              accessibilityRole="checkbox"
              accessibilityState={{checked: isOn}}
              accessibilityLabel={option.label}
              accessibilityHint={`Includes ${option.examples}`}>
              <View style={[styles.checkbox, isOn && styles.checkboxOn]}>
                {isOn && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.rowBody}>
                <Text style={styles.rowLabel}>{option.label}</Text>
                <Text style={styles.rowExamples}>{option.examples}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <Text style={styles.note}>
          Your selections are stored only on this device. AllergyBuster can miss
          ingredients or have incomplete data. Always read the package label.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        {selected.length > 0 && (
          <TouchableOpacity
            onPress={() => setAllergens([]).catch(() => {})}
            style={styles.clearButton}
            accessibilityRole="button">
            <Text style={styles.clearText}>Clear all</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.doneButton}
          accessibilityRole="button">
          <Text style={styles.doneText}>
            {selected.length > 0 ? `Done (${selected.length} selected)` : 'Done'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  intro: {
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowOn: {
    borderColor: colors.primary,
    backgroundColor: '#E8F5E9',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.textDisabled,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  checkboxOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.white,
    fontWeight: '800',
    fontSize: fontSizes.md,
  },
  rowBody: {
    flex: 1,
  },
  rowLabel: {
    fontSize: fontSizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  rowExamples: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  note: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.md,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  clearButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
  },
  clearText: {
    color: colors.danger,
    fontWeight: '600',
    fontSize: fontSizes.md,
  },
  doneButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  doneText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: fontSizes.md,
  },
});
